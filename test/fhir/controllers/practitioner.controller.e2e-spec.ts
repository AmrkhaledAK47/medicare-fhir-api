import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthHelper } from '../../test-helpers/auth.helper';

describe('PractitionerController (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthHelper;
    let practitionerResourceId: string;
    let accessToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup authentication helper
        authHelper = new AuthHelper(app);

        // Create user with PRACTITIONER role and get their token
        const authResult = await authHelper.createUserAndLogin('practitioner@example.com', 'password', 'PRACTITIONER');
        accessToken = authResult.accessToken;
        practitionerResourceId = authResult.fhirResourceId;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should require authentication for practitioner endpoints', () => {
        return request(app.getHttpServer())
            .get('/fhir/Practitioner/$my-profile')
            .expect(401);
    });

    it('should get authenticated practitioner profile', () => {
        return request(app.getHttpServer())
            .get('/fhir/Practitioner/$my-profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Practitioner');
                expect(res.body).toHaveProperty('id', practitionerResourceId);
            });
    });

    it('should get practitioner patients', () => {
        return request(app.getHttpServer())
            .get('/fhir/Practitioner/$my-patients')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'searchset');
            });
    });

    it('should get practitioner encounters', () => {
        return request(app.getHttpServer())
            .get('/fhir/Practitioner/$my-encounters')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'searchset');
            });
    });

    it('should get practitioner schedule', () => {
        return request(app.getHttpServer())
            .get(`/fhir/Practitioner/${practitionerResourceId}/$schedule`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'Bundle');
                expect(res.body).toHaveProperty('type', 'searchset');
            });
    });

    // Test role-based access control
    it('should reject patient access to practitioner-only endpoints', async () => {
        // Create user with PATIENT role and get their token
        const patientAuth = await authHelper.createUserAndLogin('patient@example.com', 'password', 'PATIENT');

        return request(app.getHttpServer())
            .get('/fhir/Practitioner/$my-patients')
            .set('Authorization', `Bearer ${patientAuth.accessToken}`)
            .expect(403);
    });
}); 