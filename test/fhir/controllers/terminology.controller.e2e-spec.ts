import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { AuthHelper } from '../../test-helpers/auth.helper';

describe('TerminologyController (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthHelper;
    let adminToken: string;
    let practitionerToken: string;
    let patientToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Setup authentication helper
        authHelper = new AuthHelper(app);

        // Create users with different roles
        const adminAuth = await authHelper.createUserAndLogin('test.admin@example.com', 'password', 'ADMIN');
        adminToken = adminAuth.accessToken;

        const practitionerAuth = await authHelper.createUserAndLogin('test.practitioner.term@example.com', 'password', 'PRACTITIONER');
        practitionerToken = practitionerAuth.accessToken;

        const patientAuth = await authHelper.createUserAndLogin('test.patient.term@example.com', 'password', 'PATIENT');
        patientToken = patientAuth.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should require authentication for terminology endpoints', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/validate-code')
            .expect(401);
    });

    it('should validate a code successfully', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/validate-code?system=http://hl7.org/fhir/administrative-gender&code=male')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('result');
                expect(res.body.result).toBeTruthy();
            });
    });

    it('should reject an invalid code', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/validate-code?system=http://hl7.org/fhir/administrative-gender&code=invalid-code')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('result');
                expect(res.body.result).toBeFalsy();
            });
    });

    it('should expand a value set', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/expand?url=http://hl7.org/fhir/ValueSet/administrative-gender')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('resourceType', 'ValueSet');
                expect(res.body).toHaveProperty('expansion');
                expect(res.body.expansion).toHaveProperty('contains');
                expect(Array.isArray(res.body.expansion.contains)).toBeTruthy();
                expect(res.body.expansion.contains.length).toBeGreaterThan(0);
            });
    });

    it('should support lookup of code details', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/lookup?system=http://hl7.org/fhir/administrative-gender&code=female')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('display', 'Female');
                expect(res.body).toHaveProperty('system', 'http://hl7.org/fhir/administrative-gender');
                expect(res.body).toHaveProperty('code', 'female');
            });
    });

    it('should find matching concepts with post request', async () => {
        const searchCriteria = {
            system: 'http://hl7.org/fhir/administrative-gender',
            searchText: 'ma',
        };

        return request(app.getHttpServer())
            .post('/fhir/terminology/find-matches')
            .set('Authorization', `Bearer ${practitionerToken}`)
            .send(searchCriteria)
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body.length).toBeGreaterThan(0);
                // Should find "male" concept
                const hasMaleConcept = res.body.some(concept =>
                    concept.code === 'male' &&
                    concept.system === 'http://hl7.org/fhir/administrative-gender'
                );
                expect(hasMaleConcept).toBeTruthy();
            });
    });

    // Test role-based access control
    it('should enforce role-based access control for terminology operations', () => {
        return request(app.getHttpServer())
            .get('/fhir/terminology/validate-code?system=http://hl7.org/fhir/administrative-gender&code=male')
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(403);
    });
}); 