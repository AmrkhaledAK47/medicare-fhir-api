import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HealthService {
    private readonly fhirServerBaseUrl: string;

    constructor(private configService: ConfigService) {
        this.fhirServerBaseUrl = this.configService.get<string>('app.fhir.serverBaseUrl');
    }

    async checkFhirServerHealth(): Promise<{
        success: boolean;
        status: string;
        message: string;
        serverInfo?: any;
    }> {
        try {
            const response = await axios.get(`${this.fhirServerBaseUrl}/metadata`, {
                headers: { 'Accept': 'application/fhir+json' },
                timeout: 5000
            });

            if (response.status === 200 && response.data?.resourceType === 'CapabilityStatement') {
                return {
                    success: true,
                    status: 'healthy',
                    message: 'FHIR server is available and responding',
                    serverInfo: {
                        name: response.data.name || 'FHIR Server',
                        status: response.data.status || 'active',
                        fhirVersion: response.data.fhirVersion || 'unknown'
                    }
                };
            }

            return {
                success: false,
                status: 'unhealthy',
                message: 'FHIR server returned unexpected response'
            };
        } catch (error) {
            console.error('Error checking FHIR server health:', error.message);

            return {
                success: false,
                status: 'error',
                message: error.message || 'Error checking FHIR server health'
            };
        }
    }

    getApiHealth(): { status: string; timestamp: Date } {
        return {
            status: 'ok',
            timestamp: new Date(),
        };
    }
} 