# Integration Testing Issues and Solutions

## Issues Identified

1. **Authentication Middleware**: The FHIR API has authentication middleware that intercepts requests, causing 401 Unauthorized errors during tests.

2. **Global Prefix**: The application uses a global prefix `/api`, which needs to be included in test requests.

3. **Controller Path Conflicts**: Some controllers define their own path prefixes (e.g., `/fhir`), which combined with the global prefix creates `/api/fhir`.

4. **Parameter Decorators**: Some controller methods use `@Param()` decorators but weren't properly extracting parameters from URLs.

5. **External Dependencies**: Tests were relying on actual MongoDB and HAPI FHIR servers, making them brittle and environment-dependent.

## Solutions Implemented

### 1. Custom Test Modules

Created standalone test modules that:
- Import only the necessary configurations and controllers
- Mock out authentication guards and middleware
- Use in-memory test databases where possible

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, fhirConfig],
    }),
    JwtModule.registerAsync({...}),
    HttpModule.register({...}),
    MongooseModule.forRootAsync({...}),
  ],
  providers: [
    {
      provide: HapiFhirAdapter,
      useClass: MockHapiFhirAdapter, // Mock implementation
    },
    {
      provide: JwtAuthGuard, 
      useValue: { canActivate: () => true }, // Bypass authentication
    },
    {
      provide: RolesGuard,
      useValue: { canActivate: () => true }, // Bypass role checks
    },
  ],
  controllers: [ValidationController],
})
export class ValidationTestModule {}
```

### 2. Fixed Endpoint URLs in Tests

Ensured all test requests include the global prefix and controller prefixes:

```typescript
// Correct
request(app.getHttpServer())
  .get('/api/fhir/documentation')
  .expect(200);

// Incorrect
request(app.getHttpServer())
  .get('/fhir/documentation')
  .expect(200);
```

### 3. Fixed Controller Parameter Handling

Updated controller methods to correctly capture URL parameters:

```typescript
// Before
getExample(@Res() res: Response, resourceType: string) {...}

// After
getExample(@Param('resourceType') resourceType: string, @Res() res: Response) {...}
```

### 4. Updated Integration Test Script

Updated the script to use correct endpoint URLs and provide better error handling:

```bash
#!/bin/bash
# Add proper API prefix in health checks
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "API is ready!"
  break
fi
```

## Best Practices

1. **Use Simplified Test Modules**: Create test-specific modules that only include what's necessary for testing.

2. **Mock External Services**: Use mock implementations for external services like HAPI FHIR.

3. **Bypass Authentication**: Override authentication guards in test modules to avoid 401 errors.

4. **Remember Global Prefixes**: Include all prefixes in your test requests.

5. **Test in Isolation**: Each test should be self-contained and not rely on external state.

## Moving Forward

1. Update all remaining tests to use the new approach
2. Add more test coverage for error cases and edge conditions
3. Implement CI/CD pipeline integration for automated testing
4. Add performance tests for critical endpoints 