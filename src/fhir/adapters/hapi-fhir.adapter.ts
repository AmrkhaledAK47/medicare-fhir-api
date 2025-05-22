import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class HapiFhirAdapter {
    private readonly baseUrl: string;
    private readonly logger = new Logger(HapiFhirAdapter.name);
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('fhir.hapiFhirUrl') || 'http://localhost:9090/fhir';
        this.maxRetries = this.configService.get<number>('fhir.maxRetries') || 3;
        this.retryDelay = this.configService.get<number>('fhir.retryDelay') || 1000;
        this.logger.log(`HAPI FHIR Adapter initialized with server URL: ${this.baseUrl}`);
    }

    /**
     * Create a new FHIR resource
     */
    async create(resourceType: string, resource: any): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.post(
                        `${this.baseUrl}/${resourceType}`,
                        resource,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `create ${resourceType}`,
        );
    }

    /**
     * Get a FHIR resource by ID
     */
    async getById(resourceType: string, id: string): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `get ${resourceType}/${id}`,
        );
    }

    /**
     * Update a FHIR resource
     */
    async update(resourceType: string, id: string, resource: any): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.put(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        resource,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `update ${resourceType}/${id}`,
        );
    }

    /**
     * Delete a FHIR resource
     */
    async delete(resourceType: string, id: string): Promise<void> {
        await this.executeWithRetry(
            async () => {
                await firstValueFrom(
                    this.httpService.delete(
                        `${this.baseUrl}/${resourceType}/${id}`,
                        this.getRequestConfig(),
                    ),
                );
            },
            `delete ${resourceType}/${id}`,
        );
    }

    /**
     * Search for FHIR resources
     */
    async search(resourceType: string, params: Record<string, any> = {}): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        `${this.baseUrl}/${resourceType}`,
                        {
                            ...this.getRequestConfig(),
                            params,
                        },
                    ),
                );
                return response.data;
            },
            `search ${resourceType}`,
        );
    }

    /**
     * Perform a FHIR operation ($operation)
     */
    async operation(
        resourceType: string,
        operation: string,
        id?: string,
        params?: Record<string, any>,
        body?: any
    ): Promise<any> {
        const path = id
            ? `${this.baseUrl}/${resourceType}/${id}/$${operation}`
            : `${this.baseUrl}/${resourceType}/$${operation}`;

        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.post(
                        path,
                        body,
                        {
                            ...this.getRequestConfig(),
                            params,
                        },
                    ),
                );
                return response.data;
            },
            `operation ${operation} on ${resourceType}${id ? '/' + id : ''}`,
        );
    }

    /**
     * Get the FHIR server capability statement
     */
    async getCapabilityStatement(): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        `${this.baseUrl}/metadata`,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            'get capability statement',
        );
    }

    /**
     * Validate a FHIR resource
     */
    async validate(resourceType: string, resource: any): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.post(
                        `${this.baseUrl}/${resourceType}/$validate`,
                        resource,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `validate ${resourceType}`,
        );
    }

    /**
     * Get resource history
     */
    async history(resourceType: string, id?: string): Promise<any> {
        const path = id
            ? `${this.baseUrl}/${resourceType}/${id}/_history`
            : `${this.baseUrl}/${resourceType}/_history`;

        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        path,
                        this.getRequestConfig(),
                    ),
                );
                return response.data;
            },
            `get history for ${resourceType}${id ? '/' + id : ''}`,
        );
    }

    /**
     * Execute bulk data export operation
     */
    async export(params: Record<string, any> = {}): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(
                        `${this.baseUrl}/$export`,
                        {
                            ...this.getRequestConfig(),
                            params,
                        },
                    ),
                );
                return response.data;
            },
            'bulk data export',
        );
    }

    /**
     * Check HAPI FHIR server health
     */
    async checkHealth(): Promise<boolean> {
        try {
            await this.getCapabilityStatement();
            return true;
        } catch (error) {
            this.logger.error('HAPI FHIR server health check failed', error);
            return false;
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

    private async executeWithRetry<T>(
        requestFn: () => Promise<T>,
        operation: string,
    ): Promise<T> {
        let retries = 0;
        let lastError: any;

        while (retries < this.maxRetries) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                retries++;

                if (retries >= this.maxRetries) {
                    break;
                }

                this.logger.warn(`Retrying ${operation} (${retries}/${this.maxRetries})`);
                await new Promise(r => setTimeout(r, this.retryDelay));
            }
        }

        throw this.handleError(lastError, operation);
    }

    private handleError(error: any, operation: string): Error {
        const axiosError = error as AxiosError;
        this.logger.error(`Error in HAPI FHIR operation: ${operation}`, error);

        if (axiosError.response) {
            const status = axiosError.response.status;
            const data = axiosError.response.data as any;

            // Parse FHIR OperationOutcome if available
            if (data?.resourceType === 'OperationOutcome' && data?.issue) {
                const issueDetails = data.issue.map((issue: any) =>
                    `[${issue.severity}] ${issue.diagnostics || issue.details?.text || 'Unknown issue'}`
                ).join('; ');

                if (status === 404) {
                    return new NotFoundException(`Resource not found: ${issueDetails}`);
                }

                return new InternalServerErrorException(`FHIR server error: ${issueDetails}`);
            }

            if (status === 404) {
                return new NotFoundException(`Resource not found during operation: ${operation}`);
            }
        }

        return new InternalServerErrorException(
            `FHIR server operation failed: ${operation}. ${axiosError.message || 'Unknown error'}`
        );
    }
} 