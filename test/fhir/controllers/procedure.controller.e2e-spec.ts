import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthBypassHelper } from '../../test-helpers/auth-bypass.helper';

describe('ProcedureController (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthBypassHelper;
    let practitionerToken: string;
    let patientToken: string;
    let patientId: string = 'test-patient-id';
    let procedureId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();

        // Setup authentication bypass helper
        authHelper = new AuthBypassHelper(app);

        // Create test tokens without calling actual auth endpoints
        practitionerToken = authHelper.createPractitionerToken();
        patientToken = authHelper.createPatientToken(patientId);

        // Create a test procedure for the patient
        const procedureData = {
            resourceType: 'Procedure',
            status: 'completed',
            code: {
                coding: [
                    {
                        system: 'http://snomed.info/sct',
                        code: '80146002',
                        display: 'Appendectomy'
                    }
                ],
                text: 'Appendectomy'
            },
            subject: {
                reference: `Patient/${patientId}`
            },
            performedDateTime: '2023-01-15'
        };

        try {
            const procedureResponse = await request(app.getHttpServer())
                .post('/api/fhir/Procedure')
                .set('Authorization', `Bearer ${practitionerToken}`)
                .send(procedureData);

            if (procedureResponse.status === 201) {
                procedureId = procedureResponse.body.id;
            }
        } catch (error) {
            console.log('Failed to create test procedure:', error);
        }
    });

    afterAll(async () => {
        // Clean up created procedure
        if (procedureId) {
            try {
                await request(app.getHttpServer())
                    .delete(`/api/fhir/Procedure/${procedureId}`)
                    .set('Authorization', `Bearer ${practitionerToken}`);
            } catch (error) {
                console.log('Failed to delete test procedure:', error);
            }
        }

        await app.close();
    });

    it('should require authentication for procedure endpoints', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/Procedure')
            .expect(401);
    });

    it('should allow patients to get their own procedures', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/Procedure/$my-procedures')
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'searchset');
            });
    });

    it('should allow practitioners to get procedures for a specific patient', () => {
        return request(app.getHttpServer())
            .get(`/api/fhir/Procedure/patient/${patientId}`)
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'searchset');
                // Verify that the procedure we created is in the results
                if (res.body.entry && res.body.entry.length > 0) {
                    const foundProcedure = res.body.entry.find(
                        entry => entry.resource.id === procedureId
                    );
                    expect(foundProcedure).toBeDefined();
                }
            });
    });

    it('should allow search procedures by code', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/Procedure/$by-code?code=http://snomed.info/sct|80146002')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
            });
    });

    it('should create a new procedure', async () => {
        const newProcedure = {
            resourceType: 'Procedure',
            status: 'in-progress',
            code: {
                coding: [
                    {
                        system: 'http://snomed.info/sct',
                        code: '71388002',
                        display: 'Procedure'
                    }
                ],
                text: 'Test Procedure'
            },
            subject: {
                reference: `Patient/${patientId}`
            },
            performedDateTime: new Date().toISOString().split('T')[0]
        };

        const response = await request(app.getHttpServer())
            .post('/api/fhir/Procedure')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(newProcedure)
            .expect(201);

        expect(response.body).toHaveProperty('resourceType', 'Procedure');
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toEqual('in-progress');

        // Clean up the created procedure
        await request(app.getHttpServer())
            .delete(`/api/fhir/Procedure/${response.body.id}`)
            .set('Authorization', `Bearer ${practitionerToken}`);
    });

    // Test role-based access control
    it('should enforce role-based access control for creating procedures', () => {
        const newProcedure = {
            resourceType: 'Procedure',
            status: 'in-progress',
            code: {
                text: 'Test Procedure'
            },
            subject: {
                reference: `Patient/${patientId}`
            }
        };

        return request(app.getHttpServer())
            .post('/api/fhir/Procedure')
            .set('Authorization', `Bearer ${patientToken}`)
            .send(newProcedure)
            .expect(403);
    });
}); 