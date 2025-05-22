import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

export class AuthHelper {
    private readonly jwtService: JwtService;

    constructor(private readonly app: INestApplication) {
        this.jwtService = app.get(JwtService);
    }

    /**
     * Creates a user with the specified role and returns a login token
     */
    async createUserAndLogin(email: string, password: string, role: string): Promise<{
        accessToken: string;
        userId: string;
        fhirResourceId: string;
    }> {
        // Create the user
        const createUserResponse = await request(this.app.getHttpServer())
            .post('/auth/register')
            .send({
                email,
                password,
                firstName: 'Test',
                lastName: 'User',
                role,
            });

        // If the user already exists, try to login directly
        if (createUserResponse.status !== 201) {
            const loginResponse = await request(this.app.getHttpServer())
                .post('/auth/login')
                .send({ email, password });

            if (loginResponse.status !== 200) {
                throw new Error(`Failed to login with existing user: ${loginResponse.body.message}`);
            }

            return {
                accessToken: loginResponse.body.accessToken,
                userId: loginResponse.body.userId,
                fhirResourceId: loginResponse.body.fhirResourceId,
            };
        }

        // Login with the newly created user
        const loginResponse = await request(this.app.getHttpServer())
            .post('/auth/login')
            .send({ email, password });

        if (loginResponse.status !== 200) {
            throw new Error(`Failed to login: ${loginResponse.body.message}`);
        }

        return {
            accessToken: loginResponse.body.accessToken,
            userId: loginResponse.body.userId,
            fhirResourceId: loginResponse.body.fhirResourceId,
        };
    }

    /**
     * Creates a test token with the specified role without creating a user
     * Useful when you just need to test authorization
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