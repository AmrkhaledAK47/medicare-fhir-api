import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { FhirResourceDocument } from './schemas/fhir-resource.schema';
import { ResourceRegistryService } from './services/resource-registry.service';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { Role } from '../auth/guards/roles.guard';

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    sortDirection?: 'asc' | 'desc';
    filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        totalItems: number;
        itemsPerPage: number;
        totalPages: number;
        currentPage: number;
    };
}

@Injectable()
export abstract class BaseResourceService<T extends FhirResourceDocument = FhirResourceDocument> implements OnModuleInit {
    constructor(
        protected readonly model: Model<T>,
        protected readonly resourceType: string,
        protected readonly resourceRegistryService: ResourceRegistryService,
    ) { }

    onModuleInit() {
        // Register this service with the resource registry
        this.resourceRegistryService.registerResourceService(this.resourceType, this);
    }

    /**
     * Normalize FHIR resource type to ensure proper casing
     * FHIR is case sensitive and expects resource types like "Patient" not "patient"
     */
    protected normalizeResourceType(resourceType: string): string {
        // Standard FHIR resource types with correct casing
        const fhirResourceTypes = [
            'Patient', 'Practitioner', 'Organization', 'Encounter', 'Observation',
            'DiagnosticReport', 'Medication', 'MedicationRequest', 'Questionnaire',
            'QuestionnaireResponse', 'Payment', 'DocumentReference'
        ];

        // Check if the resource type matches any standard FHIR resource (case insensitive)
        const matchedType = fhirResourceTypes.find(type =>
            type.toLowerCase() === resourceType.toLowerCase()
        );

        return matchedType || resourceType;
    }

    /**
     * Find all resources with filtering, pagination and role-based access
     */
    async findAll(
        queryOrParams: ResourceQueryDto | PaginationParams = {},
        role?: Role,
        userId?: string
    ): Promise<PaginatedResponse<T> | { items: T[]; total: number; page: number; limit: number }> {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        // Determine if we're using ResourceQueryDto or PaginationParams
        const isResourceQuery = 'search' in queryOrParams;

        // Apply filters based on the input type
        let filter: any = {};
        let page: number = 1;
        let limit: number = 10;
        let sort: any = {};

        if (isResourceQuery) {
            // Handle ResourceQueryDto
            const query = queryOrParams as ResourceQueryDto;
            filter = this.buildFilterQuery(query, role, userId);

            // Parse pagination parameters as numbers
            page = typeof query.page === 'string' ? parseInt(query.page, 10) : (query.page || 1);
            limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (query.limit || 10);

            // Apply sorting
            if (query.sort) {
                sort[query.sort] = query.sortDirection === 'desc' ? -1 : 1;
            }
        } else {
            // Handle PaginationParams
            const params = queryOrParams as PaginationParams;
            const {
                page: paramPage = 1,
                limit: paramLimit = 10,
                sort: paramSort = 'createdAt',
                sortDirection = 'desc',
                filter: paramFilter = {},
            } = params;

            page = paramPage;
            limit = paramLimit;
            sort = { [paramSort]: sortDirection === 'desc' ? -1 : 1 };
            filter = { ...paramFilter };

            // Apply role-based filters if provided
            if (role && userId) {
                this.applyRoleFilter(filter, role, userId);
            }
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        const totalPages = Math.ceil(total / limit);

        // Return appropriate format based on input type
        if (isResourceQuery) {
            return {
                items,
                total,
                page,
                limit,
            };
        } else {
            return {
                data: items,
                meta: {
                    totalItems: total,
                    itemsPerPage: limit,
                    totalPages,
                    currentPage: page,
                },
            };
        }
    }

    /**
     * Find resource by ID with role-based access
     */
    async findById(id: string, role?: Role, userId?: string): Promise<T> {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        // Build filter based on role permissions
        const filter: any = { _id: id };

        if (role && userId) {
            this.applyRoleFilter(filter, role, userId);
        }

        const resource = await this.model.findOne(filter).exec();
        if (!resource) {
            throw new NotFoundException(`${normalizedResourceType} with id ${id} not found`);
        }
        return resource;
    }

    /**
     * Find resources by field value
     */
    async findByField(field: string, value: any): Promise<T[]> {
        const query = { [field]: value } as FilterQuery<T>;
        return this.model.find(query).exec();
    }

    /**
     * Create new resource
     */
    async create(data: Partial<T>, createdBy?: string): Promise<T> {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        // Add metadata if this is a FHIR resource
        if ('resourceType' in data) {
            // Use type assertion for the resourceType assignment
            (data as any).resourceType = normalizedResourceType;

            // Add meta information if it's a FHIR resource
            if (!(data as any).meta) {
                (data as any).meta = {};
            }

            (data as any).meta.lastUpdated = new Date();
            (data as any).meta.versionId = '1';

            if (createdBy) {
                (data as any).meta.createdBy = createdBy;
            }
        }

        const resource = new this.model(data);
        return resource.save();
    }

    /**
     * Update resource by ID
     */
    async update(id: string, updateData: any): Promise<T> {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        // Get current resource to increment version if it's a FHIR resource
        const existingResource = await this.model.findById(id).exec();
        if (!existingResource) {
            throw new NotFoundException(`${normalizedResourceType} with id ${id} not found`);
        }

        // Update metadata if this is a FHIR resource
        if ('resourceType' in updateData) {
            updateData.resourceType = normalizedResourceType;

            // Extract current version if exists and increment
            if (existingResource['meta']) {
                const currentMeta = existingResource['meta'] || {};
                const currentVersion = parseInt(currentMeta.versionId || '1', 10);

                if (!updateData.meta) {
                    updateData.meta = {};
                }

                updateData.meta.lastUpdated = new Date();
                updateData.meta.versionId = (currentVersion + 1).toString();
            }
        }

        const updatedResource = await this.model
            .findByIdAndUpdate(id, updateData as UpdateQuery<T>, { new: true })
            .exec();

        if (!updatedResource) {
            throw new NotFoundException(`${normalizedResourceType} with id ${id} not found`);
        }

        return updatedResource;
    }

    /**
     * Delete resource by ID
     */
    async remove(id: string): Promise<{ deleted: boolean } | boolean> {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        const result = await this.model.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`${normalizedResourceType} with id ${id} not found`);
        }

