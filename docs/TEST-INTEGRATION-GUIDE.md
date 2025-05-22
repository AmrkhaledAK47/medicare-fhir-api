# Integration Testing Guide

This guide explains how to set up, run, and troubleshoot integration tests for the MediCare FHIR API.

## Prerequisites

Before running integration tests, make sure you have:

1. Docker installed and running
2. Node.js v16+ installed
3. The project dependencies installed (`npm install`)
4. MongoDB and HAPI FHIR containers running

## Test Infrastructure

Our integration tests use:

- Jest as the test runner
- Supertest for HTTP assertions
- NestJS testing utilities
- Custom test helpers for authentication and setup

## Setting Up Integration Tests

### Creating a Standalone Test Module

For controllers that require minimal dependencies, we use a custom test module:

```typescript
// test/test-helpers/test-module.helper.ts
import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import appConfig from '../../src/config/app.config';
import fhirConfig from '../../src/config/fhir.config';

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
        signOptions: { expiresIn: '1h' },
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
  controllers: [/* Add your controller here */],
})
export class TestModule {}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TestModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  
  return app;
}
```

### Handling Authentication in Tests

For endpoints that require authentication, use the `AuthHelper`:

```typescript
// test/test-helpers/auth.helper.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

export class AuthHelper {
    private readonly jwtService: JwtService;

    constructor(private readonly app: INestApplication) {
        this.jwtService = app.get(JwtService);
    }

    // Create a test token without needing a database user
    createTestToken(userId: string, role: string, fhirResourceId?: string): string {
        return this.jwtService.sign({
            sub: userId,
            email: `test-${userId}@example.com`,
            role,
            fhirResourceId: fhirResourceId || `test-resource-${userId}`,
        });
    }
}
```

## Writing Tests with Authentication

```typescript
describe('ResourceController (e2e)', () => {
    let app: INestApplication;
    let authHelper: AuthHelper;
    let adminToken: string;

    beforeAll(async () => {
        // Set up app - either with full AppModule or minimal TestModule
        app = await createTestApp(); // or using AppModule
        
        // Create auth helper and generate admin token
        authHelper = new AuthHelper(app);
        adminToken = authHelper.createTestToken('admin-test-id', 'ADMIN');
    });

    afterAll(async () => {
        await app.close();
    });

    it('should access a protected endpoint', () => {
        return request(app.getHttpServer())
            .get('/api/protected-endpoint')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
    });
});
```

## Testing Different User Roles

Create tokens for different roles to test authorization:

```typescript
const adminToken = authHelper.createTestToken('admin-id', 'ADMIN');
const practitionerToken = authHelper.createTestToken('practitioner-id', 'PRACTITIONER', 'practitioner-resource-id');
const patientToken = authHelper.createTestToken('patient-id', 'PATIENT', 'patient-resource-id');

// Then in tests
it('should allow admin access', () => {
    return request(app.getHttpServer())
        .get('/api/admin-only-endpoint')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
});

it('should deny patient access', () => {
    return request(app.getHttpServer())
        .get('/api/admin-only-endpoint')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
});
```

## Running the Tests

Run a specific test file:

```bash
npm run test:e2e -- path/to/test-file
```

Run all integration tests:

```bash
npm run test:e2e
```

Use the integration test runner script for full environment tests:

```bash
./run-integration-tests.sh
```

## Troubleshooting Integration Tests

### Authentication Issues

- Verify JWT secret in test environment
- Check token expiration
- Ensure proper roles in test tokens

### API URL Issues

- Remember the global `/api` prefix in tests
- Use correct FHIR resource paths

### Middleware Issues

For testing controllers that use middleware:
- Create a test module that doesn't apply the middleware, or
- Create a custom test middleware that skips authentication in test mode

## Best Practices

1. Use **isolated tests** when possible to avoid database dependencies
2. Always clean up test data in the `afterAll` or `afterEach` blocks
3. Mock external services like HAPI FHIR when not testing integration with them
4. Use descriptive error messages in assertions
5. Test both success and failure scenarios

## Fixing Common Testing Issues

### Controller Method Parameters

When testing controllers that use `@Param()`, ensure your test routes include the parameters in the correct format:

```typescript
// In controller
@Get('examples/:resourceType')
getExample(@Param('resourceType') resourceType: string) {...}

// In test
request(app.getHttpServer())
  .get('/api/fhir/documentation/examples/Patient')
  .expect(200);
```

### Global Prefix

Remember that our application uses a global prefix of `/api` for all routes:

```typescript
app.setGlobalPrefix('api');
```

Make sure your test requests include this prefix:

```typescript
// Correct
request(app.getHttpServer()).get('/api/fhir/Patient');

// Incorrect
request(app.getHttpServer()).get('/fhir/Patient');
```

### Bypassing Authentication

To test endpoints that require authentication without complicated setup:

1. Create a simplified test module
2. Override guards directly in the test module

```typescript
// In test-module.helper.ts
@Module({
  providers: [
    {
      provide: JwtAuthGuard,
      useValue: { canActivate: () => true }, // Bypass authentication
    },
    {
      provide: RolesGuard,
      useValue: { canActivate: () => true }, // Bypass role check
    },
    // Your actual services
  ],
  controllers: [YourController],
})
export class TestModule {}
```

## Updating Integration Test Script

To ensure our integration tests run correctly, update the `run-integration-tests.sh` script:

```bash
#!/bin/bash
# Add proper API prefix in health checks
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "API is ready!"
  break
fi

# Add proper error handling
if [ $exit_code -ne 0 ]; then
  echo "Tests failed with exit code $exit_code"
  # Clean up resources if needed
fi
```

Make these changes to ensure our integration tests:
1. Use the correct API endpoints
2. Provide clear error messages
3. Clean up properly after running 