# MediCare FHIR API Integration Guide

## Overview

This guide provides instructions for integrating with the MediCare FHIR API. Our API uses the HL7 FHIR R4 standard to provide access to healthcare ata with role-based permissions.
d
## Getting Started

### Base URLs

- **Production API**: `https://api.medicare-example.com/api`
- **Development API**: `http://localhost:3000/api`
- **FHIR Base URL**: `{base_url}/fhir`

### Authentication

All requests to the API must include an authentication token:

1. Obtain a JWT token by calling the login endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'
```

2. Include the token in subsequent requests:

```bash
curl -X GET http://localhost:3000/api/fhir/Patient \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### API Documentation

Interactive API documentation is available at:

- **Production**: `https://api.medicare-example.com/api/docs`
- **Development**: `http://localhost:3000/api/docs`

## Integration Examples

### JavaScript/TypeScript (Axios)

```javascript
import axios from 'axios';

// Configure client
const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Login and set token
async function login(email, password) {
  try {
    const response = await client.post('/auth/login', { email, password });
    const token = response.data.access_token;
    
    // Set token for future requests
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get patient list
async function getPatients(searchParams = {}) {
  try {
    const response = await client.get('/fhir/Patient', { params: searchParams });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch patients:', error.response?.data || error.message);
    throw error;
  }
}

// Create a new patient
async function createPatient(patientData) {
  try {
    const response = await client.post('/fhir/Patient', patientData);
    return response.data;
  } catch (error) {
    console.error('Failed to create patient:', error.response?.data || error.message);
    throw error;
  }
}

// Usage example
async function example() {
  try {
    // Login as practitioner
    await login('doctor@medicare.com', 'password');
    
    // Get patients
    const patients = await getPatients({ 
      name: 'Smith',
      birthdate: 'gt2000-01-01'
    });
    console.log(`Found ${patients.total} patients`);
    
    // Create a new patient
    const newPatient = await createPatient({
      resourceType: 'Patient',
      name: [
        {
          family: 'Johnson',
          given: ['Sarah']
        }
      ],
      gender: 'female',
      birthDate: '1985-08-12',
      telecom: [
        {
          system: 'phone',
          value: '555-123-4567',
          use: 'home'
        }
      ]
    });
    
    console.log('Created patient with ID:', newPatient.id);
  } catch (error) {
    console.error('Example failed:', error);
  }
}
```

### Python (Requests)

```python
import requests
import json

# Base configuration
BASE_URL = 'http://localhost:3000/api'
session = requests.Session()
session.headers.update({'Content-Type': 'application/json'})

def login(email, password):
    """Login and set authorization token for future requests"""
    response = requests.post(
        f"{BASE_URL}/auth/login", 
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    token = response.json()['access_token']
    session.headers.update({'Authorization': f'Bearer {token}'})
    return token

def get_patients(search_params=None):
    """Get list of patients with optional search parameters"""
    response = session.get(f"{BASE_URL}/fhir/Patient", params=search_params)
    response.raise_for_status()
    return response.json()

def create_patient(patient_data):
    """Create a new patient record"""
    response = session.post(f"{BASE_URL}/fhir/Patient", json=patient_data)
    response.raise_for_status()
    return response.json()

def get_observations_for_patient(patient_id, limit=10):
    """Get observations for a specific patient"""
    params = {
        'subject.reference': f'Patient/{patient_id}',
        'limit': limit
    }
    response = session.get(f"{BASE_URL}/fhir/Observation", params=params)
    response.raise_for_status()
    return response.json()

# Example usage
try:
    # Login as practitioner
    login('doctor@medicare.com', 'password')
    
    # Get patients
    patients = get_patients({'name': 'Johnson'})
    print(f"Found {patients['total']} patients")
    
    if patients['total'] > 0:
        # Get first patient's ID
        patient_id = patients['entry'][0]['resource']['id']
        
        # Get observations for this patient
        observations = get_observations_for_patient(patient_id)
        print(f"Found {observations['total']} observations for patient {patient_id}")
except requests.exceptions.RequestException as e:
    print(f"API Error: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"Status code: {e.response.status_code}")
        print(f"Response: {e.response.text}")
```

## Resource Examples

### Patient Resource

```json
{
  "resourceType": "Patient",
  "id": "123",
  "name": [
    {
      "family": "Smith",
      "given": ["John", "Adam"]
    }
  ],
  "gender": "male",
  "birthDate": "1980-06-15",
  "address": [
    {
      "line": ["123 Main St"],
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
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
      "value": "john.smith@example.com"
    }
  ],
  "communication": [
    {
      "language": {
        "coding": [
          {
            "system": "urn:ietf:bcp:47",
            "code": "en",
            "display": "English"
          }
        ]
      },
      "preferred": true
    }
  ]
}
```

### Encounter Resource

```json
{
  "resourceType": "Encounter",
  "id": "456",
  "status": "finished",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "ambulatory"
  },
  "type": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "185345009",
          "display": "Follow-up encounter"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/123",
    "display": "John Smith"
  },
  "participant": [
    {
      "individual": {
        "reference": "Practitioner/789",
        "display": "Dr. Jane Doe"
      }
    }
  ],
  "period": {
    "start": "2023-06-01T09:00:00Z",
    "end": "2023-06-01T09:30:00Z"
  },
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "386661006",
          "display": "Fever"
        }
      ]
    }
  ],
  "location": [
    {
      "location": {
        "reference": "Location/hospital123",
        "display": "Main Hospital"
      }
    }
  ]
}
```

## Role-Based Access

Our API implements role-based access control. Please be aware that the available resources and operations depend on the user's role:

- **Patients** can only access their own records
- **Practitioners** can access records for patients under their care
- **Admins** have full access to all resources

For detailed information on role-specific permissions, please refer to the `ROLE-PERMISSIONS.md` document.

## Common Errors and Troubleshooting

| Status Code | Error | Resolution |
|-------------|-------|------------|
| 401 | Unauthorized | Ensure you're including a valid JWT token |
| 403 | Forbidden | The user doesn't have permission to access this resource |
| 404 | Not Found | Check the resource ID and ensure it exists |
| 422 | Validation Error | Check the request body against the FHIR specification |
| 500 | Server Error | Contact support with the error details |

## Pagination and Filtering

### Pagination

All list endpoints support pagination:

```
GET /fhir/Patient?_page=2&_count=10
```

Response includes pagination metadata:

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 100,
  "link": [
    {
      "relation": "self",
      "url": "fhir/Patient?_page=2&_count=10"
    },
    {
      "relation": "previous",
      "url": "fhir/Patient?_page=1&_count=10"
    },
    {
      "relation": "next",
      "url": "fhir/Patient?_page=3&_count=10"
    }
  ]
}
```

### Filtering

Common filters include:

- Text search: `?_content=search term`
- Date ranges: `?birthDate=gt2000-01-01`
- Reference filtering: `?subject.reference=Patient/123`

## Contact and Support

For API support or to report issues, please contact:

- Email: api-support@medicare-example.com
- Support Portal: https://support.medicare-example.com
- Documentation: https://docs.medicare-example.com 