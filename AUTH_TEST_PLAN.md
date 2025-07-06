# Authentication and Role-Based Permission Testing Plan

## Overview

This document outlines a comprehensive testing strategy for the MediCare FHIR API's authentication flow and role-based permission system. The tests verify that the three user roles (admin, practitioner, and patient) have appropriate access to resources according to their defined permissions.

## Test Environment

- **Base URL**: http://localhost:3000/api
- **Test Users**:
  - Admin: admin@example.com / Admin123!
  - Test Practitioner: test.practitioner@example.com / Practitioner123!
  - Test Patient: test.patient@example.com / Patient123!

## Test Categories

### 1. Authentication Flow

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|----------------|
| AUTH-01 | Admin Login | Login with admin credentials | Successful login, valid JWT token returned |
| AUTH-02 | Access Code Creation | Admin creates access code for new user | Access code successfully created |
| AUTH-03 | Access Code Verification | Verify the access code is valid | Code verification returns isValid: true |
| AUTH-04 | User Registration | Register new users with access codes | Users successfully registered |
| AUTH-05 | User Login | Login with newly created user credentials | Successful login, valid JWT token returned |
| AUTH-06 | Profile Access | Each user accesses their own profile | Profile data returned with correct role |

### 2. Admin Role Permissions

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|----------------|
| ADMIN-01 | List All Users | Admin retrieves list of all users | Complete list of users returned |
| ADMIN-02 | List All Patients | Admin retrieves all patient resources | All patient resources returned |
| ADMIN-03 | List All Practitioners | Admin retrieves all practitioner resources | All practitioner resources returned |
| ADMIN-04 | Create Resources | Admin creates new FHIR resources | Resources successfully created |
| ADMIN-05 | Update Resources | Admin updates existing resources | Resources successfully updated |
| ADMIN-06 | Delete Resources | Admin deletes resources | Resources successfully deleted |

### 3. Practitioner Role Permissions

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|----------------|
| PRACT-01 | List Assigned Patients | Practitioner retrieves assigned patients | Only assigned patients returned |
| PRACT-02 | Admin Access Attempt | Practitioner attempts to access admin endpoints | Access denied with 403 Forbidden |
| PRACT-03 | Create Clinical Resources | Practitioner creates observations for patients | Resources successfully created |
| PRACT-04 | Access Patient Data | Practitioner accesses data for assigned patients | Data successfully retrieved |
| PRACT-05 | Access Unassigned Patient | Practitioner attempts to access unassigned patient | Access denied or empty results |

### 4. Patient Role Permissions

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|----------------|
| PAT-01 | View Own Record | Patient accesses their own record | Own record successfully retrieved |
| PAT-02 | View Other Patient | Patient attempts to access another patient's record | Access denied or empty results |
| PAT-03 | Admin Access Attempt | Patient attempts to access admin endpoints | Access denied with 403 Forbidden |
| PAT-04 | View Own Observations | Patient accesses observations linked to them | Own observations successfully retrieved |
| PAT-05 | Create/Update Attempt | Patient attempts to create/update clinical data | Access denied or limited to allowed resources |

### 5. Cross-Role Resource Access

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|----------------|
| CROSS-01 | Admin Creates Observation | Admin creates observation for patient | Observation successfully created |
| CROSS-02 | Practitioner Access | Practitioner accesses the observation | Access granted if for assigned patient |
| CROSS-03 | Patient Access | Patient accesses the observation | Access granted if it's their own observation |

## Implementation Details

### Authentication Mechanism

The MediCare FHIR API uses JWT (JSON Web Tokens) for authentication. The token contains:
- User ID
- User role (admin, practitioner, patient)
- Token expiration time

### Permission Implementation

Permissions are enforced through:
1. **NestJS Guards**: Role-based guards that check user roles for each endpoint
2. **Resource Filtering**: Service-level filtering based on user role and relationships
3. **FHIR Authorization Middleware**: Custom middleware that enforces FHIR-specific access rules

### HAPI FHIR Integration

The MediCare API integrates with HAPI FHIR server and leverages its capabilities for:
- Resource validation
- Search functionality
- Version tracking

However, role-based permissions are implemented at the API layer rather than delegating to HAPI FHIR.

## Test Execution

The tests are automated using a Bash script (`test_auth_and_permissions.sh`) that:
1. Creates test users with appropriate roles
2. Authenticates users and obtains JWT tokens
3. Tests various endpoints with different user tokens
4. Verifies that permissions are correctly enforced
5. Reports test results with pass/fail status

## Recommendations for Enhancement

Based on HAPI FHIR documentation and best practices, consider these enhancements:

1. **Implement Consent Resources**: Use FHIR Consent resources to manage fine-grained access control
2. **Audit Logging**: Implement comprehensive audit logging using FHIR AuditEvent resources
3. **Smart-on-FHIR Authorization**: Consider implementing the SMART on FHIR OAuth 2.0 profiles
4. **Compartment-Based Access**: Use FHIR Compartments for more efficient patient-specific access control
5. **Attribute-Based Access Control**: Implement ABAC for more flexible permission management beyond role-based controls

## References

- [HAPI FHIR Security Documentation](https://hapifhir.io/hapi-fhir/docs/security/introduction.html)
- [HL7 FHIR Security and Privacy Module](https://www.hl7.org/fhir/secpriv-module.html)
- [SMART on FHIR Authorization](http://hl7.org/fhir/smart-app-launch/) 