import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthBypassHelper } from '../../test-helpers/auth-bypass.helper';

describe('ValidationController (e2e)', () => {
    let app: INestApplication;
    let authBypassHelper: AuthBypassHelper;
    let adminToken: string;
    let practitionerToken: string;
    let patientToken: string;
    let validPatientId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();

        // Setup authentication bypass helper
        authBypassHelper = new AuthBypassHelper();

        // Create tokens for different roles
        adminToken = authBypassHelper.createAdminToken();
        practitionerToken = authBypassHelper.createPractitionerToken();

        // Create a patient token with a specific ID
        validPatientId = 'test-patient-123';
        patientToken = authBypassHelper.createPatientToken(validPatientId);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should require authentication for validation endpoints', () => {
        return request(app.getHttpServer())
            .post('/api/fhir/Patient/$validate')
            .expect(401);
    });

    it('should validate a valid Patient resource', async () => {
        const validPatient = {
            resourceType: 'Patient',
            name: [
                {
                    family: 'Smith',
                    given: ['John']
                }
            ],
            gender: 'male',
            birthDate: '1980-01-01'
        };

        return request(app.getHttpServer())
            .post('/api/fhir/Patient/$validate')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(validPatient)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');

                // If the validation succeeds, there should be no errors
                const hasErrors = res.body.issue.some(issue => issue.severity === 'error');
                expect(hasErrors).toBeFalsy();
            });
    });

    it('should report errors for an invalid Patient resource', async () => {
        const invalidPatient = {
            resourceType: 'Patient',
            // Missing required fields
            gender: 'invalid-gender', // Invalid value for gender
            birthDate: 'not-a-date' // Invalid date format
        };

        return request(app.getHttpServer())
            .post('/api/fhir/Patient/$validate')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(invalidPatient)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');

                // There should be validation errors
                const hasErrors = res.body.issue.some(issue => issue.severity === 'error');
                expect(hasErrors).toBeTruthy();
            });
    });

    it('should validate an existing resource instance', async () => {
        return request(app.getHttpServer())
            .post(`/api/fhir/Patient/${validPatientId}/$validate`)
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
            });
    });

    it('should validate a batch of resources', async () => {
        const bundle = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        name: [{ family: 'Doe', given: ['John'] }],
                        gender: 'male',
                        birthDate: '1970-01-01'
                    }
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        name: [{ family: 'Doe', given: ['Jane'] }],
                        gender: 'female',
                        birthDate: '1975-05-05'
                    }
                }
            ]
        };

        return request(app.getHttpServer())
            .post('/api/fhir/$validate-batch')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(bundle)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'collection');
                expect(res.body).toHaveProperty('entry');
                expect(Array.isArray(res.body.entry)).toBeTruthy();
                expect(res.body.entry.length).toEqual(2);

                // Both resources should be valid
                res.body.entry.forEach(entry => {
                    expect(entry.resource).toHaveProperty('valid', true);
                });
            });
    });

    it('should report validation errors in a batch', async () => {
        const bundle = {
            resourceType: 'Bundle',
            type: 'batch',
            entry: [
                {
                    resource: {
                        resourceType: 'Patient',
                        name: [{ family: 'Smith' }],
                        gender: 'male',
                        birthDate: '1970-01-01'
                    }
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        // Missing name
                        gender: 'unknown', // Invalid gender value
                        birthDate: '1975/05/05' // Invalid date format
                    }
                }
            ]
        };

        return request(app.getHttpServer())
            .post('/api/fhir/$validate-batch')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(bundle)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('entry');
                expect(Array.isArray(res.body.entry)).toBeTruthy();
                expect(res.body.entry.length).toEqual(2);

                // First resource should be valid, second should have errors
                expect(res.body.entry[0].resource.valid).toBeTruthy();
                expect(res.body.entry[1].resource.valid).toBeFalsy();
                expect(res.body.entry[1].resource.issue.length).toBeGreaterThan(0);
            });
    });

    // Test role-based access control
    it('should enforce role-based access control for validation operations', () => {
        const validPatient = {
            resourceType: 'Patient',
            name: [{ family: 'Smith', given: ['John'] }],
            gender: 'male',
            birthDate: '1980-01-01'
        };

        return request(app.getHttpServer())
            .post('/api/fhir/Patient/$validate')
            .set('Authorization', `Bearer ${patientToken}`)
            .send(validPatient)
            .expect(403);
    });
}); 