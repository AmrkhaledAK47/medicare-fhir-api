import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createDocTestApp } from '../../test-helpers/test-module.helper';

describe('DocumentationController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createDocTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should get API documentation overview', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/documentation')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'CapabilityStatement');
                expect(res.body).toHaveProperty('status', 'active');
                expect(res.body).toHaveProperty('fhirVersion');
                expect(res.body).toHaveProperty('rest');
                expect(Array.isArray(res.body.rest)).toBeTruthy();

                // Should have software information
                expect(res.body).toHaveProperty('software');
                expect(res.body.software).toHaveProperty('name', 'MediCare FHIR API');
            });
    });

    it('should get example resources', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/documentation/examples/Patient')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Patient');
                expect(res.body).toHaveProperty('id');
                expect(res.body).toHaveProperty('meta');
            });
    });

    it('should get documentation for operations', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/documentation/operations')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'collection');
                expect(res.body).toHaveProperty('entry');
                expect(Array.isArray(res.body.entry)).toBeTruthy();

                // Should include operation definitions
                expect(res.body.entry.length).toBeGreaterThan(0);

                // Check for common operations
                const operationNames = res.body.entry.map(e => e.resource.name);
                expect(operationNames).toContain('validate');
            });
    });

    it('should get API usage examples', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/documentation/usage')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('basicUsage');
                expect(res.body).toHaveProperty('advancedUsage');

                // Check basic usage examples
                expect(res.body.basicUsage).toHaveProperty('examples');
                expect(Array.isArray(res.body.basicUsage.examples)).toBeTruthy();
                expect(res.body.basicUsage.examples.length).toBeGreaterThan(0);

                // Check advanced usage examples
                expect(res.body.advancedUsage).toHaveProperty('examples');
                expect(Array.isArray(res.body.advancedUsage.examples)).toBeTruthy();
                expect(res.body.advancedUsage.examples.length).toBeGreaterThan(0);
            });
    });

    it('should return 404 for non-existent example resource', () => {
        return request(app.getHttpServer())
            .get('/api/fhir/documentation/examples/NonExistentResource')
            .expect(404)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
                expect(res.body).toHaveProperty('issue');
                expect(Array.isArray(res.body.issue)).toBeTruthy();
                expect(res.body.issue[0]).toHaveProperty('severity', 'error');
                expect(res.body.issue[0]).toHaveProperty('code', 'not-found');
            });
    });
}); 