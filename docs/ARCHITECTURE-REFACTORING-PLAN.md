# MediCare API Refactoring Plan

## Current Architecture Analysis

The current architecture uses a hybrid approach where:

1. **Some FHIR resources** are stored in MongoDB
2. **Some FHIR resources** are proxied to an external HAPI FHIR server
3. A custom permission system controls access to resources
4. Resource types are scattered across multiple endpoints with overlapping functionality

### Issues with Current Architecture

1. **Inefficient Use of HAPI FHIR:** The application isn't leveraging HAPI FHIR's powerful features (search, validation, terminology services)
2. **Duplicated Logic:** Similar code is repeated across multiple controllers and services
3. **Inconsistent Endpoints:** Resources are accessible through both generic and specific endpoints
4. **Limited FHIR Compliance:** Many advanced FHIR operations aren't supported
5. **Redundant Storage:** Some resources are stored in both MongoDB and HAPI FHIR
6. **Complex Synchronization:** Keeping data in sync between MongoDB and HAPI FHIR requires complex logic

## Proposed Architecture

### 1. Core Architectural Choices

#### Option A: HAPI FHIR as the Primary Datastore
- Use HAPI FHIR server as the authoritative storage for all FHIR resources
- MongoDB only stores user authentication/authorization data
- All FHIR operations delegated to HAPI FHIR

#### Option B: Hybrid Approach with Better Integration
- Clearly define which resources are stored in MongoDB vs. HAPI FHIR
- Establish consistent patterns for resource access and modification
- Implement proper synchronization between datastores

**Recommendation:** Option A is preferred for better FHIR compliance and reduced complexity

### 2. Component Architecture

#### FHIR Module Structure

```
fhir/
├── adapters/               # Adapters to external systems
│   ├── hapi-fhir.adapter.ts     # HAPI FHIR server adapter
│   └── terminology.adapter.ts   # Terminology service adapter
├── interceptors/           # Request/response interceptors
│   ├── fhir-validation.interceptor.ts
│   └── audit-trail.interceptor.ts
├── controllers/            # Resource-specific controllers
│   ├── base-resource.controller.ts  # Base controller with common CRUD
│   ├── patient.controller.ts
│   └── ...
├── services/               # Resource-specific services
│   ├── base-resource.service.ts  # Base service with common logic
│   ├── patient.service.ts
│   └── ...
├── middleware/             # Custom middleware
│   ├── fhir-authorization.middleware.ts
│   └── resource-validation.middleware.ts
├── dto/                    # Data transfer objects
├── interfaces/             # TypeScript interfaces
└── utils/                  # FHIR-specific utilities
```

#### Security Layer

```
auth/
├── guards/
│   ├── fhir-scopes.guard.ts      # OAuth2 scope-based authorization
│   └── resource-access.guard.ts  # Resource-level access control
├── services/
│   └── permission.service.ts     # FHIR-specific permission checking
└── decorators/
    └── require-scope.decorator.ts
```

### 3. Data Flow Architecture

1. **Resource Request Flow**
   - Request → NestJS → Authorization Guard → HAPI FHIR Adapter → HAPI FHIR Server → Response

2. **Permission Checking**
   - Implement as middleware/guard before request reaches controllers
   - Use JWT claims and resource metadata to determine access rights

3. **Search Operations**
   - Leverage HAPI FHIR's powerful search capabilities
   - Implement custom search parameter mapping for complex queries

## Implementation Plan

### Phase 1: HAPI FHIR Integration Enhancement

1. Create a dedicated `HapiFhirAdapter` service:
   - Implement full FHIR REST API support (CRUD, search, operations)
   - Handle proper error mapping
   - Add request/response logging

2. Update the configuration:
   - Move HAPI FHIR connection settings to a dedicated configuration module
   - Support different FHIR server environments (dev, test, prod)

3. Implement proper FHIR resource validation:
   - Leverage HAPI FHIR's validation API
   - Add custom validation rules where needed

### Phase 2: API Reorganization

1. Standardize controller architecture:
   - Implement a base controller with common CRUD operations
   - Organize endpoints by resource type
   - Ensure consistent naming and parameter handling

2. Create a unified endpoint structure:
   - `/fhir/{resourceType}` - FHIR standard operations
   - `/fhir/{resourceType}/_history` - Version history
   - `/fhir/{resourceType}/_search` - Advanced search
   - `/fhir/metadata` - Capability statement

3. Implement FHIR operations:
   - `$everything` - Get all related resources
   - `$validate` - Validate resources
   - Other standard FHIR operations

### Phase 3: Security Model Enhancement

1. Implement SMART on FHIR compliant security:
   - OAuth2/OpenID Connect integration
   - Scope-based authorization
   - JWT-based authentication

2. Enhance permission model:
   - Resource-level permissions
   - Compartment-based access control
   - Break-the-glass emergency access

### Phase 4: Advanced Features

1. Implement subscription support:
   - Webhook-based notifications
   - REST Hook subscriptions
   - Websocket support for real-time updates

2. Add terminology services integration:
   - Code system validation
   - Value set expansion
   - Concept translation

## Migration Strategy

1. **Data Migration**
   - Create scripts to migrate MongoDB FHIR resources to HAPI FHIR
   - Validate data integrity after migration
   - Implement rollback capabilities

2. **API Version Transition**
   - Maintain backward compatibility during transition
   - Implement API versioning
   - Provide clear documentation on migration path

3. **Testing Strategy**
   - Create comprehensive test suite for new architecture
   - Implement integration tests with HAPI FHIR
   - Performance testing comparison

## Performance Considerations

1. **Caching Strategy**
   - Implement HTTP caching headers
   - Consider Redis for frequently accessed resources
   - Cache invalidation on resource updates

2. **Search Optimization**
   - Leverage HAPI FHIR's search capabilities
   - Use appropriate indices
   - Consider Elasticsearch integration for full-text search

3. **Bulk Operations**
   - Implement FHIR Bulk Data Access API
   - Batch processing for large datasets
   - Asynchronous processing for long-running operations 