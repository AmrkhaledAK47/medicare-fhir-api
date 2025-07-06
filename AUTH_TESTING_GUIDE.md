# MediCare FHIR API Authentication and Permissions Testing Guide

This guide provides detailed instructions for testing the authentication flow and role-based permissions in the MediCare FHIR API.

## Prerequisites

- The MediCare FHIR API server is running (locally or deployed)
- An HTTP client like cURL, Postman, or Insomnia
- Basic understanding of FHIR resources and REST APIs

## 1. Authentication Testing

### 1.1. Admin Login

First, log in as an admin user to obtain a JWT token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}'
```

Save the returned token for subsequent requests:

```bash
export ADMIN_TOKEN="your_token_here"
```

### 1.2. Create Access Codes

As an admin, create access codes for new users:

```bash
# Create a practitioner access code
curl -X POST http://localhost:3000/api/access-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role": "PRACTITIONER", "expiresAt": "2030-12-31T23:59:59.999Z"}'

# Create a patient access code
curl -X POST http://localhost:3000/api/access-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role": "PATIENT", "expiresAt": "2030-12-31T23:59:59.999Z"}'
```

Save the returned access codes:

```bash
export PRACTITIONER_CODE="practitioner_code_here"
export PATIENT_CODE="patient_code_here"
```

### 1.3. Verify Access Codes

Test that the access codes can be verified:

```bash
curl -X POST http://localhost:3000/api/access-codes/verify \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$PRACTITIONER_CODE\"}"
```

### 1.4. Register New Users

Register users with the access codes:

```bash
# Register a practitioner
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test.practitioner@example.com\", \"password\": \"Practitioner123!\", \"firstName\": \"Test\", \"lastName\": \"Practitioner\", \"role\": \"PRACTITIONER\", \"accessCode\": \"$PRACTITIONER_CODE\"}"

# Register a patient
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test.patient@example.com\", \"password\": \"Patient123!\", \"firstName\": \"Test\", \"lastName\": \"Patient\", \"role\": \"PATIENT\", \"accessCode\": \"$PATIENT_CODE\"}"
```

### 1.5. Login as New Users

Log in with the newly created users:

```bash
# Login as practitioner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test.practitioner@example.com", "password": "Practitioner123!"}'

# Login as patient
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test.patient@example.com", "password": "Patient123!"}'
```

Save the returned tokens:

```bash
export PRACTITIONER_TOKEN="practitioner_token_here"
export PATIENT_TOKEN="patient_token_here"
```

### 1.6. Get User Profiles

Test that each user can access their own profile:

```bash
# Admin profile
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Practitioner profile
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"

# Patient profile
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

## 2. Admin Role Permission Testing

### 2.1. List All Users

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2.2. List All Patients

```bash
curl http://localhost:3000/api/fhir/Patient \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2.3. List All Practitioners

```bash
curl http://localhost:3000/api/fhir/Practitioner \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2.4. Create a Patient Resource

```bash
curl -X POST http://localhost:3000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "resourceType": "Patient",
    "id": "test-patient-1",
    "active": true,
    "name": [
      {
        "use": "official",
        "family": "Test",
        "given": ["Patient"]
      }
    ],
    "gender": "male",
    "birthDate": "1970-01-01"
  }'
```

### 2.5. Access Audit Events (Admin Only)

```bash
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 3. Practitioner Role Permission Testing

### 3.1. List Assigned Patients

```bash
curl http://localhost:3000/api/fhir/Patient \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"
```

### 3.2. Try to Access Admin Endpoints (Should Fail)

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"
```

### 3.3. Create an Observation for a Patient

```bash
curl -X POST http://localhost:3000/api/fhir/Observation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN" \
  -d '{
    "resourceType": "Observation",
    "status": "final",
    "code": {
      "text": "Blood Pressure"
    },
    "subject": {
      "reference": "Patient/test-patient-1"
    },
    "valueQuantity": {
      "value": 120,
      "unit": "mmHg"
    }
  }'
```

### 3.4. Try to Access Audit Events (Should Fail)

```bash
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"
```

## 4. Patient Role Permission Testing

### 4.1. Access Own Patient Record

```bash
# Replace patient-id with the actual ID of the patient resource linked to this user
curl http://localhost:3000/api/fhir/Patient/patient-id \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 4.2. Try to Access Another Patient's Record (Should Fail)

```bash
curl http://localhost:3000/api/fhir/Patient/test-patient-1 \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 4.3. Access Own Observations

