# API Testing Guide

This guide provides sample requests to test the FHIR EHR Platform API.

## Prerequisites

- The server is running (locally or deployed)
- You have an HTTP client (like Postman, cURL, or any REST client)
- You have sample FHIR resources from the `sample_resources` directory

## Important Notes

### Resource ID Requirements

When creating resources with specific IDs, ensure that the IDs contain at least one non-numeric character. The HAPI FHIR server does not allow client-assigned IDs that are purely numeric.

**Example:**
- ❌ Invalid: `"id": "123"`
- ✅ Valid: `"id": "res-123"` or `"id": "abc123"`

## Authentication

### Register a New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "practitioner@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "practitioner"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "email": "practitioner@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "practitioner",
      "fhirResourceId": "550e8400-e29b-41d4-a716-446655440000",
      "active": true,
      "createdAt": "2023-06-22T14:12:00.000Z",
      "updatedAt": "2023-06-22T14:12:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1..."
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "practitioner@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "email": "practitioner@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "practitioner",
      "fhirResourceId": "550e8400-e29b-41d4-a716-446655440000",
      "active": true,
      "lastLogin": "2023-06-22T15:30:45.000Z",
      "createdAt": "2023-06-22T14:12:00.000Z",
      "updatedAt": "2023-06-22T15:30:45.000Z"
    },
    "token": "eyJhbGciOiJIUzI1..."
  }
}
```

### Get Current User Profile

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "email": "practitioner@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "practitioner",
    "fhirResourceId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Access Codes

### Verify an Access Code

```http
POST /api/access-codes/verify
Content-Type: application/json

{
  "code": "ABC12345"
}
```

**Response (Valid Code):**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "role": "PRACTITIONER"
  }
}
```

**Response (Invalid Code):**

```json
{
  "success": false,
  "data": {
    "isValid": false
  },
  "message": "Invalid access code"
}
```

### Create an Access Code (Admin Only)

```http
POST /api/access-codes
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1...

{
  "role": "PRACTITIONER",
  "expiresAt": "2023-12-31T23:59:59.999Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c86",
    "code": "XYZ98765",
    "role": "PRACTITIONER",
    "expiresAt": "2023-12-31T23:59:59.999Z",
    "isUsed": false,
    "createdAt": "2023-06-22T14:12:00.000Z"
  }
}
```

### List Access Codes (Admin Only)

```http
GET /api/access-codes?page=1&limit=10&role=PRACTITIONER&isUsed=false
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "totalCount": 15,
  "totalPages": 2,
  "currentPage": 1,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c86",
      "code": "XYZ98765",
      "role": "PRACTITIONER",
      "expiresAt": "2023-12-31T23:59:59.999Z",
      "isUsed": false,
      "createdAt": "2023-06-22T14:12:00.000Z"
    },
    {
      "_id": "60d21b4667d0d8992e610c87",
      "code": "ABC12345",
      "role": "PRACTITIONER",
      "expiresAt": "2023-12-31T23:59:59.999Z",
      "isUsed": false,
      "createdAt": "2023-06-22T14:10:00.000Z"
    }
  ]
}
```

### Delete an Access Code (Admin Only)

```http
DELETE /api/access-codes/60d21b4667d0d8992e610c86
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```
HTTP/1.1 204 No Content
```

## FHIR Resources

### Create a Patient

```http
POST /api/fhir/Patient
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1...

{
  "resourceType": "Patient",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "555-123-4567",
      "use": "home"
    },
    {
      "system": "email",
      "value": "john.smith@example.com",
      "use": "home"
    }
  ],
  "gender": "male",
  "birthDate": "1970-01-25"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resourceType": "Patient",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "meta": {
      "versionId": "1",
      "lastUpdated": "2023-06-22T16:00:00.000Z"
    },
    "active": true,
    "name": [
      {
        "use": "official",
        "family": "Smith",
        "given": ["John"]
      }
    ],
    "telecom": [
      {
        "system": "phone",
        "value": "555-123-4567",
        "use": "home"
      },
      {
        "system": "email",
        "value": "john.smith@example.com",
        "use": "home"
      }
    ],
    "gender": "male",
    "birthDate": "1970-01-25"
  }
}
```

### Get a Patient

```http
GET /api/fhir/Patient/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resourceType": "Patient",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "meta": {
      "versionId": "1",
      "lastUpdated": "2023-06-22T16:00:00.000Z"
    },
    "active": true,
    "name": [
      {
        "use": "official",
        "family": "Smith",
        "given": ["John"]
      }
    ],
    "telecom": [
      {
        "system": "phone",
        "value": "555-123-4567",
        "use": "home"
      },
      {
        "system": "email",
        "value": "john.smith@example.com",
        "use": "home"
      }
    ],
    "gender": "male",
    "birthDate": "1970-01-25"
  }
}
```

### Search for Patients

```http
GET /api/fhir/Patient/search?family=Smith&gender=male
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resourceType": "Bundle",
    "type": "searchset",
    "total": 1,
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "meta": {
            "versionId": "1",
            "lastUpdated": "2023-06-22T16:00:00.000Z"
          },
          "active": true,
          "name": [
            {
              "use": "official",
              "family": "Smith",
              "given": ["John"]
            }
          ],
          "telecom": [
            {
              "system": "phone",
              "value": "555-123-4567",
              "use": "home"
            },
            {
              "system": "email",
              "value": "john.smith@example.com",
              "use": "home"
            }
          ],
          "gender": "male",
          "birthDate": "1970-01-25"
        }
      }
    ]
  }
}
```

### Create an Observation

```http
POST /api/fhir/Observation
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1...

