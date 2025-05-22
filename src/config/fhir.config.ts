import { registerAs } from '@nestjs/config';

export default registerAs('fhir', () => ({
    // HAPI FHIR server connection
    enableHapiFhir: process.env.ENABLE_HAPI_FHIR === 'true',
    hapiFhirUrl: process.env.HAPI_FHIR_URL || 'http://localhost:9090/fhir',
    maxRetries: parseInt(process.env.FHIR_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.FHIR_RETRY_DELAY || '1000', 10),

    // Resource management
    localResources: (process.env.LOCAL_FHIR_RESOURCES || 'Patient,Practitioner,Organization').split(','),

    // FHIR version
    fhirVersion: process.env.FHIR_VERSION || '4.0.1',

    // Server info
    serverName: process.env.FHIR_SERVER_NAME || 'MediCare FHIR API',
    serverVersion: process.env.FHIR_SERVER_VERSION || '1.0.0',

    // Caching
    cacheTtl: parseInt(process.env.FHIR_CACHE_TTL || '3600', 10), // Default cache TTL in seconds
    enableCache: process.env.FHIR_ENABLE_CACHE === 'true',

    // Authorization
    enforceResourcePermissions: process.env.FHIR_ENFORCE_PERMISSIONS !== 'false',

    // Operation support
    supportedOperations: (process.env.FHIR_SUPPORTED_OPERATIONS || 'validate,everything,expand,translate,lookup').split(','),

    // Validation
    validationMode: process.env.FHIR_VALIDATION_MODE || 'strict', // Options: strict, lenient, off

    // Compartments
    enforceCompartments: process.env.FHIR_ENFORCE_COMPARTMENTS !== 'false',

    // Audit
    enableAuditing: process.env.FHIR_ENABLE_AUDITING !== 'false',
})); 