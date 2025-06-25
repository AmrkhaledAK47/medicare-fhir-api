import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FhirResource, FhirResourceType } from './schemas/fhir-resource.schema';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { UserRole } from '../users/schemas/user.schema';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ResourceRegistryService } from './services/resource-registry.service';

@Injectable()
export class FhirService {
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;
    private readonly logger = new Logger(FhirService.name);
    private readonly hapiFhirUrl: string;
    private readonly useHapiFhir: boolean;

    constructor(
        @InjectModel(FhirResource.name) private fhirResourceModel: Model<FhirResource>,
        private configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly resourceRegistry: ResourceRegistryService,
    ) {
        this.baseUrl = this.configService.get<string>('app.fhir.serverBaseUrl');
        this.maxRetries = 3; // Max number of retries for failed requests
        this.retryDelay = 1000; // Delay between retries in ms
        this.hapiFhirUrl = this.configService.get<string>('FHIR_SERVER_URL') || 'http://hapi-fhir:8080/fhir';
        this.useHapiFhir = this.configService.get<boolean>('USE_HAPI_FHIR') || false;
        this.logger.log(`FHIR Service initialized. HAPI FHIR URL: ${this.hapiFhirUrl}, Using HAPI: ${this.useHapiFhir}`);

        // Set the baseUrl to the hapiFhirUrl if it's not already set
        if (!this.baseUrl) {
            this.baseUrl = this.hapiFhirUrl;
        }
    }

    private getRequestConfig(): AxiosRequestConfig {
        return {
            headers: {
                'Content-Type': 'application/fhir+json',
                'Accept': 'application/fhir+json',
            },
        };
    }

    // Helper method to handle API retries
    private async retryableRequest<T>(
        requestFn: () => Promise<T>,
        operation: string,
    ): Promise<T> {
        let retries = 0;
        let lastError: any;

        while (retries < this.maxRetries) {
            try {
                const response = await requestFn();
                return response;
            } catch (error) {
                retries++;
                lastError = error;

                if (retries >= this.maxRetries) {
                    break;
                }

                console.log(`Retrying ${operation} (${retries}/${this.maxRetries})`);
                await new Promise(r => setTimeout(r, this.retryDelay));
            }
        }

        // If we get here, all retries failed
        throw this.handleError(lastError, operation);
    }

    // Helper method to handle API errors
    private handleError(error: any, operation: string): Error {
        const axiosError = error as AxiosError;

        let errorMessage = `FHIR server operation failed: ${operation}`;
        let statusCode = 500;

        if (axiosError.response) {
            // Server responded with error
            const responseData = axiosError.response.data as any;
            statusCode = axiosError.response.status;

            // Try to extract FHIR-specific error information
            if (responseData.resourceType === 'OperationOutcome' && responseData.issue) {
                const issues = responseData.issue.map((i: any) =>
                    `[${i.severity}] ${i.diagnostics || i.details?.text || 'Unknown error'}`
                ).join('; ');
                errorMessage = `FHIR server error: ${issues}`;
            } else {
                errorMessage = `FHIR server error: ${axiosError.response.statusText}`;
            }
        } else if (axiosError.request) {
            // No response received
            errorMessage = `No response from FHIR server: ${axiosError.message}`;
            statusCode = 503; // Service Unavailable
        }

        console.error(`${errorMessage} (${operation})`, error);
        return new InternalServerErrorException(errorMessage);
    }

    // Check if user has access to a specific resource
    private async checkResourceAccess(resourceType: string, resourceId: string, user: any): Promise<boolean> {
        // Admin has access to everything
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // For patients, check if resource belongs to them
        if (user.role === UserRole.PATIENT) {
            // If resource type is Patient, check if it's their own record
            if (resourceType === 'Patient' && user.fhirResourceId === resourceId) {
                return true;
            }

            // Check if resource is linked to the patient
            const resource = await this.getResource(resourceType, resourceId);

            // Check subject reference for patient
            if (resource.subject?.reference === `Patient/${user.fhirResourceId}`) {
                return true;
            }

            // Check patient reference
            if (resource.patient?.reference === `Patient/${user.fhirResourceId}`) {
                return true;
            }

            return false;
        }

        // For practitioners, check if they have access to this patient's data
        if (user.role === UserRole.PRACTITIONER) {
            // Practitioners can view their own profile
            if (resourceType === 'Practitioner' && user.fhirResourceId === resourceId) {
                return true;
            }

            // Practitioners can generally access patient data they are caring for
            // In a real system, you'd have a more sophisticated access control check
            // based on care relationships, encounters, etc.
            return true;
        }

        return false;
    }

    // Create a new FHIR resource
    async createResource(resourceType: string, data: any, userId?: string): Promise<any> {
        try {
            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.post(`${this.baseUrl}/${resourceType}`, data, this.getRequestConfig());
                    return result.data;
                },
                `create ${resourceType}`
            );