{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ],
      "text": "Vital Signs"
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "85354-9",
        "display": "Blood pressure panel with all children optional"
      }
    ],
    "text": "Blood pressure panel"
  },
  "subject": {
    "reference": "Patient/550e8400-e29b-41d4-a716-446655440000"
  },
  "effectiveDateTime": "2023-06-15T09:30:10+01:00",
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8480-6",
            "display": "Systolic blood pressure"
          }
        ],
        "text": "Systolic blood pressure"
      },
      "valueQuantity": {
        "value": 120,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Diastolic blood pressure"
          }
        ],
        "text": "Diastolic blood pressure"
      },
      "valueQuantity": {
        "value": 80,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    }
  ]
}
```

## Creating FHIR Resources with Access Codes

### Create a Patient with Access Code

```http
POST /api/fhir/Patient/with-access-code
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1...

{
  "resourceType": "Patient",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "555-123-4567",
      "use": "home"
    }
  ],
  "gender": "male",
  "birthDate": "1970-01-25",
  "email": "patient@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resource": {
      "resourceType": "Patient",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "meta": {
        "versionId": "1",
        "lastUpdated": "2023-06-22T16:00:00.000Z"
      },
      "active": true,
      "name": [
        {
          "use": "official",
          "family": "Smith",
          "given": ["John"]
        }
      ],
      "telecom": [
        {
          "system": "phone",
          "value": "555-123-4567",
          "use": "home"
        },
        {
          "system": "email",
          "value": "patient@example.com",
          "use": "home"
        }
      ],
      "gender": "male",
      "birthDate": "1970-01-25"
    },
    "accessCode": "ABC12345"
  }
}
```

### Create a Practitioner with Access Code

```http
POST /api/fhir/Practitioner/with-access-code
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1...

{
  "resourceType": "Practitioner",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Williams",
      "given": ["Sarah"],
      "prefix": ["Dr."]
    }
  ],
  "gender": "female",
  "telecom": [
    {
      "system": "phone",
      "value": "555-987-6543",
      "use": "work"
    }
  ],
  "qualification": [
    {
      "code": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
            "code": "MD",
            "display": "Doctor of Medicine"
          }
        ],
        "text": "Doctor of Medicine"
      }
    }
  ],
  "email": "practitioner@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resource": {
      "resourceType": "Practitioner",
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "meta": {
        "versionId": "1",
        "lastUpdated": "2023-06-22T16:00:00.000Z"
      },
      "active": true,
      "name": [
        {
          "use": "official",
          "family": "Williams",
          "given": ["Sarah"],
          "prefix": ["Dr."]
        }
      ],
      "telecom": [
        {
          "system": "phone",
          "value": "555-987-6543",
          "use": "work"
        },
        {
          "system": "email",
          "value": "practitioner@example.com",
          "use": "work"
        }
      ],
      "gender": "female",
      "qualification": [
        {
          "code": {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
                "code": "MD",
                "display": "Doctor of Medicine"
              }
            ],
            "text": "Doctor of Medicine"
          }
        }
      ]
    },
    "accessCode": "XYZ98765"
  }
}
```

## ML Model Integration

### Get Available ML Models

```http
GET /api/ml/models
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "diabetes-risk",
      "name": "Diabetes Risk Predictor",
      "version": "1.0.0",
      "description": "Predicts 5-year risk of developing type 2 diabetes",
      "endpoint": "https://example.com/ml-models/diabetes-risk",
      "requiredResources": ["Patient", "Observation"]
    },
    {
      "id": "heart-disease-risk",
      "name": "Cardiovascular Risk Assessment",
      "version": "2.1.0",
      "description": "Estimates 10-year risk of heart disease based on clinical data",
      "endpoint": "https://example.com/ml-models/heart-disease-risk",
      "requiredResources": ["Patient", "Observation"]
    },
    {
      "id": "medication-recommendation",
      "name": "Medication Recommendation Engine",
      "version": "1.2.0",
      "description": "Suggests optimal medications based on patient history",
      "endpoint": "https://example.com/ml-models/medication-recommendation",
      "requiredResources": ["Patient", "Observation", "Medication", "Condition"]
    }
  ]
}
```

### Get Predictions

```http
POST /api/ml/predict/550e8400-e29b-41d4-a716-446655440000/diabetes-risk?storeResult=true
Authorization: Bearer eyJhbGciOiJIUzI1...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "model": {
      "id": "diabetes-risk",
      "name": "Diabetes Risk Predictor",
      "version": "1.0.0"
    },
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "predictions": {
      "riskScore": 0.15,
      "riskCategory": "Low",
      "explanation": [
        {
          "factor": "Age",
          "contribution": 0.05
        },
        {
          "factor": "BMI",
          "contribution": 0.07
        },
        {
          "factor": "BloodPressure",
          "contribution": 0.03
        }
      ],
      "recommendations": [
        "Maintain healthy weight",
        "Regular physical activity",
        "Balanced diet"
      ]
    },
    "timestamp": "2023-06-22T17:15:30.000Z"
  }
}
```

## Common Error Responses

### Authentication Error

```json
{
  "success": false,
  "message": "Not authorized"
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Invalid FHIR resource: must have at least one name"
}
```

### Not Found Error

```json
{
  "success": false,
  "message": "Error getting FHIR resource Patient/invalid-id: Not Found"
}
```

### Authorization Error

```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
``` 