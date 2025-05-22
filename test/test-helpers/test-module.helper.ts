import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DocumentationController } from '../../src/fhir/controllers/documentation.controller';
import { ValidationController } from '../../src/fhir/controllers/validation.controller';
import { HapiFhirAdapter } from '../../src/fhir/adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import appConfig from '../../src/config/app.config';
import fhirConfig from '../../src/config/fhir.config';

// Mock guard that always allows access
class MockJwtAuthGuard {
    canActivate() {
        return true;
    }
}

// Mock guard that always allows access regardless of roles
class MockRolesGuard {
    canActivate() {
        return true;
    }
}

// Mock HAPI FHIR adapter
class MockHapiFhirAdapter {
    async validate(resourceType: string, resource: any) {
        // Generate a simple validation response
        if (resource && resource.resourceType === resourceType) {
            // For a valid resource, return a positive outcome
            if (resource.name && resource.gender && resource.birthDate) {
                return {
                    resourceType: 'OperationOutcome',
                    issue: [
                        {
                            severity: 'information',
                            code: 'informational',
                            diagnostics: 'Resource validation successful'
                        }
                    ]
                };
            }
        }

        // For invalid resources, return errors
        return {
            resourceType: 'OperationOutcome',
            issue: [
                {
                    severity: 'error',
                    code: 'invalid',
                    diagnostics: 'Resource validation failed'
                }
            ]
        };
    }

    async getById(resourceType: string, id: string) {
        // Return a mock resource for testing
        return {
            resourceType,
            id,
            meta: {
                versionId: '1',
                lastUpdated: new Date().toISOString()
            }
        };
    }
}

/**
 * Creates a basic module for testing documentation controller
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, fhirConfig],
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('app.jwt.secret', 'testsecret'),
                signOptions: {
                    expiresIn: '1h',
                },
            }),
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('app.db.uri', 'mongodb://localhost:27017/medicare-test'),
            }),
        }),
    ],
    controllers: [DocumentationController],
})
export class DocumentationTestModule { }

/**
 * Creates a basic module for testing validation controller
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, fhirConfig],
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('app.jwt.secret', 'testsecret'),
                signOptions: {
                    expiresIn: '1h',
                },
            }),
        }),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('app.db.uri', 'mongodb://localhost:27017/medicare-test'),
            }),
        }),
    ],
    providers: [
        {
            provide: HapiFhirAdapter,
            useClass: MockHapiFhirAdapter,
        },
        {
            provide: JwtAuthGuard,
            useClass: MockJwtAuthGuard,
        },
        {
            provide: RolesGuard,
            useClass: MockRolesGuard,
        },
    ],
    controllers: [ValidationController],
})
export class ValidationTestModule { }

/**
 * Creates a test application with the documentation controller but no authentication
 */
export async function createDocTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [DocumentationTestModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    return app;
}

/**
 * Creates a test application with the validation controller but no authentication
 */
export async function createValidationTestApp(): Promise<INestApplication> {
    console.log('Creating validation test app...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ValidationTestModule],
    }).compile();

    console.log('Module compiled, creating NestApplication...');
    const app = moduleFixture.createNestApplication();

    console.log('Setting global prefix: api');
    app.setGlobalPrefix('api');

    // Log available routes before initialization
    console.log('Available routes before init:', app.getHttpServer);

    console.log('Initializing app...');
    await app.init();

    console.log('App initialized!');

    // Log all registered controllers and routes
    const controllers = moduleFixture.get(ValidationController);
    console.log('Controllers:', controllers);

    // Get all registered routes (Express specific)
    const httpAdapter = app.getHttpAdapter();
    try {
        // For Express adapter
        if (httpAdapter.constructor.name === 'ExpressAdapter') {
            const router = httpAdapter.getInstance()._router;
            if (router && router.stack) {
                const routes = router.stack
                    .filter(layer => layer.route)
                    .map(layer => {
                        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
                        return `${methods.join(',')} ${layer.route.path}`;
                    });
                console.log('Registered routes:', routes);
            }
        }
    } catch (e) {
        console.log('Error getting routes:', e.message);
    }

    return app;
} 