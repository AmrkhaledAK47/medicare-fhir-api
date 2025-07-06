# MediCare FHIR API - Admin Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Admin Permissions](#admin-permissions)
4. [Patient Management](#patient-management)
5. [Practitioner Management](#practitioner-management)
6. [Organization Management](#organization-management)
7. [Encounter Management](#encounter-management)
8. [Observation Management (Lab Tests)](#observation-management-lab-tests)
9. [Diagnostic Report Management](#diagnostic-report-management)
10. [Questionnaire Management](#questionnaire-management)
11. [Data Export](#data-export)
12. [Seeding the System](#seeding-the-system)
13. [Error Handling](#error-handling)

## Introduction

This documentation provides a comprehensive guide for the frontend team on how to interact with the MediCare FHIR API as an administrator. Administrators have full access to all resources in the system and can perform CRUD operations on patients, practitioners, organizations, encounters, observations, diagnostic reports, and questionnaires.

## Authentication

### Admin Login

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "Admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123456789",
      "name": "Admin User",
      "email": "admin@test.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### Using the Token

Include the token in the `Authorization` header of all subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Admin Permissions

Administrators have full access to all resources in the system. They can:

- Create, read, update, and delete all FHIR resources
- Manage users and assign roles
- Access system statistics and configuration
- Export data in various formats

## Patient Management

### Get All Patients

```
GET /api/fhir/Patient
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Field to sort by (default: 'createdAt')
- `sortDirection`: 'asc' or 'desc' (default: 'desc')
- `name`: Filter by patient name (supports partial matching)
- `gender`: Filter by gender ('male', 'female', 'other', 'unknown')
- `birthdate`: Filter by birthdate (YYYY-MM-DD)
- `identifier`: Filter by identifier

**Response:**
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 25,
  "link": [
    {
      "relation": "self",
      "url": "http://localhost:3000/api/fhir/Patient?_count=10&_getpagesoffset=0"
    },
    {
      "relation": "next",
      "url": "http://localhost:3000/api/fhir/Patient?_count=10&_getpagesoffset=10"
    }
  ],
  "entry": [
    {
      "fullUrl": "http://localhost:3000/api/fhir/Patient/123",
      "resource": {
        "resourceType": "Patient",
        "id": "123",
        "active": true,
        "name": [
          {
            "use": "official",
            "family": "Smith",
            "given": ["John"]
          }
        ],
        "gender": "male",
        "birthDate": "1980-06-15"
      }
    },
    // More patients...
  ]
}
```

### Advanced Search for Patients

```
GET /api/fhir/Patient/search
```

**Query Parameters:**
- `name`: Patient name to search for
- `identifier`: Patient identifier
- `gender`: Patient gender (male, female, other, unknown)
- `birthdate`: Birth date in YYYY-MM-DD format
- `page`: Page number (0-based)
- `size`: Page size

### Get Patient by ID

```
GET /api/fhir/Patient/{id}
```

**Response:**
```json
{
  "resourceType": "Patient",
  "id": "123",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1980-06-15",
  "address": [
    {
      "use": "home",
      "type": "physical",
      "line": ["123 Main St"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701"
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
      "use": "work"
    }
  ]
}
```

### Create Patient

```
POST /api/fhir/Patient
```

**Request Body:**
```json
{
  "resourceType": "Patient",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Doe",
      "given": ["Jane"]
    }
  ],
  "gender": "female",
  "birthDate": "1985-10-25",
  "address": [
    {
      "use": "home",
      "type": "physical",
      "line": ["456 Elm St"],
      "city": "Anytown",
      "state": "CA",
      "postalCode": "90210"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "555-555-5555",
      "use": "home"
    },
    {
      "system": "email",
      "value": "jane.doe@example.com",
      "use": "work"
    }
  ]
}
```

### Update Patient

```
PUT /api/fhir/Patient/{id}
```

**Request Body:** Same format as create, but must include the ID that matches the URL parameter.

### Delete Patient

```
DELETE /api/fhir/Patient/{id}
```

### Get Patient Summary Statistics

```
GET /api/fhir/Patient/$summary
```

**Response:**
```json
{
  "totalPatients": 25,
  "genderDistribution": {
    "male": 12,
    "female": 13,
    "other": 0
  }
}
```

### Get All Data for a Patient

```
GET /api/fhir/Patient/{id}/$everything
```

This endpoint returns all data associated with a patient, including encounters, observations, medications, and conditions.

## Practitioner Management

### Get All Practitioners

```
GET /api/fhir/Practitioner
```

**Query Parameters:** Same as for patients.

### Get Practitioner by ID

```
GET /api/fhir/Practitioner/{id}
```

### Create Practitioner

```
POST /api/fhir/Practitioner
```

**Request Body:**
```json
{
  "resourceType": "Practitioner",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Johnson",
      "given": ["Robert"],
      "prefix": ["Dr"]
    }
  ],
  "gender": "male",
  "birthDate": "1970-03-15",
  "telecom": [
    {
      "system": "phone",
      "value": "555-123-9876",
      "use": "work"
    },
    {
      "system": "email",
      "value": "robert.johnson@example.com",
      "use": "work"
    }
  ],
  "qualification": [
    {
      "code": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0360/2.7",
            "code": "MD",
            "display": "Doctor of Medicine"
          }
        ],
        "text": "Doctor of Medicine"
      },
      "period": {
        "start": "1995-05-20"
      }
    }
  ]
}
```

### Update Practitioner

```
PUT /api/fhir/Practitioner/{id}
```

### Delete Practitioner

```
DELETE /api/fhir/Practitioner/{id}
```

## Organization Management

### Get All Organizations

```
GET /api/organizations
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `name`: Filter by organization name

### Get Organization by ID

```
GET /api/organizations/{id}
```

### Create Organization

```
POST /api/organizations
```

**Request Body:**
```json
{
  "resourceType": "Organization",
  "active": true,
  "name": "General Hospital",
  "telecom": [
    {
      "system": "phone",
      "value": "555-333-4444",
      "use": "work"
    },
    {
      "system": "email",
      "value": "info@generalhospital.example.com",
      "use": "work"
    }
  ],
  "address": [
    {
      "use": "work",
      "type": "both",
      "line": ["123 Hospital Drive"],
      "city": "Metropolis",
      "state": "NY",
      "postalCode": "10001"
    }
  ]
}
```

### Update Organization

```
PUT /api/organizations/{id}
```

### Delete Organization

```
DELETE /api/organizations/{id}
```

## Encounter Management

### Get All Encounters

```
GET /api/fhir/Encounter
```

**Query Parameters:**
- Standard pagination parameters
- `date`: Filter by date (YYYY-MM-DD)
- `patient`: Filter by patient ID
- `practitioner`: Filter by practitioner ID
- `status`: Filter by status (arrived, triaged, in-progress, finished, cancelled)

### Get Encounter by ID

```
GET /api/fhir/Encounter/{id}
```

### Create Encounter

```
POST /api/fhir/Encounter
```

**Request Body:**
```json
{
  "resourceType": "Encounter",
  "status": "finished",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "ambulatory"
  },
  "subject": {
    "reference": "Patient/123",
    "display": "John Smith"
  },
  "participant": [
    {
      "individual": {
        "reference": "Practitioner/456",
        "display": "Dr. Robert Johnson"
      }
    }
  ],
  "period": {
    "start": "2023-06-15T09:00:00Z",
    "end": "2023-06-15T09:30:00Z"
  },
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "386661006",
          "display": "Fever"
        }
      ],
      "text": "Fever"
    }
  ],
  "location": [
    {
      "location": {
        "reference": "Location/789",
        "display": "General Hospital, Exam Room 1"
      }
    }
  ]
}
```

### Update Encounter

```
PUT /api/fhir/Encounter/{id}
```

### Delete Encounter

```
DELETE /api/fhir/Encounter/{id}
```

## Observation Management (Lab Tests)

### Get All Observations

```
GET /api/fhir/Observation
```

**Query Parameters:**
- Standard pagination parameters
- `patient`: Filter by patient ID
- `category`: Filter by category (laboratory, vital-signs, etc.)
- `code`: Filter by observation code
- `date`: Filter by date (YYYY-MM-DD)
- `date-range`: Filter by date range (start=YYYY-MM-DD&end=YYYY-MM-DD)

### Get Observation by ID

```
GET /api/fhir/Observation/{id}
```

### Create Observation (Lab Test)

```
POST /api/fhir/Observation
```

**Request Body:**
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "718-7",
        "display": "Hemoglobin [Mass/volume] in Blood"
      }
    ],
    "text": "Hemoglobin"
  },
  "subject": {
    "reference": "Patient/123",
    "display": "John Smith"
  },
  "effectiveDateTime": "2023-06-15T10:00:00Z",
  "issued": "2023-06-15T10:30:00Z",
  "performer": [
    {
      "reference": "Practitioner/456",
      "display": "Dr. Robert Johnson"
    }
  ],
  "valueQuantity": {
    "value": 14.5,
    "unit": "g/dL",
    "system": "http://unitsofmeasure.org",
    "code": "g/dL"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          "code": "N",
          "display": "Normal"
        }
      ],
      "text": "Normal"
    }
  ],
  "referenceRange": [
    {
      "low": {
        "value": 13.0,
        "unit": "g/dL",
        "system": "http://unitsofmeasure.org",
        "code": "g/dL"
      },
      "high": {
        "value": 17.0,
        "unit": "g/dL",
        "system": "http://unitsofmeasure.org",
        "code": "g/dL"
      },
      "type": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/referencerange-meaning",
            "code": "normal",
            "display": "Normal Range"
          }
        ],
        "text": "Normal Range"
      }
    }
  ]
}
```

### Update Observation

```
PUT /api/fhir/Observation/{id}
```

### Delete Observation

```
DELETE /api/fhir/Observation/{id}
```

## Diagnostic Report Management

### Get All Diagnostic Reports

```
GET /api/fhir/DiagnosticReport
```

**Query Parameters:**
- Standard pagination parameters
- `patient`: Filter by patient ID
- `category`: Filter by category (LAB, RAD, etc.)
- `date`: Filter by date (YYYY-MM-DD)
- `status`: Filter by status (registered, partial, preliminary, final, etc.)

### Get Diagnostic Report by ID

```
GET /api/fhir/DiagnosticReport/{id}
```

### Create Diagnostic Report

```
POST /api/fhir/DiagnosticReport
```

**Request Body:**
```json
{
  "resourceType": "DiagnosticReport",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
          "code": "LAB",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "58410-2",
        "display": "Complete blood count (hemogram) panel - Blood by Automated count"
      }
    ],
    "text": "CBC"
  },
  "subject": {
    "reference": "Patient/123",
    "display": "John Smith"
  },
  "encounter": {
    "reference": "Encounter/789"
  },
  "effectiveDateTime": "2023-06-15T10:00:00Z",
  "issued": "2023-06-15T11:00:00Z",
  "performer": [
    {
      "reference": "Practitioner/456",
      "display": "Dr. Robert Johnson"
    }
  ],
  "result": [
    {
      "reference": "Observation/111"
    },
    {
      "reference": "Observation/222"
    }
  ],
  "conclusion": "All values within normal range."
}
```

### Update Diagnostic Report

```
PUT /api/fhir/DiagnosticReport/{id}
```

### Delete Diagnostic Report

```
DELETE /api/fhir/DiagnosticReport/{id}
```

## Questionnaire Management

### Get All Questionnaires

```
GET /api/fhir/Questionnaire
```

### Get Questionnaire by ID

```
GET /api/fhir/Questionnaire/{id}
```

### Create Questionnaire

```
POST /api/fhir/Questionnaire
```

**Request Body:**
```json
{
  "resourceType": "Questionnaire",
  "title": "Patient Health Questionnaire",
  "status": "active",
  "date": "2023-06-15",
  "publisher": "MediCare",
  "description": "General health questionnaire for new patients",
  "item": [
    {
      "linkId": "1",
      "text": "Do you have any allergies?",
      "type": "boolean"
    },
    {
      "linkId": "2",
      "text": "If yes, please list your allergies",
      "type": "text",
      "enableWhen": [
        {
          "question": "1",
          "operator": "=",
          "answerBoolean": true
        }
      ]
    },
    {
      "linkId": "3",
      "text": "How would you rate your overall health?",
      "type": "choice",
      "answerOption": [
        {
          "valueCoding": {
            "code": "excellent",
            "display": "Excellent"
          }
        },
        {
          "valueCoding": {
            "code": "good",
            "display": "Good"
          }
        },
        {
          "valueCoding": {
            "code": "fair",
            "display": "Fair"
          }
        },
        {
          "valueCoding": {
            "code": "poor",
            "display": "Poor"
          }
        }
      ]
    }
  ]
}
```

### Update Questionnaire

```
PUT /api/fhir/Questionnaire/{id}
```

### Delete Questionnaire

```
DELETE /api/fhir/Questionnaire/{id}
```

## Data Export

The MediCare API doesn't have built-in export functionality, but you can implement it in the frontend by:

1. Fetching the data using the appropriate API endpoint
2. Processing the data in the frontend
3. Generating CSV or JSON files for download

### Example: Exporting Patient List to CSV

1. Fetch patient data:
```javascript
async function fetchPatients() {
  const response = await fetch('http://localhost:3000/api/fhir/Patient?_count=100', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return await response.json();
}
```

2. Convert to CSV:
```javascript
function convertToCSV(patients) {
  // Headers
  const headers = ['ID', 'Name', 'Gender', 'Birth Date', 'Phone', 'Email', 'Address'];
  
  // Data rows
  const rows = patients.entry.map(entry => {
    const patient = entry.resource;
    const name = patient.name && patient.name[0] ? 
      `${patient.name[0].given ? patient.name[0].given.join(' ') : ''} ${patient.name[0].family || ''}`.trim() : 
      'N/A';
    
    const phone = patient.telecom ? 
      patient.telecom.find(t => t.system === 'phone')?.value || 'N/A' : 
      'N/A';
    
    const email = patient.telecom ? 
      patient.telecom.find(t => t.system === 'email')?.value || 'N/A' : 
      'N/A';
    
    const address = patient.address && patient.address[0] ? 
      `${patient.address[0].line ? patient.address[0].line.join(', ') : ''}, ${patient.address[0].city || ''}, ${patient.address[0].state || ''} ${patient.address[0].postalCode || ''}`.trim() : 
      'N/A';
    
    return [
      patient.id,
      name,
      patient.gender || 'N/A',
      patient.birthDate || 'N/A',
      phone,
      email,
      address
    ];
  });
  
  // Combine headers and rows
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
```

3. Download the CSV:
```javascript
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Usage
async function exportPatientsToCSV() {
  const patients = await fetchPatients();
  const csvContent = convertToCSV(patients);
  downloadCSV(csvContent, 'patients.csv');
}
```

### Example: Exporting Patient List to JSON

```javascript
async function exportPatientsToJSON() {
  const patients = await fetchPatients();
  
  // Extract just the patient resources
  const patientData = patients.entry.map(entry => entry.resource);
  
  // Create a JSON blob and download
  const jsonContent = JSON.stringify(patientData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'patients.json');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

## Seeding the System

To seed the system with FHIR resources, you can use the following approach:

### 1. Create a Bundle of Resources

Create a JSON file with a FHIR Bundle containing multiple resources:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "patient-1",
        "active": true,
        "name": [
          {
            "use": "official",
            "family": "Smith",
            "given": ["John"]
          }
        ],
        "gender": "male",
        "birthDate": "1980-06-15"
      },
      "request": {
        "method": "PUT",
        "url": "Patient/patient-1"
      }
    },
    {
      "resource": {
        "resourceType": "Practitioner",
        "id": "practitioner-1",
        "active": true,
        "name": [
          {
            "use": "official",
            "family": "Johnson",
            "given": ["Robert"],
            "prefix": ["Dr"]
          }
        ],
        "gender": "male"
      },
      "request": {
        "method": "PUT",
        "url": "Practitioner/practitioner-1"
      }
    }
    // Add more resources as needed
  ]
}
```

### 2. Send the Bundle to the FHIR Server

```javascript
async function seedFhirResources(bundle) {
  const response = await fetch('http://localhost:9090/fhir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(bundle)
  });
  
  return await response.json();
}
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "message": "Error description",
  "error": "Error type",
  "statusCode": 400
}
```

Common error codes:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication failed or missing
- `403 Forbidden`: Insufficient permissions for the requested resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

When implementing the frontend, make sure to handle these errors appropriately and display meaningful messages to the user. 