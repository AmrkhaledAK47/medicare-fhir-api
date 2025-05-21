import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FhirResource, FhirResourceType } from './schemas/fhir-resource.schema';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class FhirService {
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        @InjectModel(FhirResource.name) private fhirResourceModel: Model<FhirResource>,
        private configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('app.fhir.serverBaseUrl');
        this.maxRetries = 3; // Max number of retries for failed requests
        this.retryDelay = 1000; // Delay between retries in ms
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
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseUrl}/${resourceType}?${queryString}`;

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
} 