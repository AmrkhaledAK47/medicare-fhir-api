# MediCare Dashboard & Profile API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Dashboard API](#dashboard-api)
4. [User Profile Management](#user-profile-management)
5. [Profile Picture / Avatar Management](#profile-picture--avatar-management)
6. [Patient's Chronic Diseases](#patients-chronic-diseases)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Integration Best Practices](#integration-best-practices)
10. [Example Usage](#example-usage)

## Introduction

This document provides comprehensive documentation for integrating with the MediCare Dashboard and Profile APIs. These APIs enable frontend applications to retrieve aggregated patient data, manage user profiles, and handle profile pictures/avatars.

### Architecture Overview

MediCare follows a hybrid data storage approach:
- **MongoDB**: Stores user authentication and basic profile data
- **HAPI FHIR**: Stores all clinical/health data in standard FHIR format

The Dashboard API aggregates data from both sources to provide a unified view for the frontend application.

## Authentication

All API endpoints require JWT token authentication.

### Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "Patient123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6123456789abcdef12345678",
      "name": "Patient Name",
      "email": "patient@example.com",
      "role": "patient",
      "status": "active",
      "fhirResourceId": "123456",
      "fhirResourceType": "Patient"
    }
  }
}
```

### Using the Token

Include the JWT token in the `Authorization` header for all subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Current User Profile

**Endpoint:** `GET /api/auth/me`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6123456789abcdef12345678",
    "name": "Patient Name",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "phone": "+1234567890",
    "profileImageUrl": "/uploads/f123456-example.jpg",
    "fhirResourceId": "123456",
    "fhirResourceType": "Patient",
    "permissions": [],
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-02T14:30:00.000Z"
  }
}
```

## Dashboard API

The Dashboard API provides a unified view of patient data by aggregating multiple components.

### Get Dashboard Data

**Endpoint:** `GET /api/dashboard`

**Access Control:** Restricted to users with the `patient` role only.

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "6123456789abcdef12345678",
      "name": "Patient Name",
      "email": "patient@example.com",
      "role": "patient",
      "status": "active",
      "phone": "+1234567890",
      "profileImageUrl": "/uploads/f123456-example.jpg",
      "isEmailVerified": true,
      "fhirDetails": {
        "resourceType": "Patient",
        "resourceId": "123456",
        "details": {
          "name": "Patient Full Name",
          "gender": "male",
          "birthDate": "1980-01-01",
          "address": "123 Main St, City, State, 12345",
          "telecom": [
            {
              "system": "phone",
              "value": "+1234567890",
              "use": "home"
            },
            {
              "system": "email",
              "value": "patient@example.com",
              "use": "work"
            }
          ],
          "photo": "/uploads/f123456-example.jpg"
        }
      },
      "diseases": {
        "speech": [
          "Speech Disorder",
          "Communication Difficulty"
        ],
        "physical": [
          "Hypertension",
          "Type 2 Diabetes",
          "Asthma"
        ]
      }
    },
    "biomarkers": [
      {
        "type": "heart",
        "name": "Blood Pressure",
        "value": "120/80",
        "unit": "mmHg",
        "referenceRange": "90/60 - 120/80",
        "status": "normal",
        "date": "2023-06-01T10:30:00Z",
        "performer": "Dr. Smith"
      },
      {
        "type": "kidney",
        "name": "eGFR",
        "value": "95",
        "unit": "mL/min/1.73m²",
        "referenceRange": ">60",
        "status": "normal",
        "date": "2023-05-15T14:20:00Z"
      }
    ],
    "appointments": [
      {
        "id": "appointment123",
        "start": "2023-07-15T09:30:00Z",
        "end": "2023-07-15T10:00:00Z",
        "description": "Annual physical examination",
        "status": "booked",
        "practitioner": {
          "id": "practitioner456",
          "name": "Dr. Jane Smith",
          "speciality": "Family Medicine"
        },
        "location": {
          "id": "location789",
          "name": "Medical Center",
          "address": "456 Health Ave, City, State, 12345"
        },
        "appointmentType": "in-person"
      }
    ],
    "calendar": [
      {
        "date": "2023-07-15",
        "events": [
          {
            "id": "appointment123",
            "title": "Annual physical examination with Dr. Jane Smith",
            "time": "09:30",
            "type": "appointment"
          },
          {
            "id": "reminder456",
            "title": "Take medication",
            "time": "18:00",
            "type": "reminder"
          }
        ]
      }
    ],
    "quickActions": [
      {
        "id": "qa1",
        "title": "Schedule Consultation",
        "description": "Book an appointment with your doctor",
        "url": "/appointment/new",
        "type": "consultation",
        "icon": "calendar-plus"
      },
      {
        "id": "qa2",
        "title": "Find Nearest Hospital",
        "description": "Locate healthcare facilities near you",
        "url": "/facilities/map",
        "type": "location",
        "icon": "map-marker"
      },
      {
        "id": "qa3",
        "title": "Emergency Contact",
        "description": "Call emergency services",
        "url": "tel:911",
        "type": "emergency",
        "icon": "phone-emergency"
      }
    ]
  }
}
```

### Dashboard Components

The dashboard is composed of the following components:

1. **Profile**: Basic user information and FHIR patient details
2. **Biomarkers**: Health measurements categorized by type (heart, kidney, liver, etc.)
3. **Appointments**: Upcoming scheduled appointments
4. **Calendar**: Events organized by date
5. **Quick Actions**: Shortcuts to common patient actions

### Caching Strategy

All dashboard components are cached in Redis with a 60-second TTL. This improves performance and reduces load on the FHIR server while ensuring data remains relatively fresh.

### Partial Success Handling

If one or more dashboard components fail to load, the API will still return the successful components along with an `errors` array indicating which components failed:

```json
{
  "success": true,
  "data": {
    "profile": { ... },
    "appointments": [ ... ],
    "calendar": [ ... ],
    "quickActions": [ ... ],
    "errors": [
      "Failed to load biomarkers: Connection timeout"
    ]
  }
}
```

## User Profile Management

### Get User Profile

**Endpoint:** `GET /api/users/:id/profile`

**Access Control:** Users can only access their own profiles unless they have the `admin` role.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6123456789abcdef12345678",
    "name": "Patient Name",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "phone": "+1234567890",
    "profileImageUrl": "/uploads/f123456-example.jpg",
    "isEmailVerified": true,
    "fhirDetails": {
      "resourceType": "Patient",
      "id": "123456",
      "details": {
        // FHIR resource details
      }
    }
  }
}
```

