import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FhirResource, FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { PaginationParams, PaginatedResponse } from '../base-resource.service';
import { FhirService } from '../fhir.service';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class GenericResourceService {
    private readonly logger = new Logger(GenericResourceService.name);

    constructor(
        @InjectModel(FhirResource.name) private fhirResourceModel: Model<FhirResourceDocument>,
        private readonly fhirService: FhirService,
        private readonly resourceRegistry: ResourceRegistryService,
    ) { }

    /**
     * Find all resources of a specific type with pagination
     */
    async findAll(
        resourceType: string,
        params: PaginationParams = {},
        user?: any,
    ): Promise<PaginatedResponse<any>> {
        // Normalize resource type to ensure proper capitalization
        const normalizedResourceType = this.normalizeResourceType(resourceType);

        const dataSource = this.fhirService.getDataSource(normalizedResourceType);

        if (dataSource === 'local') {
            return this.findAllLocal(normalizedResourceType, params);
        } else {
            return this.findAllRemote(normalizedResourceType, params);
        }
    }

    /**
     * Find all resources locally with pagination
     */
    private async findAllLocal(
        resourceType: string,
        params: PaginationParams = {},
    ): Promise<PaginatedResponse<any>> {
        const model = this.resourceRegistry.getResourceModel(resourceType);
        if (!model) {
            throw new NotFoundException(`Resource type ${resourceType} not found in the registry`);
        }

        const {
            page = 1,
            limit = 10,
            sort = 'createdAt',
            sortDirection = 'desc',
            filter = {},
        } = params;

        const skip = (page - 1) * limit;
        const sortOptions: any = { [sort]: sortDirection === 'desc' ? -1 : 1 };

        // Execute count and find in parallel
        const [totalItems, data] = await Promise.all([
            model.countDocuments(filter).exec(),
            model
                .find(filter)
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
     * Find all resources from HAPI FHIR server with pagination
     */
    private async findAllRemote(
        resourceType: string,
        params: PaginationParams = {},
    ): Promise<PaginatedResponse<any>> {
        const { page = 1, limit = 10, filter = {} } = params;

        // Convert our filter format to FHIR search parameters
        const searchParams = this.convertFilterToFhirParams(filter);

        // Call HAPI FHIR server
        const response = await this.fhirService.searchFhirResources(
            resourceType,
            searchParams,
            { page, count: limit }
        );

        // Extract and format results
        const totalItems = response.total || 0;
        const totalPages = Math.ceil(totalItems / limit);
        const data = response.entry?.map(entry => entry.resource) || [];

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
     * Find a resource by ID 
     */
    async findById(resourceType: string, id: string, user?: any): Promise<any> {
        // Normalize resource type to ensure proper capitalization
        const normalizedResourceType = this.normalizeResourceType(resourceType);

        const dataSource = this.fhirService.getDataSource(normalizedResourceType);

        if (dataSource === 'local') {
            return this.findByIdLocal(normalizedResourceType, id);
        } else {
            return this.findByIdRemote(normalizedResourceType, id);
        }
    }

    /**
     * Find resource by ID locally
     */
    private async findByIdLocal(resourceType: string, id: string): Promise<any> {
        const model = this.resourceRegistry.getResourceModel(resourceType);
        if (!model) {
            throw new NotFoundException(`Resource type ${resourceType} not found in the registry`);
        }

        const resource = await model.findById(id).exec();
        if (!resource) {
            throw new NotFoundException(`${resourceType} with ID ${id} not found`);
        }

        return resource;
    }

    /**
     * Find resource by ID in HAPI FHIR server
     */
    private async findByIdRemote(resourceType: string, id: string): Promise<any> {
        try {
            return await this.fhirService.getFhirResourceById(resourceType, id);
        } catch (error) {
            throw new NotFoundException(`${resourceType} with ID ${id} not found`);
        }
    }

    /**
     * Create a new resource
     */
    async create(resourceType: string, data: any, user?: any): Promise<any> {
        // Normalize resource type to ensure proper capitalization
        const normalizedResourceType = this.normalizeResourceType(resourceType);

        this.logger.log(`Creating ${normalizedResourceType} resource`);

        // Check if user is admin when needed
        if (this.requiresAdminRights(normalizedResourceType) && (!user || user?.role !== 'ADMIN')) {
            throw new ForbiddenException('Admin rights required to create this resource');
        }

        // Ensure resourceType is set correctly with proper capitalization
        data.resourceType = normalizedResourceType;

        const dataSource = this.fhirService.getDataSource(normalizedResourceType);

        if (dataSource === 'local') {
            return this.createLocal(normalizedResourceType, data);
        } else {
            return this.createRemote(normalizedResourceType, data);
        }
    }

    /**
     * Create resource locally
     */
    private async createLocal(resourceType: string, data: any): Promise<any> {
        const model = this.resourceRegistry.getResourceModel(resourceType);
        if (!model) {
            throw new NotFoundException(`Resource type ${resourceType} not found in the registry`);
        }

        const resource = new model(data);
        return resource.save();
    }

    /**
     * Create resource in HAPI FHIR server
     */
    private async createRemote(resourceType: string, data: any): Promise<any> {
        return this.fhirService.createFhirResource(resourceType, data);
    }

    /**
     * Update a resource
     */
    async update(resourceType: string, id: string, data: any, user?: any): Promise<any> {
        // Normalize resource type to ensure proper capitalization
        const normalizedResourceType = this.normalizeResourceType(resourceType);

        // Check if user is admin when needed
        if (this.requiresAdminRights(normalizedResourceType) && (!user || user?.role !== 'ADMIN')) {
            throw new ForbiddenException('Admin rights required to update this resource');
        }

        // Ensure resourceType is set correctly with proper capitalization
        data.resourceType = normalizedResourceType;

        const dataSource = this.fhirService.getDataSource(normalizedResourceType);

        if (dataSource === 'local') {
            return this.updateLocal(normalizedResourceType, id, data);
        } else {
            return this.updateRemote(normalizedResourceType, id, data);
        }
    }

    /**
     * Update resource locally
     */
    private async updateLocal(resourceType: string, id: string, data: any): Promise<any> {
        const model = this.resourceRegistry.getResourceModel(resourceType);
        if (!model) {
            throw new NotFoundException(`Resource type ${resourceType} not found in the registry`);
        }

        const resource = await model.findByIdAndUpdate(id, data, { new: true }).exec();
        if (!resource) {
            throw new NotFoundException(`${resourceType} with ID ${id} not found`);
        }

        return resource;
    }

    /**
     * Update resource in HAPI FHIR server
     */
    private async updateRemote(resourceType: string, id: string, data: any): Promise<any> {
        return this.fhirService.updateFhirResource(resourceType, id, data);
    }

    /**
     * Remove a resource
     */
    async remove(resourceType: string, id: string, user?: any): Promise<boolean> {
        // Normalize resource type to ensure proper capitalization
        const normalizedResourceType = this.normalizeResourceType(resourceType);

        // Check if user is admin
        if (this.requiresAdminRights(normalizedResourceType) && (!user || user?.role !== 'ADMIN')) {
            throw new ForbiddenException('Admin rights required to delete this resource');
        }

        const dataSource = this.fhirService.getDataSource(normalizedResourceType);

        if (dataSource === 'local') {
            return this.removeLocal(normalizedResourceType, id);
        } else {
            return this.removeRemote(normalizedResourceType, id);
        }
    }

    /**
     * Remove resource locally
     */
    private async removeLocal(resourceType: string, id: string): Promise<boolean> {
        const model = this.resourceRegistry.getResourceModel(resourceType);
        if (!model) {
            throw new NotFoundException(`Resource type ${resourceType} not found in the registry`);
        }

        const result = await model.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`${resourceType} with ID ${id} not found`);
        }

        return true;
    }

    /**
     * Remove resource in HAPI FHIR server
     */
    private async removeRemote(resourceType: string, id: string): Promise<boolean> {
        return this.fhirService.deleteFhirResource(resourceType, id);
    }

    /**
     * Convert filter object to FHIR URL parameters
     */
    private convertFilterToFhirParams(filter: Record<string, any>): Record<string, string> {
        const params: Record<string, string> = {};

        // Process each filter parameter
        Object.entries(filter).forEach(([key, value]) => {
            // Skip pagination parameters which should already be handled
            if (['page', 'limit', 'sort', 'sortDirection'].includes(key)) {
                return;
            }

            // Handle basic text search
            if (key === 'search' && typeof value === 'string') {
                params['_content'] = value;
                return;
            }

            // Format date ranges
            if (key.endsWith('Date') && typeof value === 'object' && (value.start || value.end)) {
                if (value.start) {
                    params[`${key}ge`] = value.start;
                }
                if (value.end) {
                    params[`${key}le`] = value.end;
                }
                return;
            }

            // Handle arrays as comma-separated values
            if (Array.isArray(value)) {
                params[key] = value.join(',');
                return;
            }

            // Add standard parameters
            if (value !== undefined && value !== null) {
                params[key] = String(value);
            }
        });

        return params;
    }

    /**
     * Ensure proper capitalization of FHIR resource types
     * FHIR is case sensitive and resource types must be properly capitalized
     */
    private normalizeResourceType(resourceType: string): string {
        // Standard FHIR resource types with proper capitalization
        const fhirResourceTypes = [
            'Account', 'ActivityDefinition', 'AdverseEvent', 'AllergyIntolerance',
            'Appointment', 'AppointmentResponse', 'AuditEvent', 'Basic', 'Binary',
            'BiologicallyDerivedProduct', 'BodyStructure', 'Bundle', 'CapabilityStatement',
            'CarePlan', 'CareTeam', 'CatalogEntry', 'ChargeItem', 'ChargeItemDefinition',
            'Claim', 'ClaimResponse', 'ClinicalImpression', 'CodeSystem', 'Communication',
            'CommunicationRequest', 'CompartmentDefinition', 'Composition', 'ConceptMap',
            'Condition', 'Consent', 'Contract', 'Coverage', 'CoverageEligibilityRequest',
            'CoverageEligibilityResponse', 'DetectedIssue', 'Device', 'DeviceDefinition',
            'DeviceMetric', 'DeviceRequest', 'DeviceUseStatement', 'DiagnosticReport',
            'DocumentManifest', 'DocumentReference', 'EffectEvidenceSynthesis', 'Encounter',
            'Endpoint', 'EnrollmentRequest', 'EnrollmentResponse', 'EpisodeOfCare', 'EventDefinition',
            'Evidence', 'EvidenceVariable', 'ExampleScenario', 'ExplanationOfBenefit',
            'FamilyMemberHistory', 'Flag', 'Goal', 'GraphDefinition', 'Group', 'GuidanceResponse',
            'HealthcareService', 'ImagingStudy', 'Immunization', 'ImmunizationEvaluation',
            'ImmunizationRecommendation', 'ImplementationGuide', 'InsurancePlan', 'Invoice',
            'Library', 'Linkage', 'List', 'Location', 'Measure', 'MeasureReport', 'Media',
            'Medication', 'MedicationAdministration', 'MedicationDispense', 'MedicationKnowledge',
            'MedicationRequest', 'MedicationStatement', 'MedicinalProduct', 'MedicinalProductAuthorization',
            'MedicinalProductContraindication', 'MedicinalProductIndication', 'MedicinalProductIngredient',
            'MedicinalProductInteraction', 'MedicinalProductManufactured', 'MedicinalProductPackaged',
            'MedicinalProductPharmaceutical', 'MedicinalProductUndesirableEffect', 'MessageDefinition',
            'MessageHeader', 'MolecularSequence', 'NamingSystem', 'NutritionOrder', 'Observation',
            'ObservationDefinition', 'OperationDefinition', 'OperationOutcome', 'Organization',
            'OrganizationAffiliation', 'Parameters', 'Patient', 'PaymentNotice', 'PaymentReconciliation',
            'Person', 'PlanDefinition', 'Practitioner', 'PractitionerRole', 'Procedure', 'Provenance',
            'Questionnaire', 'QuestionnaireResponse', 'RelatedPerson', 'RequestGroup', 'ResearchDefinition',
            'ResearchElementDefinition', 'ResearchStudy', 'ResearchSubject', 'RiskAssessment',
            'RiskEvidenceSynthesis', 'Schedule', 'SearchParameter', 'ServiceRequest', 'Slot', 'Specimen',
            'SpecimenDefinition', 'StructureDefinition', 'StructureMap', 'Subscription', 'Substance',
            'SubstanceNucleicAcid', 'SubstancePolymer', 'SubstanceProtein', 'SubstanceReferenceInformation',
            'SubstanceSourceMaterial', 'SubstanceSpecification', 'SupplyDelivery', 'SupplyRequest', 'Task',
            'TerminologyCapabilities', 'TestReport', 'TestScript', 'ValueSet', 'VerificationResult',
            'VisionPrescription'
        ];

        // Custom resource types specific to this application
        const customResourceTypes = ['Payment'];

        const allResourceTypes = [...fhirResourceTypes, ...customResourceTypes];

        // Find a matching resource type regardless of case
        const match = allResourceTypes.find(type =>
            type.toLowerCase() === resourceType.toLowerCase()
        );

        return match || resourceType; // Return the properly cased version or the original if not found
    }

    /**
     * Check if a resource type requires admin rights for modification
     */
    private requiresAdminRights(resourceType: string): boolean {
        const adminOnlyResources = [
            'Organization',
            'Practitioner',
            'Location',
            'ValueSet',
            'CodeSystem',
            'StructureDefinition',
        ];

        return adminOnlyResources.includes(resourceType);
    }
} 