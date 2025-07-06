# MediCare Dashboard API Documentation

## Overview

This document provides comprehensive details on the Dashboard API for the MediCare application. It outlines how frontend applications should interact with the dashboard endpoint, including authentication, data structure, and refresh cadence.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The Dashboard API uses JWT token authentication. Include the JWT token in the Authorization header for all requests:

```
Authorization: Bearer {token}
```

## Dashboard Endpoint

### Get Dashboard Data

Retrieves all dashboard data for the authenticated user, including profile information, biomarkers, appointments, calendar events, and quick actions.

**Endpoint:**
```
GET /dashboard
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "status": "string",
      "phone": "string (optional)",
      "profileImageUrl": "string (optional)",
      "isEmailVerified": "boolean",
      "fhirDetails": {
        "resourceType": "string",
        "resourceId": "string",
        "details": {
          "name": "string",
          "gender": "string",
          "birthDate": "string",
          "address": "string (optional)",
          "telecom": [
            {
              "system": "string",
              "value": "string",
              "use": "string"
            }
          ]
        }
      }
    },
    "biomarkers": [
      {
        "type": "string",
        "name": "string",
        "value": "string",
        "unit": "string (optional)",
        "referenceRange": "string (optional)",
        "status": "normal | high | low | critical | unknown",
        "date": "string (ISO date)",
        "performer": "string (optional)"
      }
    ],
    "appointments": [
      {
        "id": "string",
        "start": "string (ISO date)",
        "end": "string (ISO date, optional)",
        "description": "string",
        "status": "string",
        "practitioner": {
          "id": "string",
          "name": "string",
          "speciality": "string (optional)",
          "imageUrl": "string (optional)"
        },
        "location": {
          "id": "string",
          "name": "string",
          "address": "string (optional)"
        },
        "appointmentType": "in-person | virtual | phone"
      }
    ],
    "calendar": [
      {
        "date": "string (YYYY-MM-DD)",
        "events": [
          {
            "id": "string",
            "title": "string",
            "time": "string (HH:MM)",
            "type": "appointment | task | reminder"
          }
        ]
      }
    ],
    "quickActions": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "url": "string",
        "type": "string",
        "icon": "string"
      }
    ],
    "errors": [
      "string (optional, only present if there were partial failures)"
    ]
  }
}
```

## Biomarker LOINC Codes

The biomarker cards in the dashboard use the following LOINC codes:

| Biomarker Type | Description | LOINC Codes |
|---------------|-------------|-------------|
| heart | Blood Pressure | 8480-6 (Systolic), 8462-4 (Diastolic) |
| kidney | Kidney Function | 2160-0 (Creatinine) |
| liver | Liver Function | 1920-8 (AST) |
| sugar | Blood Sugar | 2345-7 (Glucose) |
| blood | Blood Count | 718-7 (Hemoglobin) |
| thyroid | Thyroid Function | 3024-7 (Thyroxine) |
| bone | Bone Density | 38483-4 (Bone Density) |

## Caching and Refresh Cadence

The dashboard API implements caching with the following TTL (Time To Live) values:

| Component | Cache TTL |
|-----------|-----------|
| Profile | 60 seconds |
| Biomarkers | 60 seconds |
| Appointments | 60 seconds |
| Calendar | 60 seconds |
| Quick Actions | 60 seconds |

Frontend applications should consider these cache durations when implementing refresh strategies. For real-time data, a manual refresh button is recommended rather than frequent polling.

## Error Handling

The dashboard API may return partial data if some components fail to load. In this case, the `errors` array in the response will contain error messages for the failed components.

If the entire dashboard fails to load, the API will return a 500 status code with an error message.

## Sample Usage (JavaScript/Axios)

```javascript
import axios from 'axios';

// Configure axios with base URL
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get dashboard data
const getDashboard = async () => {
  try {
    const response = await api.get('/dashboard');
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch dashboard:', error.response?.data || error.message);
    throw error;
  }
};
```

## Best Practices

1. **Error Handling**: Implement proper error handling for partial failures.
2. **Loading States**: Show loading states for individual components rather than the entire dashboard.
3. **Refresh Strategy**: Implement a manual refresh button rather than frequent polling.
4. **Offline Support**: Consider caching the dashboard data locally for offline support.

## Support

For any issues related to the dashboard API, please contact the backend team at backend@medicare-example.com. 