import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthHelper } from '../../test-helpers/auth.helper';

describe('FhirExceptionFilter (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthHelper;
    let adminToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup authentication helper
        authHelper = new AuthHelper(app);

        // Create admin user for testing
        const adminAuth = await authHelper.createUserAndLogin('test.admin.exception@example.com', 'password', 'ADMIN');
        adminToken = adminAuth.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should format 404 errors as FHIR OperationOutcome', () => {
        return request(app.getHttpServer())
            .get('/fhir/Patient/non-existent-id')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(404)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();
                expect(res.body.issue[0]).toHaveProperty('severity', 'warning');
                expect(res.body.issue[0]).toHaveProperty('code', 'not-found');
            });
    });

    it('should format 400 errors as FHIR OperationOutcome', () => {
        // Send malformed request body to trigger validation error
        const invalidData = {
            resourceType: 'Patient',
            // Invalid property that should cause validation to fail
            invalidProperty: true,
            // Invalid gender value
            gender: 'invalid-gender'
        };

        return request(app.getHttpServer())
            .post('/fhir/Patient')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData)
            .expect((res) => {
                expect(res.status).toBeGreaterThanOrEqual(400);
                expect(res.status).toBeLessThan(500);
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();
                expect(res.body.issue[0]).toHaveProperty('severity');
                expect(res.body.issue[0]).toHaveProperty('code');
                // Check that the issue contains diagnostics
                expect(res.body.issue[0]).toHaveProperty('diagnostics');
            });
    });

    it('should format 403 errors as FHIR OperationOutcome', () => {
        // Create token with invalid role
        const invalidToken = authHelper.createTestToken('test-user', 'INVALID_ROLE');

        return request(app.getHttpServer())
            .get('/fhir/Patient')
            .set('Authorization', `Bearer ${invalidToken}`)
            .expect(403)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();
                expect(res.body.issue[0]).toHaveProperty('severity', 'warning');
                expect(res.body.issue[0]).toHaveProperty('code', 'forbidden');
            });
    });

    it('should format 401 errors as FHIR OperationOutcome', () => {
        return request(app.getHttpServer())
            .get('/fhir/Patient')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();
                expect(res.body.issue[0]).toHaveProperty('severity', 'warning');
                expect(res.body.issue[0]).toHaveProperty('code', 'security');
            });
    });

    it('should format validation errors as FHIR OperationOutcome', () => {
        const invalidData = {
            resourceType: 'Patient',
            birthDate: 'not-a-valid-date'
        };

        return request(app.getHttpServer())
            .post('/fhir/Patient/$validate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData)
            .expect(200) // The validation operation itself succeeds
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();

                // At least one of the issues should be about the invalid date
                const hasDateIssue = res.body.issue.some(issue =>
                    issue.diagnostics && issue.diagnostics.toLowerCase().includes('date')
                );
                expect(hasDateIssue).toBeTruthy();
            });
    });

    it('should set Content-Type header to application/fhir+json', () => {
        return request(app.getHttpServer())
            .get('/fhir/Patient/non-existent-id')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(404)
            .expect('Content-Type', /application\/fhir\+json/);
    });
}); 