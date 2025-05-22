import { JwtService } from '@nestjs/jwt';

/**
 * Helper class that provides test tokens without relying on actual auth endpoints
 * to be available or working
 */
export class AuthBypassHelper {
    private readonly jwtService: JwtService;

    constructor() {
        this.jwtService = new JwtService({
            secret: 'testsecret',
            signOptions: { expiresIn: '1h' },
        });
    }

    /**
     * Creates a test token for an admin user
     */
    createAdminToken(): string {
        return this.createTestToken('admin-test-id', 'ADMIN');
    }

    /**
     * Creates a test token for a practitioner user
     */
    createPractitionerToken(fhirResourceId = 'practitioner-test-id'): string {
        return this.createTestToken('practitioner-test-id', 'PRACTITIONER', fhirResourceId);
    }

    /**
     * Creates a test token for a patient user
     */
    createPatientToken(fhirResourceId = 'patient-test-id'): string {
        return this.createTestToken('patient-test-id', 'PATIENT', fhirResourceId);
    }

    /**
     * Creates a test token with the specified role without creating a user
     */
    createTestToken(userId: string, role: string, fhirResourceId?: string): string {
        return this.jwtService.sign({
            sub: userId,
            email: `test-${userId}@example.com`,
            role,
            fhirResourceId: fhirResourceId || `test-resource-${userId}`,
        });
    }
} 