        // Return a consistent format
        return { deleted: true };
    }

    /**
     * Count resources
     */
    async count(filter: FilterQuery<T> = {}): Promise<number> {
        return this.model.countDocuments(filter).exec();
    }

    /**
     * Convert to FHIR resource
     */
    toFhirResource(resource: T): any {
        return resource.toFhirResource();
    }

    /**
     * Get model reference
     */
    getModel(): Model<T> {
        return this.model;
    }

    /**
     * Advanced search with complex filtering
     */
    async advancedSearch(
        params: {
            textSearch?: string;
            filters?: Record<string, any>;
            page?: number;
            limit?: number;
            sort?: string;
            sortDirection?: 'asc' | 'desc';
            dateRange?: { field: string; start?: Date; end?: Date };
        } = {}
    ): Promise<PaginatedResponse<T>> {
        const {
            textSearch,
            filters = {},
            page = 1,
            limit = 10,
            sort = 'createdAt',
            sortDirection = 'desc',
            dateRange,
        } = params;

        const skip = (page - 1) * limit;
        const sortOptions: any = { [sort]: sortDirection === 'desc' ? -1 : 1 };

        // Build query
        let query = { ...filters } as FilterQuery<T>;

        // Add text search if provided
        if (textSearch && textSearch.trim()) {
            query.$text = { $search: textSearch };
        }

        // Add date range if provided
        if (dateRange && dateRange.field) {
            // Create a properly typed date query object
            const dateQuery: Record<string, any> = {};

            if (dateRange.start) {
                dateQuery.$gte = dateRange.start;
            }

            if (dateRange.end) {
                dateQuery.$lte = dateRange.end;
            }

            // Use indexed assignment with a type assertion to ensure type safety
            (query as any)[dateRange.field] = dateQuery;
        }

        // Execute count and find in parallel
        const [totalItems, data] = await Promise.all([
            this.model.countDocuments(query).exec(),
            this.model
                .find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .exec(),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data,
            meta: {
                totalItems,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
        };
    }

    /**
     * Batch create resources
     */
    async createBatch(data: Partial<T>[]): Promise<T[]> {
        return this.model.insertMany(data as any[]);
    }

    /**
     * Get the resource type managed by this service
     */
    getResourceType(): string {
        return this.resourceType;
    }

    /**
     * Build filter query based on query parameters and role
     */
    protected buildFilterQuery(query: ResourceQueryDto, role?: Role, userId?: string): any {
        const filter: any = {};

        // Apply text search
        if (query.search) {
            filter.$text = { $search: query.search };
        }

        // Apply specific filters if provided in query
        Object.keys(query).forEach(key => {
            // Skip pagination and sorting params
            if (['page', 'limit', 'sort', 'sortDirection', 'search'].includes(key)) {
                return;
            }

            // Add filter to query
            filter[key] = query[key];
        });

        // Apply role-based filters
        if (role && userId) {
            this.applyRoleFilter(filter, role, userId);
        }

        return filter;
    }

    /**
     * Apply role-based filters to query
     */
    protected applyRoleFilter(filter: any, role?: Role, userId?: string): void {
        if (!role || !userId) return;

        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        // Role-based filtering
        switch (role) {
            case Role.ADMIN:
                // Admins can see everything, no additional filters
                break;

            case Role.PRACTITIONER:
                // Practitioners can see their own resources and assigned patients
                if (normalizedResourceType === 'Patient') {
                    // Filter patients assigned to this practitioner
                    filter['generalPractitioner.reference'] = `Practitioner/${userId}`;
                } else if (normalizedResourceType === 'Practitioner') {
                    // Practitioners can see their own profile
                    // This is an OR condition - either their own or others
                    filter.$or = [
                        { _id: userId },
                        { 'organization.reference': { $exists: true } } // Can see practitioners in same org
                    ];
                } else if (['Encounter', 'Observation', 'DiagnosticReport'].includes(normalizedResourceType)) {
                    // Can see clinical resources where they are the performer/author
                    filter.$or = [
                        { 'participant.individual.reference': `Practitioner/${userId}` },
                        { 'performer.reference': `Practitioner/${userId}` },
                        { 'recorder.reference': `Practitioner/${userId}` },
                    ];
                }
                break;

            case Role.PATIENT:
                // Patients can only see their own resources
                if (normalizedResourceType === 'Patient') {
                    // Patients can only see their own profile
                    filter._id = userId;
                } else if (normalizedResourceType === 'Practitioner') {
                    // Can see practitioners assigned to them
                    // This would need a reverse lookup in a real implementation
                } else {
                    // For clinical resources, filter by patient reference
                    filter['subject.reference'] = `Patient/${userId}`;
                }
                break;
        }
    }

    /**
     * Format query results as a FHIR Bundle
     */
    protected formatFhirBundle(items: any[], total: number, page: number, limit: number): any {
        const normalizedResourceType = this.normalizeResourceType(this.resourceType);

        return {
            resourceType: 'Bundle',
            type: 'searchset',
            total: total,
            link: [
                {
                    relation: 'self',
                    url: `fhir/${normalizedResourceType}?_page=${page}&_count=${limit}`
                },
                ...(page > 1 ? [{
                    relation: 'previous',
                    url: `fhir/${normalizedResourceType}?_page=${page - 1}&_count=${limit}`
                }] : []),
                ...(total > page * limit ? [{
                    relation: 'next',
                    url: `fhir/${normalizedResourceType}?_page=${page + 1}&_count=${limit}`
                }] : [])
            ],
            entry: items.map(item => ({
                fullUrl: `fhir/${normalizedResourceType}/${item._id}`,
                resource: item
            }))
        };
    }
} 