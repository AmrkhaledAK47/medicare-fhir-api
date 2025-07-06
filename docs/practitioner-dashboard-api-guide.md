# Practitioner Dashboard API Guide

## Overview

The Practitioner Dashboard API provides a comprehensive interface for healthcare practitioners to access and manage their dashboard data. This document serves as a guide for frontend developers to integrate with the API.

## Base URL

```
/api/practitioner-dashboard
```

## Authentication

All endpoints require authentication using a JWT token. The token must be included in the `Authorization` header as a Bearer token.

```
Authorization: Bearer <token>
```

To obtain a token, use the login endpoint:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "doctor@med.com",
  "password": "Doctor123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "68645dfad03688a3429b53ca",
      "email": "doctor@med.com",
      "name": "Dr. Jane Smith",
      "role": "practitioner",
      "status": "active",
      "fhirResourceId": "413",
      "fhirResourceType": "Practitioner"
    }
  }
}
```

## Authorization

The user must have the `PRACTITIONER` role to access these endpoints. Users with the `ADMIN` role can also access these endpoints.

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
      "id": "practitioner-123",
      "name": "Dr. Jane Smith",
      "email": "doctor@med.com",
      "phone": "+1-555-123-4567",
      "specialty": ["Neurology", "Oncology"],
      "qualification": [
        {
          "code": "MD",
          "display": "Doctor of Medicine"
        }
      ],
      "gender": "female",
      "profileImageUrl": "https://example.com/profiles/jane-smith.jpg"
    },
    "patients": [
      {
        "id": "patient-1",
        "name": "Alice Smith",
        "age": 45,
        "gender": "female",
        "profileImageUrl": "https://example.com/profiles/alice-smith.jpg",
        "nextAppointment": "2023-06-15T14:30:00Z",
        "activeConditions": ["Hypertension", "Type 2 Diabetes"],
        "vitalsStatus": "normal"
      },
      {
        "id": "patient-2",
        "name": "Bob Johnson",
        "age": 62,
        "gender": "male",
        "profileImageUrl": "https://example.com/profiles/bob-johnson.jpg",
        "nextAppointment": "2023-06-16T10:00:00Z",
        "activeConditions": ["Osteoarthritis"],
        "vitalsStatus": "abnormal"
      }
    ],
    "appointments": [
      {
        "id": "appointment-1",
        "start": "2023-06-15T14:30:00Z",
        "end": "2023-06-15T15:00:00Z",
        "description": "Follow-up consultation",
        "status": "booked",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith",
          "profileImageUrl": "https://example.com/profiles/alice-smith.jpg"
        },
        "location": {
          "id": "location-1",
          "name": "Main Clinic",
          "address": "123 Medical Drive"
        },
        "appointmentType": "follow-up"
      },
      {
        "id": "appointment-2",
        "start": "2023-06-16T10:00:00Z",
        "end": "2023-06-16T10:30:00Z",
        "description": "Initial consultation",
        "status": "booked",
        "patient": {
          "id": "patient-2",
          "name": "Bob Johnson",
          "profileImageUrl": "https://example.com/profiles/bob-johnson.jpg"
        },
        "location": {
          "id": "location-1",
          "name": "Main Clinic",
          "address": "123 Medical Drive"
        },
        "appointmentType": "initial"
      }
    ],
    "schedule": {
      "id": "schedule-1",
      "date": "2023-06-15",
      "slots": [
        {
          "id": "slot-1",
          "start": "2023-06-15T09:00:00Z",
          "end": "2023-06-15T09:30:00Z",
          "status": "free"
        },
        {
          "id": "slot-2",
          "start": "2023-06-15T09:30:00Z",
          "end": "2023-06-15T10:00:00Z",
          "status": "busy",
          "appointmentId": "appointment-3",
          "patient": {
            "id": "patient-3",
            "name": "Carol Williams"
          }
        },
        {
          "id": "slot-3",
          "start": "2023-06-15T10:00:00Z",
          "end": "2023-06-15T10:30:00Z",
          "status": "busy",
          "appointmentId": "appointment-4",
          "patient": {
            "id": "patient-4",
            "name": "David Brown"
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
        "id": "report-1",
        "title": "MRI Brain Scan Results",
        "date": "2023-06-10T14:30:00Z",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith"
        },
        "type": "diagnostic-imaging",
        "status": "final"
      },
      {
        "id": "report-2",
        "title": "Blood Test Results",
        "date": "2023-06-12T09:15:00Z",
        "patient": {
          "id": "patient-2",
          "name": "Bob Johnson"
        },
        "type": "laboratory",
        "status": "preliminary"
      }
    ],
    "medications": [
      {
        "id": "medication-1",
        "name": "Lisinopril",
        "dosage": "10mg once daily",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith"
        },
        "status": "active",
        "datePrescribed": "2023-06-01T14:30:00Z"
      },
      {
        "id": "medication-2",
        "name": "Metformin",
        "dosage": "500mg twice daily",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith"
        },
        "status": "active",
        "datePrescribed": "2023-06-01T14:30:00Z"
      },
      {
        "id": "medication-3",
        "name": "Ibuprofen",
        "dosage": "400mg as needed for pain",
        "patient": {
          "id": "patient-2",
          "name": "Bob Johnson"
        },
        "status": "active",
        "datePrescribed": "2023-06-05T10:15:00Z"
      }
    ],
    "labResults": [
      {
        "id": "lab-result-1",
        "name": "Hemoglobin A1c",
        "value": "7.2",
        "unit": "%",
        "referenceRange": "4.0-5.6",
        "status": "high",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith"
        },
        "date": "2023-06-10T14:30:00Z"
      },
      {
        "id": "lab-result-2",
        "name": "Blood Pressure",
        "value": "130/85",
        "unit": "mmHg",
        "referenceRange": "<120/80",
        "status": "high",
        "patient": {
          "id": "patient-1",
          "name": "Alice Smith"
        },
        "date": "2023-06-10T14:30:00Z"
      },
      {
        "id": "lab-result-3",
        "name": "Total Cholesterol",
        "value": "185",
        "unit": "mg/dL",
        "referenceRange": "<200",
        "status": "normal",
        "patient": {
          "id": "patient-2",
          "name": "Bob Johnson"
        },
        "date": "2023-06-12T09:15:00Z"
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

## Data Models

### Practitioner Profile

```typescript
interface PractitionerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string[];
  qualification?: {
    code: string;
    display: string;
  }[];
  gender?: string;
  profileImageUrl?: string;
}
```

### Patient

```typescript
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  profileImageUrl?: string;
  nextAppointment?: string;
  activeConditions?: string[];
  vitalsStatus?: 'normal' | 'abnormal' | 'critical' | 'unknown';
}
```

### Appointment

```typescript
interface Appointment {
  id: string;
  start: string;
  end?: string;
  description: string;
  status: string;
  patient: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  location?: {
    id: string;
    name: string;
    address?: string;
  };
  appointmentType: string;
}
```

### Schedule

```typescript
interface Schedule {
  id: string;
  date: string;
  slots: {
    id: string;
    start: string;
    end: string;
    status: 'free' | 'busy';
    appointmentId?: string;
    patient?: {
      id: string;
      name: string;
    };
  }[];
  workingHours: {
    start: string;
    end: string;
  };
}
```

### Report

```typescript
interface Report {
  id: string;
  title: string;
  date: string;
  patient: {
    id: string;
    name: string;
  };
  type: string;
  status: string;
}
```

### Medication

```typescript
interface Medication {
  id: string;
  name: string;
  dosage: string;
  patient: {
    id: string;
    name: string;
  };
  status: string;
  datePrescribed: string;
}
```

### Lab Result

```typescript
interface LabResult {
  id: string;
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'high' | 'low' | 'critical' | 'unknown';
  patient: {
    id: string;
    name: string;
  };
  date: string;
}
```

### Statistics

```typescript
interface Statistics {
  totalPatients: number;
  newPatients: number;
  totalAppointments: number;
  upcomingAppointments: number;
  todayAppointments: number;
  pendingLabResults: number;
}
```

### Error

```typescript
interface Error {
  component: string;
  message: string;
}
```

## Error Handling

The API returns partial data even if some components fail to load. The `errors` array in the response will contain information about any components that failed to load.

If a component fails to load, its corresponding property in the response will be `null`. For example, if the `reports` component fails to load, the `reports` property will be `null`, and an error will be added to the `errors` array.

## Caching

Dashboard data is cached for 60 seconds to improve performance. Each practitioner's dashboard data is cached separately.

## Rate Limiting

The API is rate-limited to prevent abuse. The default rate limit is 30 requests per minute per IP address.

## Test Accounts

For testing purposes, you can use the following test accounts:

### Practitioner Account

- **Email**: doctor@med.com
- **Password**: Doctor123!
- **Role**: PRACTITIONER

### Patient Accounts

- **Email**: patient@example.com
- **Password**: Patient123!
- **Role**: PATIENT

- **Email**: alice@example.com
- **Password**: Patient123!
- **Role**: PATIENT

- **Email**: bob@example.com
- **Password**: Patient123!
- **Role**: PATIENT

## Implementation Notes

### Frontend Integration

When integrating with the practitioner dashboard API, consider the following:

1. **Authentication**: Store the JWT token securely and include it in all API requests.
2. **Error Handling**: Handle partial data responses gracefully. Display available data even if some components fail to load.
3. **Loading States**: Implement loading states for each component to provide feedback to users during data retrieval.
4. **Caching**: Consider implementing client-side caching to reduce API calls and improve performance.

### Example React Integration

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PractitionerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/practitioner-dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setDashboardData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="practitioner-dashboard">
      {dashboardData && (
        <>
          <h1>Welcome, {dashboardData.profile?.name}</h1>
          
          <div className="dashboard-statistics">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Patients</h3>
                <p>{dashboardData.statistics.totalPatients}</p>
              </div>
              <div className="stat-card">
                <h3>Today's Appointments</h3>
                <p>{dashboardData.statistics.todayAppointments}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Lab Results</h3>
                <p>{dashboardData.statistics.pendingLabResults}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-appointments">
            <h2>Upcoming Appointments</h2>
            {dashboardData.appointments ? (
              <ul>
                {dashboardData.appointments.map(appointment => (
                  <li key={appointment.id}>
                    <p>{new Date(appointment.start).toLocaleString()}</p>
                    <p>{appointment.patient.name}</p>
                    <p>{appointment.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Failed to load appointments</p>
            )}
          </div>
          
          {/* Add more sections for patients, schedule, reports, medications, and lab results */}
          
          {dashboardData.errors && dashboardData.errors.length > 0 && (
            <div className="dashboard-errors">
              <h2>Errors</h2>
              <ul>
                {dashboardData.errors.map((error, index) => (
                  <li key={index}>
                    {error.component}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PractitionerDashboard;
```

## Support

For support or questions about the API, please contact the development team at api-support@example.com. 