### Get FHIR Patient Profile

**Endpoint:** `GET /api/fhir/Patient/$my-profile`

**Access Control:** Restricted to users with the `patient` role.

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceType": "Patient",
    "id": "123456",
    "active": true,
    "name": [
      {
        "use": "official",
        "family": "Smith",
        "given": ["John", "Adam"]
      }
    ],
    "gender": "male",
    "birthDate": "1980-01-01",
    "address": [
      {
        "use": "home",
        "line": ["123 Main St"],
        "city": "Anytown",
        "state": "CA",
        "postalCode": "12345",
        "country": "USA"
      }
    ],
    "telecom": [
      {
        "system": "phone",
        "value": "+1234567890",
        "use": "home"
      }
    ],
    "photo": [
      {
        "contentType": "image/jpeg",
        "url": "http://localhost:3000/api/uploads/f123456-example.jpg",
        "title": "Profile photo for John Smith"
      }
    ]
  }
}
```

### Get FHIR Practitioner Profile

**Endpoint:** `GET /api/fhir/Practitioner/$my-profile`

**Access Control:** Restricted to users with the `practitioner` role.

**Response:** Similar to the Patient profile but with Practitioner-specific fields.

## Profile Picture / Avatar Management

### Update User Avatar

**Endpoint:** `PATCH /api/users/:id/avatar`

**Access Control:** Users can only update their own avatar unless they have the `admin` role.

**Content-Type:** `multipart/form-data`

**Request:**
```
form-data:
  avatar: [file upload]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Avatar updated successfully",
    "avatarUrl": "/uploads/f123456-example.jpg"
  }
}
```

### Default Avatar Generation

If a user does not have a profile picture, the system generates a default avatar with the first letter of their name in a colored circle. This is provided as a data URL in the `profileImageUrl` field:

```
data:image/svg+xml;base64,...
```

### Avatar Storage and Synchronization

When a user uploads an avatar:

1. The image file is stored in the `/uploads` directory
2. The MongoDB user document is updated with the `profileImageUrl` path
3. The corresponding FHIR resource (Patient or Practitioner) is updated with the same image URL

This ensures consistency across the authentication system and the FHIR clinical data.

## Patient's Chronic Diseases

### Disease Data Structure

The Dashboard API includes chronic diseases in the patient profile, categorized by type:

```json
"diseases": {
  "speech": [
    "Speech Disorder",
    "Communication Difficulty"
  ],
  "physical": [
    "Hypertension",
    "Type 2 Diabetes",
    "Asthma"
  ]
}
```

### Retrieving Chronic Diseases

Chronic diseases are automatically retrieved from the patient's FHIR Condition resources. The system:

1. Queries FHIR for Conditions with `clinical-status=active` for the patient
2. Processes and categorizes the conditions into "speech" and "physical" types
3. Extracts human-readable disease names from the FHIR coding systems

## Data Models

### User Model (MongoDB)

```typescript
class User {
    name: string;
    email: string;
    password: string; // Hashed
    role: 'admin' | 'patient' | 'practitioner';
    status: 'pending' | 'active' | 'inactive';
    phone?: string;
    profileImageUrl?: string;
    fhirResourceId?: string;
    fhirResourceType?: string;
    isEmailVerified: boolean;
    permissions: string[];
}
```

### UserProfileDto

```typescript
class UserProfileDto {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    phone?: string;
    profileImageUrl?: string;
    isEmailVerified: boolean;
    fhirDetails?: FhirResourceDetailsDto;
    diseases?: {
        speech: string[];
        physical: string[];
    };
}
```

### BiomarkerDto

```typescript
class BiomarkerDto {
    type: string;
    name: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    status: 'normal' | 'high' | 'low' | 'critical' | 'unknown';
    date?: string;
    performer?: string;
}
```

### AppointmentDto

```typescript
class AppointmentDto {
    id: string;
    start: string;
    end?: string;
    description: string;
    status: string;
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
    appointmentType: string;
}
```

### CalendarEventDto

```typescript
class CalendarEventDto {
    date: string;
    events: {
        id: string;
        title: string;
        time: string;
        type: string;
    }[];
}
```

### QuickActionDto

```typescript
class QuickActionDto {
    id: string;
    title: string;
    description: string;
    url: string;
    type: string;
    icon: string;
}
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Not authorized to access the resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "error": "ERROR_CODE"
}
```

### Common Error Codes

- `INVALID_CREDENTIALS`: Invalid email or password
- `USER_NOT_FOUND`: User not found
- `RESOURCE_NOT_FOUND`: FHIR resource not found
- `PERMISSION_DENIED`: User does not have permission
- `INVALID_INPUT`: Invalid input data
- `SERVER_ERROR`: Internal server error

## Integration Best Practices

### 1. Proper Authentication Flow

1. Log in and store the JWT token securely (e.g., in HttpOnly cookies or secure storage)
2. Include the token in all subsequent requests
3. Handle token expiration gracefully by redirecting to the login page

### 2. Dashboard Loading States

1. Show loading indicators while the dashboard data is being fetched
2. Handle partial success scenarios by displaying available components
3. Implement retry logic for failed components

### 3. Error Handling

1. Display user-friendly error messages
2. Provide appropriate fallbacks for missing data
3. Implement proper validation for user inputs

### 4. Profile Picture Guidelines

1. Implement client-side image validation (size, format, dimensions)
2. Show a preview before uploading
3. Display default avatars when profile pictures are not available
4. Handle image upload errors gracefully

### 5. Performance Optimization

1. Avoid unnecessary refetching of dashboard data (respect the 60-second cache TTL)
2. Implement lazy loading for dashboard components
3. Consider implementing progressive image loading for avatars

## Example Usage

### Dashboard Integration

```javascript
// Example using fetch API
async function fetchDashboard() {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    const response = await fetch('http://localhost:3000/api/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Handle successful response
      setProfile(data.data.profile);
      setBiomarkers(data.data.biomarkers || []);
      setAppointments(data.data.appointments || []);
      setCalendar(data.data.calendar || []);
      setQuickActions(data.data.quickActions || []);
      
      // Handle partial success
      if (data.data.errors && data.data.errors.length > 0) {
        data.data.errors.forEach(error => {
          console.error(`Dashboard component error: ${error}`);
          showToast(`Warning: ${error}`, 'warning');
        });
      }
    } else {
      // Handle error
      showToast(data.message || 'Failed to load dashboard', 'error');
    }
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    showToast('Failed to connect to the server', 'error');
  } finally {
    setLoading(false);
  }
}
```

### Avatar Upload Integration

```javascript
// Example using fetch API
async function uploadAvatar(userId, file) {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`http://localhost:3000/api/users/${userId}/avatar`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update UI with new avatar URL
      setAvatarUrl(data.data.avatarUrl);
      showToast('Avatar updated successfully', 'success');
      
      // Refresh profile data to get updated FHIR resource
      await fetchDashboard();
      
      return data.data.avatarUrl;
    } else {
      showToast(data.message || 'Failed to update avatar', 'error');
      return null;
    }
  } catch (error) {
    console.error('Avatar upload error:', error);
    showToast('Failed to upload avatar', 'error');
    return null;
  }
}
``` 