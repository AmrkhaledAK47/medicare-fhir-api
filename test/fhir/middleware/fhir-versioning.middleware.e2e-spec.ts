import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthHelper } from '../../test-helpers/auth.helper';

describe('FhirVersioningMiddleware (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthHelper;
    let adminToken: string;
    let resourceId: string;
    let resourceVersionId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup authentication helper
        authHelper = new AuthHelper(app);

        // Create admin user for testing
        const adminAuth = await authHelper.createUserAndLogin('test.admin.versioning@example.com', 'password', 'ADMIN');
        adminToken = adminAuth.accessToken;

        // Create a test resource
        const patientData = {
            resourceType: 'Patient',
            name: [
                {
                    family: 'TestVersioning',
                    given: ['Patient']
                }
            ],
            gender: 'male',
            birthDate: '1980-01-01'
        };

        const response = await request(app.getHttpServer())
            .post('/fhir/Patient')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(patientData);

        resourceId = response.body.id;
        resourceVersionId = response.body.meta.versionId;

        // Update the resource to create a new version
        const updatedData = {
            ...response.body,
            birthDate: '1980-02-02'
        };

        const updateResponse = await request(app.getHttpServer())
            .put(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updatedData);
    });

    afterAll(async () => {
        // Clean up created resource
        if (resourceId) {
            await request(app.getHttpServer())
                .delete(`/fhir/Patient/${resourceId}`)
                .set('Authorization', `Bearer ${adminToken}`);
        }
        await app.close();
    });

    it('should add FHIR-specific content type header to responses', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .expect('Content-Type', /application\/fhir\+json/);
    });

    it('should include ETag header in responses', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.headers).toHaveProperty('etag');
                expect(res.headers.etag).toMatch(/^W\/"[^"]+"/); // ETag format W/"versionId"
            });
    });

    it('should include Last-Modified header in responses', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.headers).toHaveProperty('last-modified');
                // Last-Modified should be in RFC 7231 format
                const lastModified = new Date(res.headers['last-modified']);
                expect(lastModified).toBeInstanceOf(Date);
                expect(isNaN(lastModified.getTime())).toBeFalsy();
            });
    });

    it('should support version-specific resource retrieval', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}/_history/${resourceVersionId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Patient');
                expect(res.body).toHaveProperty('id', resourceId);
                expect(res.body.meta).toHaveProperty('versionId', resourceVersionId);
            });
    });

    it('should support version retrieval via query parameter', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}?_versionId=${resourceVersionId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Patient');
                expect(res.body).toHaveProperty('id', resourceId);
                expect(res.body.meta).toHaveProperty('versionId', resourceVersionId);
            });
    });

    it('should support conditional requests with If-None-Match header', async () => {
        // First get the latest version
        const getResponse = await request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        const etag = getResponse.headers.etag;

        // Then make a conditional request with that ETag
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('If-None-Match', etag)
            .expect(304); // Should return Not Modified
    });

    it('should support conditional requests with If-Modified-Since header', async () => {
        // First get the latest version
        const getResponse = await request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        const lastModified = getResponse.headers['last-modified'];

        // Then make a conditional request with that Last-Modified
        return request(app.getHttpServer())
            .get(`/fhir/Patient/${resourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('If-Modified-Since', lastModified)
            .expect(304); // Should return Not Modified
    });
}); 