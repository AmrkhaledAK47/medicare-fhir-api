# FHIR API Integration Testing Guide

## Overview

This guide explains the integration testing approach for the MediCare FHIR API. The integration tests verify that all components of the system work correctly together, including:

- Controllers for FHIR resources
- Middleware for authorization and versioning
- Exception filters for error handling
- HAPI FHIR server integration
- Role-based access control

## Test Structure

The integration tests are organized by component:

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

## Test Coverage

The integration tests cover the following components:

### Controllers

| Controller | Features Tested | Coverage |
|------------|----------------|----------|
| PractitionerController | Get profile, patients, encounters, schedule | ✅ High |
| ProcedureController | CRUD operations, patient-specific operations | ✅ High |
| TerminologyController | Code validation, value set expansion, code lookup | ✅ High |
| ValidationController | Resource validation, instance validation, batch validation | ✅ High |
| DocumentationController | API documentation, examples, operations | ✅ High |

### Middleware and Filters

| Component | Features Tested | Coverage |
|-----------|----------------|----------|
| FhirVersioningMiddleware | Content type headers, ETags, conditional requests | ✅ High |
| FhirExceptionFilter | FHIR-compliant error responses, different error types | ✅ High |

### Cross-cutting Concerns

| Concern | Features Tested | Coverage |
|---------|----------------|----------|
| Authentication | JWT token validation, unauthorized access | ✅ High |
| Authorization | Role-based access control, resource permissions | ✅ High |
| FHIR Compliance | Resource formats, operations, search parameters | ✅ Medium |

## Running the Tests

### Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed
- MongoDB and HAPI FHIR server accessible (via Docker)

### Commands

To run all integration tests:

```bash
npm run fhir:integration-test
```

This script will:
1. Start the required containers if not already running
2. Start the NestJS API in test mode
3. Run the integration tests
4. Clean up resources

To run specific tests:

```bash
# Run only controller tests
npm run test:e2e -- "controllers"

# Run a specific controller test
npm run test:e2e -- "practitioner.controller"
```

## Test Environment

The integration tests use the following components:

- **HAPI FHIR Server**: Running in a Docker container on port 9090
- **MongoDB**: Running in a Docker container on port 27017
- **NestJS API**: Running in test mode on port 3000

The test environment is isolated from production environments and uses test-specific databases.

## Test Helpers

The `auth.helper.ts` provides utilities for:

- Creating test users with different roles
- Obtaining authentication tokens
- Simulating various authentication scenarios

## Troubleshooting

If tests are failing, check:

1. **Docker Containers**: Ensure HAPI FHIR and MongoDB containers are running
   ```bash
   docker ps
   ```

2. **API Logs**: Check the API logs for errors
   ```bash
   cat api.log
   ```

3. **Network Issues**: Verify the API can connect to HAPI FHIR and MongoDB
   ```bash
   curl http://localhost:9090/fhir/metadata
   ```

4. **Test Data**: Some tests may fail if the test data is modified by other tests. Run tests in isolation if needed.

## Adding New Tests

When adding new controller or middleware tests:

1. Follow the existing test structure
2. Ensure proper cleanup of created resources
3. Test role-based access control
4. Verify FHIR compliance of responses
5. Test error handling scenarios 