# MediCare FHIR API Integration Testing

This document provides comprehensive guidance on running integration tests for the MediCare FHIR API application.

## Overview

The integration tests verify that all components of the system work correctly together, including:

1. Controllers for FHIR resources (Practitioner, Procedure, Terminology, Validation, Documentation)
2. Middleware for authorization and versioning
3. Exception filters for error handling
4. HAPI FHIR server integration
5. Role-based access control

## Prerequisites

Before running integration tests, ensure you have:

- **Docker and Docker Compose**: For running HAPI FHIR and MongoDB
- **Node.js and npm**: For running the NestJS application
- **curl**: For health checks

## Test Structure

Tests are organized by component in the `test/` directory:

```
test/
├── fhir/
│   ├── controllers/
│   │   ├── practitioner.controller.e2e-spec.ts
│   │   ├── procedure.controller.e2e-spec.ts
│   │   ├── terminology.controller.e2e-spec.ts
│   │   ├── validation.controller.e2e-spec.ts
│   │   └── documentation.controller.e2e-spec.ts
│   ├── filters/
│   │   └── fhir-exception.filter.e2e-spec.ts
│   └── middleware/
│       └── fhir-versioning.middleware.e2e-spec.ts
└── test-helpers/
    └── auth.helper.ts
```

## Running Tests

### Automated Test Script

The easiest way to run all integration tests is using the provided script:

```bash
npm run fhir:integration-test
```

This script:
1. Checks if HAPI FHIR and MongoDB containers are running, starting them if needed
2. Starts the NestJS API in test mode
3. Runs all integration tests
4. Cleans up resources
5. Optionally stops the containers when done

### Manual Testing

If you prefer to run tests manually:

1. Start the required containers:
   ```bash
   docker-compose up -d
   ```

2. Start the API in test mode:
   ```bash
   NODE_ENV=test npm run start:dev
   ```

3. Run specific tests:
   ```bash
   # All tests
   npm run test:e2e
   
   # Specific controller
   npm run test:e2e -- "practitioner.controller"
   
   # All controllers
   npm run test:e2e -- "controllers"
   ```

## Test Environment

The integration tests connect to:

- **HAPI FHIR Server**: Running on http://localhost:9090/fhir
- **MongoDB**: Running on mongodb://localhost:27017/medicare
- **NestJS API**: Running on http://localhost:3000

## Troubleshooting

If you encounter issues:

### API Startup Issues

If the API doesn't start correctly:
```bash
# Check API logs
cat api.log

# Check for TypeScript errors
npm run build
```

### Container Issues

If containers aren't working:
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs
```

### Database Issues

If tests fail due to database problems:
```bash
# Reset the database
docker-compose down -v
docker-compose up -d
```

## Adding New Tests

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Include tests for both success and error scenarios
3. Test role-based access control restrictions
4. Ensure proper cleanup of created resources
5. Verify FHIR compliance of responses

## CI/CD Integration

For continuous integration:

1. Add the following step to your CI pipeline:
   ```yaml
   - name: Run Integration Tests
     run: |
       docker-compose up -d
       npm run fhir:integration-test
   ```

2. Store test results as artifacts or publish them to your CI dashboard

## Resources

- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [HAPI FHIR Testing Resources](https://hapifhir.io/hapi-fhir/docs/server_jpa_run_in_tomcat.html)

For more detailed test documentation, see `test/INTEGRATION-TEST-GUIDE.md`. 