```bash
# This should only return observations where the patient is the subject
curl http://localhost:3000/api/fhir/Observation?subject=Patient/patient-id \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 4.4. Try to Create an Observation for Another Patient (Should Fail)

```bash
curl -X POST http://localhost:3000/api/fhir/Observation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -d '{
    "resourceType": "Observation",
    "status": "final",
    "code": {
      "text": "Self-reported Blood Pressure"
    },
    "subject": {
      "reference": "Patient/test-patient-1"
    },
    "valueQuantity": {
      "value": 120,
      "unit": "mmHg"
    }
  }'
```

## 5. Cross-Role Resource Access Testing

### 5.1. Create a Test Resource as Admin

```bash
# Create an observation for a specific patient
curl -X POST http://localhost:3000/api/fhir/Observation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "resourceType": "Observation",
    "id": "test-observation-1",
    "status": "final",
    "code": {
      "text": "Test Observation"
    },
    "subject": {
      "reference": "Patient/test-patient-1"
    },
    "valueQuantity": {
      "value": 100,
      "unit": "mg/dL"
    }
  }'
```

### 5.2. Access the Resource as Different Roles

```bash
# As admin (should succeed)
curl http://localhost:3000/api/fhir/Observation/test-observation-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# As practitioner (should succeed if patient is assigned to this practitioner)
curl http://localhost:3000/api/fhir/Observation/test-observation-1 \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"

# As patient (should fail if not the subject of the observation)
curl http://localhost:3000/api/fhir/Observation/test-observation-1 \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

## 6. Testing Enhanced Authorization Features

### 6.1. Test Patient Compartment Access

```bash
# Create an encounter for a patient as admin
curl -X POST http://localhost:3000/api/fhir/Encounter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "resourceType": "Encounter",
    "id": "test-encounter-1",
    "status": "finished",
    "class": {
      "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      "code": "AMB",
      "display": "ambulatory"
    },
    "subject": {
      "reference": "Patient/test-patient-1"
    }
  }'

# Test if the patient can access their own encounter
curl http://localhost:3000/api/fhir/Encounter/test-encounter-1 \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 6.2. Test Practitioner-Patient Assignment

```bash
# Create a patient with a general practitioner reference
curl -X POST http://localhost:3000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "resourceType": "Patient",
    "id": "test-patient-2",
    "active": true,
    "name": [
      {
        "use": "official",
        "family": "Test",
        "given": ["Patient2"]
      }
    ],
    "generalPractitioner": [
      {
        "reference": "Practitioner/practitioner-id"
      }
    ]
  }'

# Test if the practitioner can access this patient
curl http://localhost:3000/api/fhir/Patient/test-patient-2 \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN"
```

## 7. Testing Audit Logging

### 7.1. Generate Some Activity

Perform several operations with different users to generate audit logs:

```bash
# Admin reads a patient
curl http://localhost:3000/api/fhir/Patient/test-patient-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Practitioner creates an observation
curl -X POST http://localhost:3000/api/fhir/Observation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRACTITIONER_TOKEN" \
  -d '{
    "resourceType": "Observation",
    "status": "final",
    "code": {
      "text": "Heart Rate"
    },
    "subject": {
      "reference": "Patient/test-patient-1"
    },
    "valueQuantity": {
      "value": 72,
      "unit": "beats/min"
    }
  }'

# Patient reads their own record
curl http://localhost:3000/api/fhir/Patient/patient-id \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 7.2. View Audit Logs as Admin

```bash
# Get all recent audit events
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get audit events for a specific user
curl http://localhost:3000/api/audit/user/practitioner-user-id \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get audit events for a specific resource
curl http://localhost:3000/api/audit/resource/Patient/test-patient-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 8. Automated Testing

For automated testing, use the provided script:

```bash
# Make the script executable
chmod +x test_auth_and_permissions.sh

# Run the tests
./test_auth_and_permissions.sh
```

The script will:
1. Login as admin
2. Create access codes
3. Register test users
4. Test permissions for each role
5. Report test results

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that your token is valid and not expired
2. **403 Forbidden**: The user doesn't have permission for the requested resource
3. **404 Not Found**: The resource doesn't exist or the user doesn't have access to it

### Debugging Tips

1. Check the server logs for detailed error messages
2. Examine the audit logs for failed access attempts
3. Verify that the user is assigned the correct role
4. For practitioners, ensure they are properly linked to patients

## Next Steps

After testing the basic authentication and permissions functionality, consider:

1. Implementing SMART on FHIR authorization for third-party apps
2. Adding more fine-grained permissions using FHIR Consent resources
3. Setting up automated security testing with tools like OWASP ZAP
4. Implementing rate limiting to prevent abuse 