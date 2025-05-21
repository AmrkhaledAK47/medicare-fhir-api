# MediCare FHIR API Role-Based Permissions

This document provides a detailed overview of the role-based permissions in the MediCare FHIR API system.

## Overview of Roles

| Role          | Description                                                               |
|---------------|---------------------------------------------------------------------------|
| Admin         | System administrators with full access to all resources and functionality  |
| Practitioner  | Healthcare providers with access to patient data and clinical resources    |
| Patient       | End users with restricted access to their own medical records              |

## Permission Matrix

### FHIR Resource Access

| Resource Type      | Admin              | Practitioner                  | Patient                         |
|--------------------|--------------------|------------------------------ |--------------------------------|
| Patient            | Create, Read, Update, Delete | Read (assigned patients), Create | Read (own record only)          |
| Practitioner       | Create, Read, Update, Delete | Read (own record + colleagues)  | Read (assigned practitioners)    |
| Organization       | Create, Read, Update, Delete | Read                           | Read                            |
| Encounter          | Create, Read, Update, Delete | Create, Read, Update (assigned) | Read (own encounters)           |
| Observation        | Create, Read, Update, Delete | Create, Read, Update (assigned) | Read (own observations)         |
| DiagnosticReport  | Create, Read, Update, Delete | Create, Read, Update (assigned) | Read (own reports)              |
| Medication        | Create, Read, Update, Delete | Create, Read                    | Read (own medications)          |
| MedicationRequest | Create, Read, Update, Delete | Create, Read, Update (assigned) | Read (own medication requests)   |
| Questionnaire     | Create, Read, Update, Delete | Create, Read                    | Read (assigned questionnaires)   |
| QuestionnaireResponse | Create, Read, Update, Delete | Create, Read (assigned)      | Create, Read (own responses)     |
| Payment           | Create, Read, Update, Delete | Read (assigned patients)       | Read (own payments)              |
| DocumentReference | Create, Read, Update, Delete | Create, Read, Update (assigned) | Read (own documents)            |

### Administrative Functions

| Function                  | Admin | Practitioner | Patient |
|---------------------------|-------|--------------|---------|
| User Management           | ✅    | ❌           | ❌      |
| Role Assignment           | ✅    | ❌           | ❌      |
| System Configuration      | ✅    | ❌           | ❌      |
| Audit Log Access          | ✅    | ❌           | ❌      |
| Analytics Dashboard       | ✅    | ✅ (Limited)  | ❌      |

## Implementation Details

### Access Control Mechanisms

1. **JWT Authentication**
   - All API requests must include a valid JWT token
   - Tokens contain user ID, role, and permissions
   - Tokens expire after a configurable time period

2. **Role-Based Guards**
   - NestJS guards validate user roles for each endpoint
   - Example: `@Roles(Role.ADMIN)` decorator restricts endpoint to admin users

3. **Resource-Level Permissions**
   - Each resource request is filtered based on user role and relationship
   - Example: Patients can only access their own encounters

### Code Examples

#### Controller Role Restrictions

```typescript
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  // Only accessible to admins
  @Get('users')
  getAllUsers() {
    // Implementation
  }
}
```

#### Service-Level Filtering

```typescript
@Injectable()
export class PatientService extends BaseResourceService {
  async findAll(userId: string, userRole: Role) {
    // Admin can see all patients
    if (userRole === Role.ADMIN) {
      return super.findAll({});
    }
    
    // Practitioners can see assigned patients
    if (userRole === Role.PRACTITIONER) {
      return this.findPatientsByPractitioner(userId);
    }
    
    // Patients can only see their own record
    if (userRole === Role.PATIENT) {
      return super.findById(userId);
    }
  }
}
```

## User Experience by Role

### Admin Experience

Admins have access to:
- Complete system configuration
- User management portal
- Comprehensive analytics
- All patient records
- Audit logs and security settings

### Practitioner Experience

Practitioners have access to:
- Their assigned patients' records
- Clinical documentation tools
- Ordering and prescribing capabilities
- Limited analytics for their patient population
- Collaboration tools with other practitioners

### Patient Experience

Patients have access to:
- Their own health records
- Appointment scheduling
- Medication lists and refill requests
- Secure messaging with practitioners
- Health questionnaires and forms

## Audit and Compliance

All access to protected health information (PHI) is logged with:
- User ID
- Role
- Action performed
- Resource accessed
- Timestamp
- IP address

Audit logs are maintained for compliance with:
- HIPAA requirements
- GDPR (for applicable jurisdictions)
- Other relevant healthcare regulations

## Best Practices

1. **Principle of Least Privilege**
   - Users are granted the minimum permissions necessary for their role
   - Special elevated permissions require additional authorization

2. **Regular Permission Reviews**
   - Admin should periodically review user roles and permissions
   - Automated alerts for suspicious access patterns

3. **Secure Defaults**
   - New resources default to restricted access
   - Explicit sharing actions required for collaboration

4. **Contextual Access**
   - Access may be further restricted based on context (location, time, etc.)
   - Break-glass procedures available for emergency access 