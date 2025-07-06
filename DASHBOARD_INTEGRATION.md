# Dashboard API Integration Guide

## Overview

This document provides comprehensive guidance for frontend developers integrating with the MediCare Dashboard API. The Dashboard API aggregates multiple data sources to provide a unified view of patient information, including profile details, biomarkers, appointments, calendar events, and quick actions.

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard Endpoint](#dashboard-endpoint)
3. [Response Structure](#response-structure)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Caching Strategy](#caching-strategy)
7. [Examples](#examples)
8. [Best Practices](#best-practices)
9. [FAQ](#faq)

## Authentication

### JWT Authentication

All dashboard API requests require a valid JWT token obtained through the authentication process.

**Login Endpoint:**
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "YourPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60d5f8b8c9e4b42d94590123",
      "name": "John Smith",
      "email": "patient@example.com",
      "role": "patient",
      "status": "active",
      "fhirResourceId": "422",
      "fhirResourceType": "Patient"
    }
  }
}
```

### Using the Token

Include the JWT token in the Authorization header for all dashboard API requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Access Control

The dashboard endpoint is restricted to users with the **patient** role only. Admin and practitioner users cannot access this endpoint.

## Dashboard Endpoint

### Request

```
GET /api/dashboard
```

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

### Response

A successful response returns HTTP status code 200 and a JSON object containing the dashboard data.

## Response Structure

The dashboard response includes the following main sections:

1. **profile** - User profile information
2. **biomarkers** - Health biomarker data
3. **appointments** - Upcoming medical appointments
4. **calendar** - Calendar events including appointments, care plans, and service requests
5. **quickActions** - Available quick actions for the user
6. **errors** - Any errors that occurred during dashboard data retrieval (optional)

## Data Models

### DashboardDto

```typescript
{
  profile: UserProfileDto;
  biomarkers?: BiomarkerDto[];
  appointments?: AppointmentDto[];
  calendar?: CalendarEventDto[];
  quickActions?: QuickActionDto[];
  errors?: string[];
}
```

### UserProfileDto

```typescript
{
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  profileImageUrl?: string;
  isEmailVerified: boolean;
  fhirDetails?: {
    resourceType: string;
    resourceId: string;
    details: {
      name?: string;
      gender?: string;
      birthDate?: string;
      address?: string;
      telecom?: {
        system: string;
        value: string;
        use?: string;
      }[];
    };
  };
}
```

### BiomarkerDto

```typescript
{
  type: string;        // 'liver', 'kidney', 'sugar', 'blood', 'heart', 'thyroid', 'bone'
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: string;      // 'normal', 'high', 'low', 'critical', 'unknown'
  date: string;        // ISO format date
  trend?: {
    direction: string; // 'up', 'down', 'stable'
    percentage?: number;
  };
}
```

### AppointmentDto

```typescript
{
  id: string;
  start: string;       // ISO format date
  end: string;         // ISO format date
  description: string;
  status: string;      // 'booked', 'cancelled', 'pending', etc.
  practitioner: {
    id: string;
    name: string;
    speciality?: string;
    imageUrl?: string;
  };
  location?: {
    id: string;
    name: string;
    address?: string;
  };
  appointmentType: string; // 'in-person', 'virtual', 'phone'
}
```

### CalendarEventDto

```typescript
{
  date: string;        // YYYY-MM-DD format
  events: CalendarEventItemDto[];
}
```

### CalendarEventItemDto

```typescript
{
  id: string;
  title: string;
  time: string;        // HH:MM format
  type: string;        // 'appointment', 'task', 'reminder'
}
```

### QuickActionDto

```typescript
{
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;        // 'consultation', 'location', 'emergency', etc.
  icon: string;
}
```

## Biomarker Reference

### Biomarker Types and LOINC Codes

| Type    | Name                                                    | LOINC Code | Normal Range       | Unit  |
|---------|--------------------------------------------------------|------------|-------------------|-------|
| liver   | Aspartate aminotransferase [Enzymatic activity/volume] | 1920-8     | 10-40             | U/L   |
| liver   | Alanine aminotransferase [Enzymatic activity/volume]   | 1742-6     | 7-56              | U/L   |
| kidney  | Creatinine [Mass/volume] in Serum or Plasma            | 2160-0     | 0.7-1.3 (male)    | mg/dL |
| kidney  | Urea nitrogen [Mass/volume] in Serum or Plasma         | 3094-0     | 7-20              | mg/dL |
| sugar   | Glucose [Mass/volume] in Serum or Plasma               | 2345-7     | 70-99             | mg/dL |
| sugar   | Hemoglobin A1c/Hemoglobin.total in Blood               | 4548-4     | < 5.7             | %     |
| blood   | Hemoglobin [Mass/volume] in Blood                      | 718-7      | 12-16 (female)    | g/dL  |
| blood   | Platelet count                                         | 777-3      | 150,000-450,000   | /μL   |
| heart   | Cholesterol in LDL [Mass/volume] in Serum or Plasma    | 2089-1     | < 100             | mg/dL |
| heart   | Troponin T.cardiac [Mass/volume] in Serum or Plasma    | 6598-7     | < 0.01            | ng/mL |
| thyroid | Thyrotropin [Units/volume] in Serum or Plasma          | 3016-3     | 0.4-4.0           | mIU/L |
| bone    | Calcium [Mass/volume] in Serum or Plasma               | 17861-6    | 8.5-10.2          | mg/dL |

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request parameters or user has no linked FHIR resource
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User does not have patient role
- **500 Internal Server Error**: Server-side error

### Error Response Format

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "warning",
      "code": "forbidden",
      "diagnostics": "Access denied: requires patient role",
      "details": {
        "text": "Access denied: requires patient role"
      }
    }
  ]
}
```

### Partial Dashboard Loading

If some components of the dashboard fail to load, the API will still return the available data with an `errors` array indicating which components failed:

```json
{
  "profile": { ... },
  "biomarkers": [ ... ],
  "appointments": null,
  "calendar": [ ... ],
  "quickActions": [ ... ],
  "errors": [
    "Failed to load appointments: FHIR server timeout"
  ]
}
```

## Caching Strategy

The dashboard API implements server-side caching with a TTL (Time To Live) of 60 seconds for each component. This means:

1. The first request will fetch fresh data from the underlying systems
2. Subsequent requests within 60 seconds will receive cached data
3. After 60 seconds, the cache expires and fresh data is fetched again

Frontend applications should not implement additional caching for this data, as it may lead to stale information.

## Calendar Events

The calendar section aggregates events from multiple sources:

1. **Appointments** - Medical appointments with healthcare providers
2. **Care Plans** - Scheduled activities from care plans
3. **Service Requests** - Medical services like lab tests or procedures

Events are grouped by date and include:
- Date (YYYY-MM-DD)
- Event details (title, time, type)

## Examples

### Example Request

```bash
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "60d5f8b8c9e4b42d94590123",
      "name": "John Smith",
      "email": "patient@example.com",
      "role": "patient",
      "status": "active",
      "isEmailVerified": false,
      "fhirDetails": {
        "resourceType": "Patient",
        "resourceId": "422",
        "details": {
          "name": "John Smith",
          "gender": "male",
          "birthDate": "1990-01-01",
          "telecom": [
            {
              "system": "email",
              "value": "patient@example.com",
              "use": "home"
            }
          ]
        }
      }
    },
    "biomarkers": [
      {
        "type": "liver",
        "name": "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
        "value": "28",
        "unit": "U/L",
        "referenceRange": "10-40",
        "status": "normal",
        "date": "2025-07-01T10:15:00Z"
      },
      {
        "type": "kidney",
        "name": "Creatinine [Mass/volume] in Serum or Plasma",
        "value": "0.9",
        "unit": "mg/dL",
        "status": "normal",
        "date": "2025-07-01T10:15:00Z"
      }
    ],
    "appointments": [
      {
        "id": "668",
        "start": "2025-07-15T09:00:00Z",
        "end": "2025-07-15T09:30:00Z",
        "description": "Annual physical examination",
        "status": "booked",
        "practitioner": {
          "id": "practitioner-1",
          "name": "Sarah Johnson",
          "speciality": "Doctor of Medicine"
        },
        "location": {
          "id": "location-1",
          "name": "Main Hospital"
        },
        "appointmentType": "in-person"
      }
    ],
    "calendar": [
      {
        "date": "2025-07-05",
        "events": [
          {
            "date": "2025-07-05",
            "id": "servicerequest-3",
            "title": "Flu Vaccination",
            "time": "11:00",
            "type": "reminder"
          }
        ]
      },
      {
        "date": "2025-07-10",
        "events": [
          {
            "date": "2025-07-10",
            "id": "careplan-1-0",
            "title": "Check blood glucose levels",
            "time": "08:00",
            "type": "task"
          }
        ]
      }
    ],
    "quickActions": [
      {
        "id": "request-consultation",
        "title": "Request Consultation",
        "description": "Talk to a specialist",
        "url": "http://localhost:3000/api/consultations/request",
        "type": "consultation",
        "icon": "consultation"
      },
      {
        "id": "locate-hospital",
        "title": "Locate a Hospital",
        "description": "Find closest hospitals",
        "url": "http://localhost:3000/api/locations/hospitals",
        "type": "location",
        "icon": "hospital"
      }
    ]
  }
}
```

## Best Practices

1. **Error Handling**: Always check for the presence of an `errors` array in the response and handle partial data accordingly.

2. **Loading States**: Implement loading states for each dashboard component to provide a better user experience.

3. **Refresh Strategy**: Consider implementing a refresh button or automatic refresh after 60 seconds to get the latest data.

4. **Token Management**: Implement proper token refresh mechanisms to ensure uninterrupted access to the dashboard.

5. **Responsive Design**: Design the dashboard UI to adapt to different screen sizes and devices.

6. **Accessibility**: Ensure all dashboard components are accessible according to WCAG guidelines.

## FAQ

### Q: Can admin or practitioner users access the dashboard API?
A: No, the dashboard endpoint is restricted to users with the patient role only.

### Q: How often is the dashboard data refreshed?
A: The server-side cache has a TTL of 60 seconds. After this period, fresh data will be fetched from the underlying systems.

### Q: What should I do if some components fail to load?
A: Check the `errors` array in the response to identify which components failed. Display the available components and show appropriate error messages for the failed ones.

### Q: How are biomarker statuses determined?
A: Biomarker statuses are determined based on reference ranges for each specific test:
- **normal**: Value is within the reference range
- **high**: Value is above the reference range
- **low**: Value is below the reference range
- **critical**: Value is significantly outside the reference range
- **unknown**: Status could not be determined

### Q: How are calendar events sourced?
A: Calendar events are aggregated from three FHIR resources:
1. Appointments (type: appointment)
2. CarePlan activities (type: task)
3. ServiceRequests (type: reminder)

### Q: What is the difference between appointments and calendar events?
A: The appointments section provides detailed information about upcoming medical appointments only, while the calendar section provides a chronological view of all health-related events including appointments, care plan activities, and service requests. 