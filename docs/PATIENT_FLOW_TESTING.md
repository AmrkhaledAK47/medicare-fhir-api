# MediCare FHIR API: Patient Flow Testing Guide

This document provides a step-by-step guide for testing the complete patient flow in the MediCare FHIR API, from admin login to patient registration and access.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Admin Login](#admin-login)
3. [Create Patient Resource](#create-patient-resource)
4. [Verify Access Code](#verify-access-code)
5. [Patient Registration](#patient-registration)
6. [Patient Login](#patient-login)
7. [Access Patient Data](#access-patient-data)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- [Postman](https://www.postman.com/downloads/) installed
- MediCare FHIR API running locally or on a server
- Base URL for the API (default: `http://localhost:3000/api`)

## Admin Login

First, we need to log in as an admin to create a patient resource.

### Request

```
POST /api/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

### Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6123456789abcdef01234567",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active"
  }
}
```

**Important:** Save the `accessToken` for subsequent requests.

## Create Patient Resource

Now, we'll create a patient resource with the admin token. This will generate an access code that will be sent to the patient's email.

### Request

```
POST /api/users/with-resource
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_access_token>
```

**Body:**
```json
{
  "name": "John Smith",
  "email": "patient@example.com",
  "role": "patient",
  "phone": "+1234567890",
  "resourceData": {
    "name": [
      {
        "family": "Smith",
        "given": ["John"]
      }
    ],
    "gender": "male",
    "birthDate": "1980-07-15",
    "telecom": [
      {
        "system": "phone",
        "value": "+1234567890",
        "use": "mobile"
      },
      {
        "system": "email",
        "value": "patient@example.com"
      }
    ],
    "address": [
      {
        "use": "home",
        "line": ["123 Main St"],
        "city": "Anytown",
        "state": "CA",
        "postalCode": "12345",
        "country": "USA"
      }
    ]
  }
}
```

### Response

```json
{
  "user": {
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "pending",
    "phone": "+1234567890",
    "fhirResourceId": "4",
    "fhirResourceType": "Patient",
    "_id": "6123456789abcdef01234568"
  },
  "resourceId": "4",
  "message": "User created successfully. An access code has been sent to the user's email."
}
```

**Note:** The system will automatically send an access code to the email address provided. For testing purposes, you can check the console logs of the server to see the access code, as it's logged there when email sending is disabled.

## Verify Access Code

Before registration, you can verify if the access code is valid.

### Request

```
POST /api/auth/verify-access-code
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "patient@example.com",
  "accessCode": "ABC123XYZ"  // Replace with the actual access code
}
```

### Response

```json
{
  "valid": true,
  "user": {
    "email": "patient@example.com",
    "name": "John Smith"
  }
}
```

## Patient Registration

Now the patient can register using the access code.

### Request

```
POST /api/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Smith",
  "email": "patient@example.com",
  "password": "Patient123!",
  "repeatPassword": "Patient123!",
  "accessCode": "ABC123XYZ",  // Replace with the actual access code
  "phone": "+1234567890"
}
```

### Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6123456789abcdef01234568",
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "phone": "+1234567890",
    "fhirResourceId": "4",
    "fhirResourceType": "Patient"
  }
}
```

## Patient Login

After registration, the patient can log in.

### Request

```
POST /api/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "patient@example.com",
  "password": "Patient123!"
}
```

### Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6123456789abcdef01234568",
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "phone": "+1234567890",
    "fhirResourceId": "4",
    "fhirResourceType": "Patient"
  }
}
```

## Access Patient Data

Now the patient can access their own data.

### Get Patient Profile

#### Request

```
GET /api/users/profile
```

**Headers:**
```
Authorization: Bearer <patient_access_token>
```

#### Response

```json
{
  "id": "6123456789abcdef01234568",
  "name": "John Smith",
  "email": "patient@example.com",
  "role": "patient",
  "status": "active",
  "phone": "+1234567890",
  "profileImageUrl": null,
  "isEmailVerified": true,
  "fhirDetails": {
    "resourceType": "Patient",
    "id": "4",
    "details": {
      "resourceType": "Patient",
      "id": "4",
      "name": [
        {
          "family": "Smith",
          "given": ["John"]
        }
      ],
      "gender": "male",
      "birthDate": "1980-07-15",
      "telecom": [
        {
          "system": "phone",
          "value": "+1234567890",
          "use": "mobile"
        },
        {
          "system": "email",
          "value": "patient@example.com"
        }
      ],
      "address": [
        {
          "use": "home",
          "line": ["123 Main St"],
          "city": "Anytown",
          "state": "CA",
          "postalCode": "12345",
          "country": "USA"
        }
      ]
    }
  }
}
```

### Get Patient FHIR Resource

#### Request

```
GET /api/fhir/Patient/4
```

**Headers:**
```
Authorization: Bearer <patient_access_token>
```

#### Response

```json
{
  "resourceType": "Patient",
  "id": "4",
  "name": [
    {
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1980-07-15",
  "telecom": [
    {
      "system": "phone",
      "value": "+1234567890",
      "use": "mobile"
    },
    {
      "system": "email",
      "value": "patient@example.com"
    }
  ],
  "address": [
    {
      "use": "home",
      "line": ["123 Main St"],
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "USA"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Invalid Credentials**
   - Make sure you're using the correct email and password
   - Check if the user account is active

2. **Access Code Issues**
   - Access codes expire after 24 hours
   - Check server logs for the correct access code if email delivery is disabled
   - Ensure the email matches the one used when creating the user

3. **Authorization Issues**
   - Ensure the JWT token is valid and not expired
   - Make sure you're including the "Bearer " prefix in the Authorization header

4. **FHIR Resource Access**
   - Patients can only access their own resources
   - Verify that the FHIR resource ID matches the one associated with the user

### Checking Server Logs

If you're running the server locally, you can check the console logs to see:
- Access codes generated for users
- Email sending attempts
- Authentication errors

Example log for access code:
```
========================================
EMAIL SENT: Registration code for patient@example.com
ACCESS CODE: ABC123XYZ
========================================
```

### Getting a New Access Code

If the access code has expired, an admin can generate a new one:

#### Request

```
POST /api/users/regenerate-access-code
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_access_token>
```

**Body:**
```json
{
  "email": "patient@example.com"
}
```

#### Response

```json
{
  "message": "Access code regenerated and sent successfully"
}
``` 