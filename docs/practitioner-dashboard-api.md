# Practitioner Dashboard API Documentation

## Overview

The Practitioner Dashboard API provides a comprehensive interface for healthcare practitioners to access and manage their dashboard data, including patient information, appointments, schedules, reports, medications, and lab results. This API is designed to support the frontend practitioner dashboard interface.

## Base URL

```
/api/practitioner-dashboard
```

## Authentication

All endpoints require authentication using a JWT token. The token must be included in the `Authorization` header as a Bearer token.

```
Authorization: Bearer <token>
```

The user must have the `PRACTITIONER` role to access these endpoints.

## Endpoints

### Get Practitioner Dashboard

Retrieves all dashboard data for the authenticated practitioner user.

**URL**: `/api/practitioner-dashboard`

**Method**: `GET`

**Auth required**: Yes (JWT Token with PRACTITIONER role)

**Permissions required**: User must be a practitioner

**Request Parameters**: None

**Response**:

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "specialty": ["string"],
      "qualification": [
        {
          "code": "string",
          "display": "string"
        }
      ],
      "gender": "string",
      "profileImageUrl": "string"
    },
    "patients": [
      {
        "id": "string",
        "name": "string",
        "age": 45,
        "gender": "string",
        "profileImageUrl": "string",
        "nextAppointment": "2023-06-15T14:30:00Z",
        "activeConditions": ["string"],
        "vitalsStatus": "normal"
      }
    ],
    "appointments": [
      {
        "id": "string",
        "start": "2023-06-15T14:30:00Z",
        "end": "2023-06-15T15:00:00Z",
        "description": "string",
        "status": "string",
        "patient": {
          "id": "string",
          "name": "string",
          "profileImageUrl": "string"
        },
        "location": {
          "id": "string",
          "name": "string",
          "address": "string"
        },
        "appointmentType": "string"
      }
    ],
    "schedule": {
      "id": "string",
      "date": "2023-06-15",
      "slots": [
        {
          "id": "string",
          "start": "2023-06-15T09:00:00Z",
          "end": "2023-06-15T09:30:00Z",
          "status": "free",
          "appointmentId": "string",
          "patient": {
            "id": "string",
            "name": "string"
          }
        }
      ],
      "workingHours": {
        "start": "09:00",
        "end": "17:00"
      }
    },
    "reports": [
      {
        "id": "string",
        "title": "string",
        "date": "2023-06-15T14:30:00Z",
        "patient": {
          "id": "string",
          "name": "string"
        },
        "type": "string",
        "status": "string"
      }
    ],
    "medications": [
      {
        "id": "string",
        "name": "string",
        "dosage": "string",
        "patient": {
          "id": "string",
          "name": "string"
        },
        "status": "string",
        "datePrescribed": "2023-06-15T14:30:00Z"
      }
    ],
    "labResults": [
      {
        "id": "string",
        "name": "string",
        "value": "string",
        "unit": "string",
        "referenceRange": "string",
        "status": "normal",
        "patient": {
          "id": "string",
          "name": "string"
        },
        "date": "2023-06-15T14:30:00Z"
      }
    ],
    "statistics": {
      "totalPatients": 42,
      "newPatients": 5,
      "totalAppointments": 18,
      "upcomingAppointments": 7,
      "todayAppointments": 3,
      "pendingLabResults": 4
    },
    "timestamp": "2023-06-15T14:30:45.123Z",
    "errors": [
      {
        "component": "reports",
        "message": "Failed to fetch reports data"
      }
    ]
  }
}
```

**Status Codes**:

- `200 OK`: Dashboard data retrieved successfully
- `400 Bad Request`: User has no linked FHIR resource
- `401 Unauthorized`: Invalid or expired JWT token
- `403 Forbidden`: User does not have practitioner role
- `500 Internal Server Error`: Failed to load dashboard data

## Error Handling

The API returns partial data even if some components fail to load. The `errors` array in the response will contain information about any components that failed to load.

## Caching

Dashboard data is cached for 60 seconds to improve performance. Each practitioner's dashboard data is cached separately.

## Test Accounts

For testing purposes, you can use the following test accounts:

### Practitioner Account

- **Email**: dr.smith@example.com
- **Password**: Test123!
- **Role**: PRACTITIONER

## Rate Limiting

The API is rate-limited to prevent abuse. The default rate limit is 30 requests per minute per IP address.

## Versioning

This API is currently at version 1.0.0. The API version is included in the response headers.

## Support

For support or questions about the API, please contact the development team at api-support@example.com. 