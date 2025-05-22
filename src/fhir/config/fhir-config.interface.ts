/**
 * Configuration interface for the FHIR module
 */
export interface FhirConfig {
    /**
     * HAPI FHIR server URL
     */
    serverUrl: string;

    /**
     * Authentication configuration for HAPI FHIR server
     */
    auth?: {
        /**
         * Authentication type (basic, bearer, none)
         */
        type: 'basic' | 'bearer' | 'none';

        /**
         * Authentication credentials (username:password for basic, token for bearer)
         */
        credentials?: string;
    };

    /**
     * List of resources to store locally in MongoDB (empty means all are in HAPI FHIR)
     */
    localResources?: string[];

    /**
     * Enable FHIR resource validation
     */
    enableValidation?: boolean;

    /**
     * Enable auditing of FHIR operations
     */
    enableAuditing?: boolean;
} 