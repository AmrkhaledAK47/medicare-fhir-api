import { registerAs } from '@nestjs/config';

export default registerAs('fhir', () => ({
    // HAPI FHIR server connection
    enableHapiFhir: process.env.ENABLE_HAPI_FHIR === 'true',
    hapiFhirUrl: process.env.HAPI_FHIR_URL || 'http://localhost:9090/fhir',

    // Resource management
    localResources: (process.env.LOCAL_FHIR_RESOURCES || 'Patient,Practitioner,Organization').split(','),

    // FHIR version
    fhirVersion: process.env.FHIR_VERSION || '4.0.1',

    // Server info
    serverName: process.env.FHIR_SERVER_NAME || 'MediCare FHIR API',
    serverVersion: process.env.FHIR_SERVER_VERSION || '1.0.0',
})); 