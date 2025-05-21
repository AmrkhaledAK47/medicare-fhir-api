import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class ExternalFhirService {
    private readonly logger = new Logger(ExternalFhirService.name);
    private baseUrl: string;
    private authHeaders: Record<string, string> = {};
    private httpsAgent: https.Agent | undefined;
    private tokenExpiryTime: number | null = null;
    private accessToken: string | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.baseUrl = this.configService.get<string>('FHIR_SERVER_URL') || 'http://localhost:9090/fhir';
        this.setupAuthHeaders();
        this.setupHttpsAgent();
    }

    private setupAuthHeaders() {
        const authType = this.configService.get<string>('FHIR_AUTH_TYPE');
        const authToken = this.configService.get<string>('FHIR_AUTH_TOKEN');

        if (authType === 'bearer' && authToken) {
            this.authHeaders = { Authorization: `Bearer ${authToken}` };
        } else if (authType === 'basic' && authToken) {
            this.authHeaders = { Authorization: `Basic ${authToken}` };
        }
    }

    private setupHttpsAgent() {
        const rejectUnauthorized = this.configService.get<boolean>('FHIR_TLS_REJECT_UNAUTHORIZED') !== false;
        const certPath = this.configService.get<string>('FHIR_CLIENT_CERT_PATH');
        const keyPath = this.configService.get<string>('FHIR_CLIENT_KEY_PATH');
        const caPath = this.configService.get<string>('FHIR_CA_PATH');

        // Configure HTTPS options if any TLS settings are provided
        if (certPath || keyPath || caPath || rejectUnauthorized === false) {
            const options: https.AgentOptions = {
                rejectUnauthorized,
            };

            if (certPath && fs.existsSync(certPath)) {
                options.cert = fs.readFileSync(certPath);
            }

            if (keyPath && fs.existsSync(keyPath)) {
                options.key = fs.readFileSync(keyPath);
            }

            if (caPath && fs.existsSync(caPath)) {
                options.ca = fs.readFileSync(caPath);
            }

            this.httpsAgent = new https.Agent(options);
        }
    }

    private async ensureToken(): Promise<void> {
        const authType = this.configService.get<string>('FHIR_AUTH_TYPE');

        // Only refresh token if using OAuth
        if (authType !== 'bearer') {
            return;
        }

        const now = Date.now();
        // If token exists and is not expired, do nothing
        if (this.accessToken && this.tokenExpiryTime && now < this.tokenExpiryTime) {
            return;
        }

        try {
            const tokenUrl = this.configService.get<string>('OAUTH_TOKEN_URL');
            const clientId = this.configService.get<string>('OAUTH_CLIENT_ID');
            const clientSecret = this.configService.get<string>('OAUTH_CLIENT_SECRET');
            const scope = this.configService.get<string>('OAUTH_SCOPE') || 'system/*.read system/*.write';

            if (!tokenUrl || !clientId || !clientSecret) {
                throw new Error('OAuth configuration is incomplete');
            }

            const response = await firstValueFrom(
                this.httpService.post(
                    tokenUrl,
                    new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: clientId,
                        client_secret: clientSecret,
                        scope,
                    }).toString(),
                    {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    },
                ),
            );

            const responseData = response.data as { access_token: string; expires_in: number };
            this.accessToken = responseData.access_token;
            // Set expiry time with a 60-second buffer
            this.tokenExpiryTime = now + responseData.expires_in * 1000 - 60000;
            this.authHeaders = { Authorization: `Bearer ${this.accessToken}` };

            this.logger.log('Successfully obtained a new OAuth token');
        } catch (error) {
            this.logger.error(`Failed to get OAuth token: ${error.message}`);
            throw new HttpException('Failed to authenticate with FHIR server', HttpStatus.UNAUTHORIZED);
        }
    }

    private getRequestConfig() {
        const timeout = this.configService.get<number>('FHIR_TIMEOUT') || 30000;
        return {
            headers: this.authHeaders,
            httpsAgent: this.httpsAgent,
            timeout,
        };
    }

    async getResource<T = any>(resourceType: string, id: string): Promise<T> {
        await this.ensureToken();
        try {
            const response = await firstValueFrom(
                this.httpService.get<T>(`${this.baseUrl}/${resourceType}/${id}`, this.getRequestConfig()).pipe(
                    map((response: AxiosResponse<T>) => response.data),
                    catchError((error) => {
                        if (error.response?.status === 404) {
                            throw new HttpException(`Resource ${resourceType}/${id} not found`, HttpStatus.NOT_FOUND);
                        }
                        this.logger.error(`Error fetching ${resourceType}/${id}: ${error.message}`);
                        throw new HttpException(
                            `Failed to fetch ${resourceType} resource`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response as T;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error fetching ${resourceType}/${id}: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createResource<T = any>(resourceType: string, resource: any): Promise<T> {
        await this.ensureToken();
        try {
            const response = await firstValueFrom(
                this.httpService.post<T>(
                    `${this.baseUrl}/${resourceType}`,
                    resource,
                    {
                        ...this.getRequestConfig(),
                        headers: {
                            ...this.authHeaders,
                            'Content-Type': 'application/json',
                        },
                    }
                ).pipe(
                    map((response: AxiosResponse<T>) => response.data),
                    catchError((error) => {
                        this.logger.error(`Error creating ${resourceType}: ${error.message}`);
                        if (error.response?.data) {
                            this.logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
                        }
                        throw new HttpException(
                            `Failed to create ${resourceType} resource: ${error.response?.data?.issue?.[0]?.details?.text || error.message}`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response as T;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error creating ${resourceType}: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateResource<T = any>(resourceType: string, id: string, resource: any): Promise<T> {
        await this.ensureToken();
        try {
            // Ensure the resource has the correct ID
            resource.id = id;

            const response = await firstValueFrom(
                this.httpService.put<T>(
                    `${this.baseUrl}/${resourceType}/${id}`,
                    resource,
                    {
                        ...this.getRequestConfig(),
                        headers: {
                            ...this.authHeaders,
                            'Content-Type': 'application/json',
                        },
                    }
                ).pipe(
                    map((response: AxiosResponse<T>) => response.data),
                    catchError((error) => {
                        if (error.response?.status === 404) {
                            throw new HttpException(`Resource ${resourceType}/${id} not found`, HttpStatus.NOT_FOUND);
                        }
                        this.logger.error(`Error updating ${resourceType}/${id}: ${error.message}`);
                        throw new HttpException(
                            `Failed to update ${resourceType} resource: ${error.response?.data?.issue?.[0]?.details?.text || error.message}`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response as T;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error updating ${resourceType}/${id}: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteResource(resourceType: string, id: string): Promise<void> {
        await this.ensureToken();
        try {
            await firstValueFrom(
                this.httpService.delete(
                    `${this.baseUrl}/${resourceType}/${id}`,
                    this.getRequestConfig()
                ).pipe(
                    catchError((error) => {
                        if (error.response?.status === 404) {
                            throw new HttpException(`Resource ${resourceType}/${id} not found`, HttpStatus.NOT_FOUND);
                        }
                        this.logger.error(`Error deleting ${resourceType}/${id}: ${error.message}`);
                        throw new HttpException(
                            `Failed to delete ${resourceType} resource`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error deleting ${resourceType}/${id}: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async searchResources<T = any>(resourceType: string, searchParams: Record<string, string> = {}): Promise<T> {
        await this.ensureToken();
        try {
            const queryParams = new URLSearchParams();

            // Add search parameters to URL
            Object.entries(searchParams).forEach(([key, value]) => {
                queryParams.append(key, value);
            });

            const response = await firstValueFrom(
                this.httpService.get<T>(
                    `${this.baseUrl}/${resourceType}`,
                    {
                        ...this.getRequestConfig(),
                        params: queryParams,
                    }
                ).pipe(
                    map((response: AxiosResponse<T>) => response.data),
                    catchError((error) => {
                        this.logger.error(`Error searching ${resourceType}: ${error.message}`);
                        throw new HttpException(
                            `Failed to search ${resourceType} resources: ${error.message}`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response as T;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error searching ${resourceType}: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async executeTransaction<T = any>(bundle: any): Promise<T> {
        await this.ensureToken();
        try {
            // Ensure bundle has correct type
            if (!bundle.type || bundle.type !== 'transaction') {
                bundle.type = 'transaction';
            }

            const response = await firstValueFrom(
                this.httpService.post<T>(
                    `${this.baseUrl}`,
                    bundle,
                    {
                        ...this.getRequestConfig(),
                        headers: {
                            ...this.authHeaders,
                            'Content-Type': 'application/json',
                        },
                    }
                ).pipe(
                    map((response: AxiosResponse<T>) => response.data),
                    catchError((error) => {
                        this.logger.error(`Error executing transaction: ${error.message}`);
                        throw new HttpException(
                            `Failed to execute FHIR transaction: ${error.message}`,
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response as T;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error executing transaction: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getServerMetadata(): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<any>(`${this.baseUrl}/metadata`, this.getRequestConfig()).pipe(
                    map((response: AxiosResponse<any>) => response.data),
                    catchError((error) => {
                        this.logger.error(`Error fetching server metadata: ${error.message}`);
                        throw new HttpException(
                            'Failed to fetch server metadata',
                            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                        );
                    })
                )
            );
            return response;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error fetching server metadata: ${error.message}`);
            throw new HttpException('Failed to communicate with FHIR server', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getSupportedResourceTypes(): Promise<string[]> {
        const metadata = await this.getServerMetadata();

        try {
            // Extract resource types from capability statement
            const resourceTypes = metadata.rest?.[0]?.resource?.map(r => r.type) || [];
            return resourceTypes;
        } catch (error) {
            this.logger.error(`Error parsing server metadata: ${error.message}`);
            throw new HttpException('Failed to parse server metadata', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
} 