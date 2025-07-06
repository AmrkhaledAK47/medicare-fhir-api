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

export class DownstreamFhirException extends Error {
    constructor(message: string, public readonly originalError: any) {
        super(message);
        this.name = 'DownstreamFhirException';
    }
}

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

    private getRequestConfig(correlationId?: string): AxiosRequestConfig {
        const headers: Record<string, string> = {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json',
        };

        // Add correlation ID header if provided
        if (correlationId) {
            headers['X-Correlation-ID'] = correlationId;
        }

        return { headers };
    }

    // Helper method to handle API retries
    private async retryableRequest<T>(
        requestFn: () => Promise<T>,
        operation: string,
        correlationId?: string
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

                this.logger.debug(`Retrying ${operation} (${retries}/${this.maxRetries}) [${correlationId}]`);
                await new Promise(r => setTimeout(r, this.retryDelay));
            }
        }

        // If we get here, all retries failed
        throw this.handleError(lastError, operation, correlationId);
    }

    // Helper method to handle API errors
    private handleError(error: any, operation: string, correlationId?: string): Error {
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

        this.logger.error(`${errorMessage} (${operation}) [${correlationId}]`, {
            correlationId,
            operation,
            errorMessage,
            statusCode,
            error: axiosError.stack
        });

        return new DownstreamFhirException(errorMessage, error);
    }

    // Check if user has access to a specific resource
    private async checkResourceAccess(resourceType: string, resourceId: string, user: any): Promise<boolean> {
        // Admin has access to everything
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // Normalize resource IDs for comparison (remove 'res-' prefix if present)
        const normalizedResourceId = resourceId.startsWith('res-') ? resourceId.substring(4) : resourceId;
        const normalizedUserResourceId = user.fhirResourceId?.startsWith('res-') ?
            user.fhirResourceId.substring(4) : user.fhirResourceId;

        // For patients, check if resource belongs to them
        if (user.role === UserRole.PATIENT) {
            // If resource type is Patient, check if it's their own record
            if (resourceType === 'Patient' && normalizedUserResourceId === normalizedResourceId) {
                return true;
            }

            // Check if resource is linked to the patient
            const resource = await this.getResource(resourceType, resourceId);

            // Extract patient ID from references, handling potential 'res-' prefix
            let subjectId = null;
            if (resource.subject?.reference) {
                const match = resource.subject.reference.match(/Patient\/(?:res-)?(.+)/);
                subjectId = match ? match[1] : null;
            }

            let patientId = null;
            if (resource.patient?.reference) {
                const match = resource.patient.reference.match(/Patient\/(?:res-)?(.+)/);
                patientId = match ? match[1] : null;
            }

            // Compare normalized IDs
            if (subjectId && normalizedUserResourceId === subjectId) {
                return true;
            }

            if (patientId && normalizedUserResourceId === patientId) {
                return true;
            }

            return false;
        }

        // For practitioners, check if they have access to this patient's data
        if (user.role === UserRole.PRACTITIONER) {
            // Practitioners can view their own profile
            if (resourceType === 'Practitioner' && normalizedUserResourceId === normalizedResourceId) {
                return true;
            }

            // If the resource is a Patient, we need to check if the practitioner is associated with this patient
            if (resourceType === 'Patient') {
                try {
                    // Get the patient resource
                    const patientResource = await this.getResource('Patient', resourceId);

                    // Check if this practitioner is the patient's general practitioner
                    if (patientResource.generalPractitioner && Array.isArray(patientResource.generalPractitioner)) {
                        for (const practitioner of patientResource.generalPractitioner) {
                            if (practitioner.reference) {
                                const match = practitioner.reference.match(/Practitioner\/(?:res-)?(.+)/);
                                const practId = match ? match[1] : null;

                                if (practId && normalizedUserResourceId === practId) {
                                    return true;
                                }
                            }
                        }
                    }
                } catch (error) {
                    this.logger.error(`Error checking patient-practitioner relationship: ${error.message}`);
                    // If we can't verify the relationship, default to false for security
                    return false;
                }
            }

            // For other clinical resources, check if they're associated with a patient this practitioner manages
            // This is a simplified check - in a production system, you'd have more sophisticated logic
            return true;
        }

        return false;
    }

    // Create a new FHIR resource
    async createResource(resourceType: string, data: any, userId?: string, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.post(
                        `${this.baseUrl}/${resourceType}`,
                        data,
                        this.getRequestConfig(correlationId)
                    );
                    return result.data;
                },
                `create ${resourceType}`,
                correlationId
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

            this.logger.debug(`[FHIR] POST ${resourceType} - ${Date.now() - startTime}ms [${correlationId}]`);
            return response;
        } catch (error) {
            this.logger.error(
                `Error creating FHIR ${resourceType}: ${error.message} [${correlationId}]`,
                { correlationId, resourceType, error: error.stack }
            );
            throw new DownstreamFhirException(`Failed to create ${resourceType}`, error);
        }
    }

    // Get a FHIR resource by type and ID
    async getResource(resourceType: string, id: string, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            // Check cache first
            const localResource = await this.fhirResourceModel.findOne({
                resourceType,
                resourceId: id,
            }).lean();

            if (localResource) {
                this.logger.debug(`[FHIR] GET ${resourceType}/${id} - cached [${correlationId}]`);
                return localResource.data;
            }

            // Fetch from FHIR server if not in cache
            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.get(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(correlationId)
                    );
                    return result.data;
                },
                `get ${resourceType}/${id}`,
                correlationId
            );

            // Cache the response
            await this.fhirResourceModel.create({
                resourceType: resourceType as FhirResourceType,
                resourceId: id,
                data: response,
                version: response.meta?.versionId || '1',
                lastUpdated: new Date(),
            });

            this.logger.debug(`[FHIR] GET ${resourceType}/${id} - ${Date.now() - startTime}ms [${correlationId}]`);
            return response;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new NotFoundException(`FHIR Resource ${resourceType}/${id} not found`);
            }
            this.logger.error(`Error getting FHIR resource ${resourceType}/${id}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                id,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to get ${resourceType}/${id}`, error);
        }
    }

    // Get resource with permission check
    async getResourceWithPermissionCheck(resourceType: string, id: string, user: any, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            // Check if user has access to this resource
            const hasAccess = await this.checkResourceAccess(resourceType, id, user);
            if (!hasAccess) {
                this.logger.warn(`User ${user.id} (${user.role}) denied access to ${resourceType}/${id} [${correlationId}]`);
                throw new ForbiddenException(`Access denied to ${resourceType}/${id}`);
            }

            // Get the resource
            const resource = await this.getResource(resourceType, id, correlationId);

            this.logger.debug(`Access granted to ${resourceType}/${id} for user ${user.id} (${user.role}) [${correlationId}]`);
            return resource;
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error getting FHIR resource with permission check ${resourceType}/${id}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                id,
                userId: user.id,
                userRole: user.role,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to get ${resourceType}/${id}`, error);
        }
    }

    // Update an existing FHIR resource
    async updateResource(resourceType: string, id: string, data: any, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            // Ensure the ID in the URL matches the ID in the resource
            if (data.id && data.id !== id) {
                throw new Error(`Resource ID mismatch: URL ID ${id} doesn't match resource ID ${data.id}`);
            }

            const response = await this.retryableRequest(
                async () => {
                    const result = await axios.put(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        data,
                        this.getRequestConfig(correlationId)
                    );
                    return result.data;
                },
                `update ${resourceType}/${id}`,
                correlationId
            );

            // Update in local database
            await this.fhirResourceModel.updateOne(
                { resourceType, resourceId: id },
                {
                    $set: {
                        data: response,
                        version: response.meta?.versionId || '1',
                        lastUpdated: new Date(),
                    },
                },
                { upsert: true }
            );

            this.logger.debug(`[FHIR] PUT ${resourceType}/${id} - ${Date.now() - startTime}ms [${correlationId}]`);
            return response;
        } catch (error) {
            this.logger.error(`Error updating FHIR ${resourceType}/${id}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                id,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to update ${resourceType}/${id}`, error);
        }
    }

    // Update resource with permission check
    async updateResourceWithPermissionCheck(resourceType: string, id: string, data: any, user: any, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            // Check if user has access to this resource
            const hasAccess = await this.checkResourceAccess(resourceType, id, user);
            if (!hasAccess) {
                this.logger.warn(`User ${user.id} (${user.role}) denied access to update ${resourceType}/${id} [${correlationId}]`);
                throw new ForbiddenException(`Access denied to update ${resourceType}/${id}`);
            }

            // Update the resource
            const resource = await this.updateResource(resourceType, id, data, correlationId);

            this.logger.debug(`Resource ${resourceType}/${id} updated by user ${user.id} (${user.role}) [${correlationId}]`);
            return resource;
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error updating FHIR resource with permission check ${resourceType}/${id}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                id,
                userId: user.id,
                userRole: user.role,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to update ${resourceType}/${id}`, error);
        }
    }

    // Delete a FHIR resource
    async deleteResource(resourceType: string, id: string, correlationId?: string): Promise<void> {
        const startTime = Date.now();
        try {
            await this.retryableRequest(
                async () => {
                    const result = await axios.delete(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(correlationId)
                    );
                    return result.data;
                },
                `delete ${resourceType}/${id}`,
                correlationId
            );

            // Remove from local database
            await this.fhirResourceModel.deleteOne({ resourceType, resourceId: id });

            this.logger.debug(`[FHIR] DELETE ${resourceType}/${id} - ${Date.now() - startTime}ms [${correlationId}]`);
        } catch (error) {
            this.logger.error(`Error deleting FHIR ${resourceType}/${id}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                id,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to delete ${resourceType}/${id}`, error);
        }
    }

    // Search for FHIR resources
    async searchResources(resourceType: string, params: Record<string, string>, correlationId?: string): Promise<any> {
        const startTime = Date.now();
        try {
            // Filter out NestJS-specific parameters that HAPI FHIR doesn't understand
            const filteredParams = { ...params };
            const nestJsSpecificParams = ['sortDirection', 'sort', 'page', 'limit', 'search'];
            nestJsSpecificParams.forEach(param => {
                if (param in filteredParams) {
                    delete filteredParams[param];
                }
            });

            const response = await this.retryableRequest(
                async () => {
                    const config = this.getRequestConfig(correlationId);
                    config.params = filteredParams;
                    const result = await axios.get(`${this.baseUrl}/${resourceType}`, config);
                    return result.data;
                },
                `search ${resourceType}`,
                correlationId
            );

            this.logger.debug(`[FHIR] SEARCH ${resourceType} - ${Date.now() - startTime}ms [${correlationId}]`);
            return response;
        } catch (error) {
            this.logger.error(`Error searching FHIR ${resourceType}: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                params,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to search ${resourceType}`, error);
        }
    }

    // Search for FHIR resources with permission check
    async searchResourcesWithPermissionCheck(
        resourceType: string,
        params: Record<string, string>,
        user: any,
        correlationId?: string
    ): Promise<any> {
        const startTime = Date.now();
        try {
            // For Patient resources, patients should only see their own record
            if (resourceType === 'Patient' && user.role === UserRole.PATIENT) {
                if (user.fhirResourceId) {
                    // Override any search parameters and just get their own record
                    return this.getResourceWithPermissionCheck('Patient', user.fhirResourceId, user, correlationId);
                } else {
                    this.logger.warn(`Patient user ${user.id} has no FHIR resource ID [${correlationId}]`);
                    throw new ForbiddenException('Patient account not linked to clinical data');
                }
            }

            // For other resources or users, apply appropriate filters
            let filteredParams = { ...params };

            // For patients, filter resources to only show their own
            if (user.role === UserRole.PATIENT && user.fhirResourceId) {
                // Add patient reference filter for resources that link to patients
                if (['Observation', 'Condition', 'MedicationStatement', 'Appointment'].includes(resourceType)) {
                    filteredParams.patient = `Patient/${user.fhirResourceId}`;
                } else if (['DiagnosticReport', 'CarePlan', 'Goal'].includes(resourceType)) {
                    filteredParams.subject = `Patient/${user.fhirResourceId}`;
                }
            }

            // For practitioners, they can see all resources they have access to
            // In a real system, you'd add filters based on care relationships

            // Perform the search with filtered parameters
            const result = await this.searchResources(resourceType, filteredParams, correlationId);

            this.logger.debug(`Search ${resourceType} completed for user ${user.id} (${user.role}) [${correlationId}]`);
            return result;
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error searching FHIR ${resourceType} with permission check: ${error.message} [${correlationId}]`, {
                correlationId,
                resourceType,
                params,
                userId: user.id,
                userRole: user.role,
                error: error.stack
            });
            throw new DownstreamFhirException(`Failed to search ${resourceType}`, error);
        }
    }

    // Get resources associated with a specific user
    async getUserResources(userId: string): Promise<FhirResource[]> {
        return this.fhirResourceModel.find({ userId }).exec();
    }

    // Check if FHIR server is available
    async checkHealth(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/metadata`, {
                headers: { 'Accept': 'application/fhir+json' },
                timeout: 5000
            });
            return true;
        } catch (error) {
            this.logger.error('FHIR server health check failed:', error);
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

    /**
     * Ensure proper capitalization of FHIR resource types
     * FHIR is case sensitive and resource types must be properly capitalized
     */
    normalizeResourceType(resourceType: string): string {
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
     * Normalize a FHIR resource ID by removing 'res-' prefix if present
     */
    normalizeResourceId(id: string): string {
        return id.startsWith('res-') ? id.substring(4) : id;
    }

    /**
     * Get the latest observations for a patient by LOINC code
     */
    async getLatestObservationsByLoinc(patientId: string, loincCodes: string[]): Promise<any[]> {
        try {
            const normalizedPatientId = this.normalizeResourceId(patientId);

            const searchParams = {
                patient: normalizedPatientId,
                code: loincCodes.join(','),
                _sort: '-date',
                _count: '10',
                status: 'final,amended,corrected',
            };

            const response = await this.searchResources('Observation', searchParams);

            // Extract unique latest observation per code
            const latestByCode = new Map();
            if (response.entry && Array.isArray(response.entry)) {
                for (const entry of response.entry) {
                    const resource = entry.resource;
                    if (resource && resource.code && resource.code.coding) {
                        for (const coding of resource.code.coding) {
                            if (loincCodes.includes(coding.code) && !latestByCode.has(coding.code)) {
                                latestByCode.set(coding.code, resource);
                            }
                        }
                    }
                }
            }

            return Array.from(latestByCode.values());
        } catch (error) {
            this.logger.error(`Error fetching observations for patient ${patientId}: ${error.message}`);
            throw new DownstreamFhirException(`Failed to fetch observations for patient ${patientId}`, error);
        }
    }

    /**
     * Get upcoming appointments for a patient
     */
    async getUpcomingAppointments(patientId: string, count: number = 5): Promise<any[]> {
        try {
            const normalizedPatientId = this.normalizeResourceId(patientId);
            const today = new Date().toISOString().split('T')[0];

            const searchParams = {
                patient: normalizedPatientId,
                date: `ge${today}`,
                _sort: 'date',
                _count: count.toString(),
                status: 'booked,pending',
                // Fix: Use separate _include parameters instead of comma-separated values
                '_include': 'Appointment:practitioner',
                '_include:1': 'Appointment:location',
            };

            this.logger.debug(`Fetching upcoming appointments with params: ${JSON.stringify(searchParams)}`);
            const response = await this.searchResources('Appointment', searchParams);

            // Extract appointments and included resources
            const appointments = [];
            const includedResources = {};

            if (response.entry && Array.isArray(response.entry)) {
                // First, collect all included resources by reference
                response.entry.forEach(entry => {
                    const resource = entry.resource;
                    if (resource && resource.resourceType && resource.id) {
                        if (resource.resourceType !== 'Appointment') {
                            const reference = `${resource.resourceType}/${resource.id}`;
                            includedResources[reference] = resource;
                        }
                    }
                });

                // Then extract appointments and enrich with included resources
                response.entry.forEach(entry => {
                    const resource = entry.resource;
                    if (resource && resource.resourceType === 'Appointment') {
                        // Enrich participants with included resources
                        if (resource.participant && Array.isArray(resource.participant)) {
                            resource.participant.forEach(participant => {
                                if (participant.actor && participant.actor.reference) {
                                    const ref = participant.actor.reference;
                                    if (includedResources[ref]) {
                                        participant.actor.resource = includedResources[ref];
                                    }
                                }
                            });
                        }
                        appointments.push(resource);
                    }
                });
            }

            return appointments;
        } catch (error) {
            this.logger.error(`Error fetching appointments for patient ${patientId}: ${error.message}`);
            throw new DownstreamFhirException(`Failed to fetch appointments for patient ${patientId}`, error);
        }
    }

    private buildRequestOptions(options: any = {}): AxiosRequestConfig {
        return {
            headers: {
                'Content-Type': 'application/fhir+json',
                'Accept': 'application/fhir+json',
                ...options.headers,
            },
            ...options,
        };
    }

    /**
     * Create a FHIR resource
     * @param resourceType The FHIR resource type (e.g., 'Patient', 'Observation')
     * @param resource The resource data
     * @returns The created resource with server-assigned ID
     */
    async create(resourceType: string, resource: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.hapiFhirUrl}/${resourceType}`,
                    resource,
                    {
                        headers: {
                            'Content-Type': 'application/fhir+json',
                            'Accept': 'application/fhir+json',
                        },
                    }
                )
            );
            return response.data;
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
     * Delete a FHIR resource
     * @param resourceType The FHIR resource type (e.g., 'Patient', 'Observation')
     * @param id The resource ID
     * @returns The operation outcome
     */
    async delete(resourceType: string, id: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.delete(
                    `${this.hapiFhirUrl}/${resourceType}/${id}`,
                    {
                        headers: {
                            'Accept': 'application/fhir+json',
                        },
                    }
                )
            );
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error(
                `Failed to delete FHIR resource: ${axiosError.message}`,
                axiosError.stack,
            );
            throw new Error(`Failed to delete FHIR resource: ${axiosError.message}`);
        }
    }
} 