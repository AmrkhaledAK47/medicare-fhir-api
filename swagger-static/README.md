# MediCare FHIR API Documentation

This directory contains the API documentation for the MediCare FHIR API. The documentation is generated using OpenAPI/Swagger and provides comprehensive information about all available endpoints, request/response formats, and authentication requirements.

## Getting Started

1. Open `index.html` in your browser to view the documentation locally
2. Alternatively, you can deploy this directory to any static file hosting service

## API Overview

The MediCare FHIR API follows the HL7 FHIR R4 standard for healthcare interoperability. Key features include:

- **FHIR-Compliant Resources**: All resources conform to the FHIR R4 specification
- **Role-Based Access Control**: Different endpoints are accessible based on user roles (Admin, Practitioner, Patient)
- **JWT Authentication**: All endpoints (except login/registration) require authentication
- **Comprehensive Documentation**: All endpoints are fully documented with examples

## Making API Requests

### Authentication

All API requests (except login/registration) require a JWT token. To obtain a token:

1. Call `POST /api/auth/login` with valid credentials
2. Include the returned token in the Authorization header of subsequent requests:
   ```
   Authorization: Bearer YOUR_TOKEN
   ```

### Common Headers

- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer YOUR_TOKEN`

### Pagination

Many endpoints support pagination with the following parameters:

- `page`: Page number (1-based)
- `limit`: Items per page
- `sort`: Field to sort by
- `sortDirection`: Sort order ('asc' or 'desc')

Example: `GET /api/fhir/Patient?page=1&limit=10&sort=name&sortDirection=asc`

## Available Resources

The API provides endpoints for the following FHIR resources:

- Patients
- Practitioners
- Encounters
- Observations
- Medications
- Procedures
- Organizations
- Questionnaires
- DiagnosticReports
- And more...

## Examples

### Example: Fetch Patient Data

```javascript
// Fetch a patient by ID
async function getPatient(patientId) {
  const response = await fetch(`https://api.example.com/api/fhir/Patient/${patientId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}
```

### Example: Create an Observation

```javascript
// Create a new observation
async function createObservation(data) {
  const response = await fetch('https://api.example.com/api/fhir/Observation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}
```

## Additional Resources

- [FHIR R4 Documentation](https://www.hl7.org/fhir/R4/)
- [JWT.io](https://jwt.io/) - Helpful for debugging JWT tokens
- [Postman Collection](https://example.com/medicare-api-postman.json) - Import this into Postman for easy API testing

## Need Help?

Contact the API development team at `api-support@medicare.example.com` for assistance. 