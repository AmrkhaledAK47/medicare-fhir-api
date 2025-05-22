# MediCare FHIR API Documentation

This document provides comprehensive documentation for the MediCare FHIR API, including endpoints, authentication, and role-specific access controls.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [API Base URLs](#api-base-urls)
5. [API Endpoints](#api-endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [User Endpoints](#user-endpoints)
   - [FHIR Resource Endpoints](#fhir-resource-endpoints)
   - [Role-Specific Endpoints](#role-specific-endpoints)
6. [Error Handling](#error-handling)
7. [Pagination and Filtering](#pagination-and-filtering)

## Introduction

The MediCare FHIR API provides a RESTful interface for interacting with healthcare data using the HL7 FHIR (Fast Healthcare Interoperability Resources) standard. The API supports various healthcare resources, authentication, and role-based access controls.

## Authentication

All API endpoints (except login and registration) require authentication using JSON Web Tokens (JWT).

### Obtaining a Token

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123456789",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin|patient|practitioner",
    "status": "active"
  }
}
```

### Using the Token

Include the token in the `Authorization` header of all subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## User Roles and Permissions

The system supports three user roles, each with different permissions:

### Admin
- Can access all endpoints
- Full CRUD capabilities on all resources
- Can manage users and assign roles
- Can access system statistics and configuration

### Practitioner
- Can view all patient data
- Can create and update medical records
- Can access patient demographics and statistics
- Limited ability to modify system configuration

### Patient
- Can view their own medical records only
- Limited ability to update their personal information
- Cannot access other patients' data
- Cannot access system configuration

## API Base URLs

- **Authentication:** `/api/auth/`
- **User Management:** `/api/users/`
- **FHIR Resources:** `/api/fhir/`
- **Health Checks:** `/api/health/`

## API Endpoints

### Auth Endpoints

#### Register a New User

```
POST /api/auth/register
```

**Access:** Public  
**Request Body:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "Password123!",
  "repeatPassword": "Password123!",
  "accessCode": "ABC123XYZ"  // Optional, required for patient and practitioner accounts
}
```

#### Login

```
POST /api/auth/login
```

**Access:** Public  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

#### Verify Access Code

```
POST /api/auth/verify-access-code
```

**Access:** Public  
**Request Body:**
```json
{
  "email": "user@example.com",
  "accessCode": "ABC123XYZ"
}
```

#### Request Password Reset

```
POST /api/auth/forgot-password
```

**Access:** Public  
**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### Reset Password

```
POST /api/auth/reset-password
```

**Access:** Public  
**Request Body:**
```json
{
  "email": "user@example.com",
  "resetCode": "ABC123",
  "newPassword": "NewPassword123!"
}
```

### User Endpoints

#### Get All Users

```
GET /api/users
```

**Access:** Admin only  
**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Field to sort by (default: 'createdAt')
- `sortDirection`: 'asc' or 'desc' (default: 'desc')

#### Get User by ID

```
GET /api/users/:id
```

**Access:** Admin, or the user themselves

#### Create User

```
POST /api/users
```

**Access:** Admin only  
**Request Body:** User object

#### Update User

```
PUT /api/users/:id
```

**Access:** Admin, or the user themselves  
**Request Body:** Updated user fields

#### Delete User

```
DELETE /api/users/:id
```

**Access:** Admin only

#### Regenerate Access Code

```
POST /api/users/regenerate-access-code
```

**Access:** Admin only  
**Request Body:**
```json
{
  "userId": "123456789"
}
```

### FHIR Resource Endpoints

#### Get Resources by Type

```
GET /api/fhir/:resourceType
```

**Access:** 
- Admin: All resources
- Practitioner: All resources related to their patients
- Patient: Only their own resources

**Resource Types:** Patient, Practitioner, Organization, Encounter, Observation, DiagnosticReport, Medication, Questionnaire, Payment

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Field to sort by
- `sortDirection`: 'asc' or 'desc'
- Resource-specific filters vary by resource type

#### Get Resource by ID

```
GET /api/fhir/:resourceType/:id
```

**Access:** 
- Admin: All resources
- Practitioner: Resources related to their patients
- Patient: Only their own resources

#### Create Resource

```
POST /api/fhir/:resourceType
```

**Access:** Admin, Practitioner (with limitations)  
**Request Body:** FHIR resource object

#### Update Resource

```
PUT /api/fhir/:resourceType/:id
```

**Access:** Admin, Practitioner (with limitations)  
**Request Body:** Updated FHIR resource object

#### Delete Resource

```
DELETE /api/fhir/:resourceType/:id
```

**Access:** Admin only

### Role-Specific Endpoints

#### Patient Demographics

```
GET /api/fhir/Patient/demographics
```

**Access:** Admin, Practitioner  
**Description:** Returns statistical data about patients by age group and gender.

#### Patient Activity

```
GET /api/fhir/Patient/:id/activity
```

**Access:** Admin, Practitioner, or the patient themselves  
**Query Parameters:**
- `limit`: Number of activities to return (default: 5)

#### Health Check

```
GET /api/health
```

**Access:** Any authenticated user  
**Description:** Returns basic system health status.

#### FHIR Server Health

```
GET /api/health/fhir-server
```

**Access:** Admin only  
**Description:** Checks the health of the connected FHIR server.

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

## Pagination and Filtering

Most list endpoints support pagination and filtering:

### Pagination Parameters

- `page`: Page number (starting from 1)
- `limit`: Number of items per page
- `sort`: Field to sort by
- `sortDirection`: Sort direction ('asc' or 'desc')

### Response Format

```json
{
  "data": [...],
  "meta": {
    "totalItems": 100,
    "itemsPerPage": 10,
    "totalPages": 10,
    "currentPage": 1
  }
}
```

### Filtering

Each resource type supports different filtering options based on its properties. Common filters include:

- Patient: `name`, `gender`, `birthDate`, `address`
- Encounter: `status`, `class`, `date`, `patient`
- Observation: `code`, `date`, `patient`

Example:

```
GET /api/fhir/Patient?name=John&gender=male
```

### Date Filtering

Date fields can be filtered with ranges:

```
GET /api/fhir/Encounter?date=ge2023-01-01&date=le2023-12-31
```

Or using the date range format:

```
GET /api/fhir/Encounter?dateRange[start]=2023-01-01&dateRange[end]=2023-12-31
``` 