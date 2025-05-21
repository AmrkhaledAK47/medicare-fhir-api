import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    db: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fhir_ehr',
    },
    fhir: {
        serverBaseUrl: process.env.FHIR_SERVER_BASE_URL || 'http://localhost:9090/fhir',
    },
})); 