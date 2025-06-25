import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FhirConfig } from './fhir-config.interface';

/**
 * Service to handle FHIR configuration
 */
@Injectable()
export class FhirConfigService {
    constructor(
        @Inject('FHIR_OPTIONS') private readonly options: FhirConfig,
        private configService: ConfigService,
    ) { }

    /**
     * Get the HAPI FHIR server URL
     */
    get serverUrl(): string {
        return (
            this.options.serverUrl ||
            this.configService.get<string>('fhir.serverUrl') ||
            'http://hapi-fhir:8080/fhir'
        );
    }

    /**
     * Get auth configuration for HAPI FHIR server
     */
    get auth(): { type: string; credentials?: string } {
        return (
            this.options.auth ||
            this.configService.get<{ type: string; credentials?: string }>('fhir.auth') ||
            { type: 'none' }
        );
    }

    /**
     * Get list of resources to store locally in MongoDB
     */
    get localResources(): string[] {
        return (
            this.options.localResources ||
            this.configService.get<string[]>('fhir.localResources') ||
            []
        );
    }

    /**
     * Check if validation is enabled
     */
    get isValidationEnabled(): boolean {
        return this.options.enableValidation !== false;
    }

    /**
     * Check if auditing is enabled
     */
    get isAuditingEnabled(): boolean {
        return this.options.enableAuditing !== false;
    }
} 