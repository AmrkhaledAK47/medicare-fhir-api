import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createValidationTestApp } from '../../test-helpers/test-module.helper';

describe('ValidationController (Simplified e2e)', () => {
    let app: INestApplication;
    let httpServer: any;

    beforeAll(async () => {
        app = await createValidationTestApp();
        httpServer = app.getHttpServer();
        console.log('Test app initialized');

        // Log the app instance details
        console.log('App global prefix:', app.getHttpAdapter().getInstance()._globalPrefix);

        // Debug check - make a request to a known endpoint
        try {
            const response = await request(httpServer).get('/api/health').expect(404);
            console.log('Health check response:', response.status);
        } catch (error) {
            console.log('Health check error:', error.message);
        }
    });

    afterAll(async () => {
        await app.close();
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

        console.log('Sending request to /api/fhir/Patient/$validate');

        return request(httpServer)
            .post('/api/fhir/Patient/$validate')
            .send(validPatient)
            .expect((res) => {
                console.log('Response status:', res.status);
                console.log('Response body:', JSON.stringify(res.body).substring(0, 100));

                if (res.status !== 200) {
                    throw new Error(`Expected 200 OK, got ${res.status}`);
                }

                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
            });
    });

    it('should report errors for an invalid Patient resource', async () => {
        const invalidPatient = {
            resourceType: 'Patient',
            // Missing required fields
            gender: 'invalid-gender', // Invalid value for gender
            birthDate: 'not-a-date' // Invalid date format
        };

        return request(httpServer)
            .post('/api/fhir/Patient/$validate')
            .send(invalidPatient)
            .expect((res) => {
                console.log('Response status:', res.status);
                if (res.status !== 200) {
                    throw new Error(`Expected 200 OK, got ${res.status}`);
                }

                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
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

        return request(httpServer)
            .post('/api/fhir/$validate-batch')
            .send(bundle)
            .expect((res) => {
                console.log('Response status:', res.status);
                if (res.status !== 200) {
                    throw new Error(`Expected 200 OK, got ${res.status}`);
                }

                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'collection');
                expect(res.body).toHaveProperty('entry');
                expect(Array.isArray(res.body.entry)).toBeTruthy();
                expect(res.body.entry.length).toEqual(2);
            });
    });
}); 