            const resourceId = response.id;

            // Store in local database for caching
            await this.fhirResourceModel.create({
                resourceType: resourceType as FhirResourceType,
                resourceId,
                data: response,
                userId,
                version: response.meta?.versionId || '1',
                lastUpdated: new Date(),
            });

            return response;
        } catch (error) {
            console.error('Error creating FHIR resource:', error);
            throw error;
        }
    }

    // Get a FHIR resource by type and ID
    async getResource(resourceType: string, id: string): Promise<any> {
        try {
            // Check cache first
            const localResource = await this.fhirResourceModel.findOne({
                resourceType,
                resourceId: id,
            }).lean();

            if (localResource) {
                return localResource.data;
            }

            // Fetch from FHIR server if not in cache
            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.get(`${this.baseUrl}/${resourceType}/${id}`, this.getRequestConfig());
                    return result.data;
                },
                `get ${resourceType}/${id}`
            );

            // Cache the response
            await this.fhirResourceModel.create({
                resourceType: resourceType as FhirResourceType,
                resourceId: id,
                data: response,
                version: response.meta?.versionId || '1',
                lastUpdated: new Date(),
            });

            return response;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new NotFoundException(`FHIR Resource ${resourceType}/${id} not found`);
            }
            console.error(`Error getting FHIR resource ${resourceType}/${id}:`, error);
            throw error;
        }
    }

    // Get resource with permission check
    async getResourceWithPermissionCheck(resourceType: string, id: string, user: any): Promise<any> {
        // Check if user has access to this resource
        const hasAccess = await this.checkResourceAccess(resourceType, id, user);

        if (!hasAccess) {
            throw new ForbiddenException('You do not have permission to access this resource');
        }

        return this.getResource(resourceType, id);
    }

    // Update an existing FHIR resource
    async updateResource(resourceType: string, id: string, data: any): Promise<any> {
        try {
            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.put(`${this.baseUrl}/${resourceType}/${id}`, data, this.getRequestConfig());
                    return result.data;
                },
                `update ${resourceType}/${id}`
            );

            // Update cache
            await this.fhirResourceModel.findOneAndUpdate(
                {
                    resourceType,
                    resourceId: id,
                },
                {
                    data: response,
                    version: response.meta?.versionId || '1',
                    lastUpdated: new Date(),
                },
                { upsert: true }
            );

            return response;
        } catch (error) {
            console.error(`Error updating FHIR resource ${resourceType}/${id}:`, error);
            throw error;
        }
    }

    // Update resource with permission check
    async updateResourceWithPermissionCheck(resourceType: string, id: string, data: any, user: any): Promise<any> {
        // Check if user has access to update this resource
        const hasAccess = await this.checkResourceAccess(resourceType, id, user);

        if (!hasAccess) {
            throw new ForbiddenException('You do not have permission to update this resource');
        }

        return this.updateResource(resourceType, id, data);
    }

    // Delete a FHIR resource
    async deleteResource(resourceType: string, id: string): Promise<void> {
        try {
            await this.retryableRequest(
                async () => {
                    const result = await axios.delete(`${this.baseUrl}/${resourceType}/${id}`, this.getRequestConfig());
                    return result.data;
                },
                `delete ${resourceType}/${id}`
            );

            // Remove from cache
            await this.fhirResourceModel.findOneAndDelete({
                resourceType,
                resourceId: id,
            });
        } catch (error) {
            console.error(`Error deleting FHIR resource ${resourceType}/${id}:`, error);
            throw error;
        }
    }

    // Search for FHIR resources
    async searchResources(resourceType: string, params: Record<string, string>): Promise<any> {
        try {
            // List of NestJS-specific parameters that should not be passed to FHIR
            const nestJsSpecificParams = ['sortDirection', 'sort', 'page', 'limit', 'search'];

            // Filter out NestJS-specific parameters
            const filteredParams = Object.keys(params)
                .filter(key => !nestJsSpecificParams.includes(key))
                .reduce((obj, key) => {
                    obj[key] = params[key];
                    return obj;
                }, {} as Record<string, string>);

            const queryString = new URLSearchParams(filteredParams).toString();
            const url = `${this.baseUrl}/${resourceType}?${queryString}`;

            this.logger.debug(`Searching ${resourceType} with filtered params: ${queryString}`);

            return await this.retryableRequest(
                async () => {
                    const result = await axios.get(url, this.getRequestConfig());
                    return result.data;
                },
                `search ${resourceType}`
            );
        } catch (error) {
            console.error(`Error searching FHIR resources of type ${resourceType}:`, error);
            throw error;
        }
    }

    // Search resources with permission check
    async searchResourcesWithPermissionCheck(resourceType: string, params: Record<string, string>, user: any): Promise<any> {
        // For patients, automatically filter results to only include their resources
        if (user.role === UserRole.PATIENT && user.fhirResourceId) {
            // Add patient filter for relevant resource types
            if (resourceType === 'Observation' || resourceType === 'DiagnosticReport' ||
                resourceType === 'Encounter' || resourceType === 'Procedure' ||
                resourceType === 'CarePlan' || resourceType === 'Condition') {
                params = {
                    ...params,
                    patient: user.fhirResourceId
                };
            }

            // For Patient resource type, only allow searching their own record
            if (resourceType === 'Patient') {
                params = {
                    ...params,
                    _id: user.fhirResourceId
                };
            }
        }

        // For practitioners, they generally have access to patient data they're caring for
        // In a real system, you might filter by practitioner ID for certain resources

        return this.searchResources(resourceType, params);
    }

    // Get resources associated with a specific user
    async getUserResources(userId: string): Promise<FhirResource[]> {
        return this.fhirResourceModel.find({ userId }).exec();
    }

    // Check if FHIR server is available
    async checkServerHealth(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/metadata`, {
                headers: { 'Accept': 'application/fhir+json' },
                timeout: 5000
            });
            return true;
        } catch (error) {
            console.error('FHIR server health check failed:', error);
            return false;
        }
    }

    // Get the base URL of the FHIR server
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Get the appropriate data source for a resource type
     * @param resourceType FHIR resource type
     * @returns 'local' or 'remote'
     */
    getDataSource(resourceType: string): 'local' | 'remote' {
        // Check if resource exists in local registry
        const hasLocalSchema = this.resourceRegistry.hasServiceForResourceType(resourceType);

        // If we have a local schema and aren't forced to use HAPI, use local
        if (hasLocalSchema && !this.useHapiFhir) {
            return 'local';
        }

        // Otherwise use remote HAPI FHIR
        return 'remote';
    }

    /**
     * Search for resources in HAPI FHIR server
     */
    async searchFhirResources(
        resourceType: string,
        params: Record<string, any> = {},
        pagination = { page: 1, count: 10 }
    ): Promise<any> {
        try {
            // Create URL search params
            const queryParams = new URLSearchParams();

            // List of NestJS-specific parameters that should not be passed to FHIR
            const nestJsSpecificParams = ['sortDirection', 'sort', 'page', 'limit', 'search'];

            // Add search parameters, filtering out NestJS-specific ones
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && !nestJsSpecificParams.includes(key)) {
                    queryParams.append(key, String(value));
                }
            });

            // Add pagination parameters
            queryParams.append('_count', String(pagination.count));
            queryParams.append('_getpagesoffset', String((pagination.page - 1) * pagination.count));

            // Make request to HAPI FHIR server
            this.logger.debug(`Searching ${resourceType} with params: ${queryParams.toString()}`);
            const response = await firstValueFrom(
                this.httpService.get(`${this.hapiFhirUrl}/${resourceType}`, {
                    params: queryParams,
                })
            );

            return response.data as any;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to search FHIR resources: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to search FHIR resources: ${axiosError.message}`);
        }
    }

    /**
     * Get resource by ID from HAPI FHIR server
     */
    async getFhirResourceById(resourceType: string, id: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.hapiFhirUrl}/${resourceType}/${id}`)
            );
            return response.data as any;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to get FHIR resource: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to get FHIR resource: ${axiosError.message}`);
        }
    }

    /**
     * Create resource in HAPI FHIR server
     */
    async createFhirResource(resourceType: string, data: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.hapiFhirUrl}/${resourceType}`, data)
            );
            return response.data as any;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to create FHIR resource: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to create FHIR resource: ${axiosError.message}`);
        }
    }

    /**
     * Update resource in HAPI FHIR server
     */
    async updateFhirResource(resourceType: string, id: string, data: any): Promise<any> {
        try {
            // Ensure ID is present in the resource
            data.id = id;

            const response = await firstValueFrom(
                this.httpService.put(`${this.hapiFhirUrl}/${resourceType}/${id}`, data)
            );
            return response.data as any;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to update FHIR resource: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to update FHIR resource: ${axiosError.message}`);
        }
    }

    /**
     * Delete resource in HAPI FHIR server
     */
    async deleteFhirResource(resourceType: string, id: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.delete(`${this.hapiFhirUrl}/${resourceType}/${id}`)
            );
            return response.data as any;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to delete FHIR resource: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to delete FHIR resource: ${axiosError.message}`);
        }
    }

    /**
     * Check HAPI FHIR server health
     */
    async checkFhirServerHealth(): Promise<boolean> {
        try {
            // Try to access the server metadata
            await firstValueFrom(
                this.httpService.get(`${this.hapiFhirUrl}/metadata`)
            );
            return true;
        } catch (error) {
            this.logger.error('HAPI FHIR server health check failed', error);
            return false;
        }
    }
} 