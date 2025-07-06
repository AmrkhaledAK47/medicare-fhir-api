# MediCare FHIR API Authentication Documentation

## Overview

This document provides comprehensive details on the authentication flow and integration points for the MediCare FHIR API. It outlines how frontend applications should interact with the authentication system, including registration, login, and access control mechanisms.

## Base URL

```
http://localhost:3000/api
```

## Authentication Flow

The MediCare platform uses a role-based authentication system with JWT tokens. There are three primary user roles:

- **Admin**: Can manage all resources and users
- **Practitioner**: Healthcare providers with access to their own data and assigned patients
- **Patient**: End-users with access to their own health records

### Authentication Flow Diagram

```
┌─────────┐         ┌─────────┐         ┌─────────────────┐
│  Admin  │         │  FHIR   │         │ Access Code     │
│  User   │────────▶│ Resource │────────▶│ Generation      │
└─────────┘         └─────────┘         └─────────┬───────┘
                                                  │
                                                  ▼
┌─────────┐         ┌─────────┐         ┌─────────────────┐
│  User   │         │ Register │         │ Email with      │
│         │◀───────▶│ Account │◀────────│ Access Code     │
└─────────┘         └─────────┘         └─────────────────┘
                         │
                         ▼
┌─────────┐         ┌─────────┐
│  User   │         │  JWT    │
│  Login  │────────▶│  Token  │
└─────────┘         └─────────┘
```

## Registration Process

### Step 1: Admin Creates FHIR Resource with Access Code

An admin must first create a Patient or Practitioner FHIR resource with an access code.

**Endpoint:**
```
POST /fhir/{resourceType}/with-access-code?email={user_email}
```

Where:
- `resourceType` is either `Patient` or `Practitioner`
- `user_email` is the email address of the user who will register

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {admin_token}
```

**Example Request (Patient):**
```json
{
  "resourceType": "Patient",
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1990-01-01"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "resource": {
      "id": "412",
      "resourceType": "Patient",
      "active": true,
      "name": [
        {
          "use": "official",
          "family": "Smith",
          "given": ["John"]
        }
      ],
      "gender": "male",
      "birthDate": "1990-01-01"
    },
    "accessCode": "ABC123XYZ"
  }
}
```

### Step 2: User Registers with Access Code

The user receives the access code (typically via email) and uses it to register.

**Endpoint:**
```
POST /auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "patient@example.com",
  "password": "SecurePassword123!",
  "repeatPassword": "SecurePassword123!",
  "accessCode": "ABC123XYZ"
}
```

**Example Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5f8b8c9e4c62b3d8b4567",
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "fhirResourceId": "412",
    "fhirResourceType": "Patient"
  }
}
```

## Login Process

**Endpoint:**
```
POST /auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "SecurePassword123!"
}
```

**Example Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5f8b8c9e4c62b3d8b4567",
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "fhirResourceId": "412",
    "fhirResourceType": "Patient"
  }
}
```

## User Profile

Retrieve the current user's profile information.

**Endpoint:**
```
GET /auth/me
```

**Headers:**
```
Authorization: Bearer {token}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "60d5f8b8c9e4c62b3d8b4567",
    "name": "John Smith",
    "email": "patient@example.com",
    "role": "patient",
    "status": "active",
    "fhirResourceId": "412",
    "fhirResourceType": "Patient",
    "permissions": [],
    "createdAt": "2023-06-21T15:30:00.000Z",
    "updatedAt": "2023-06-21T15:30:00.000Z"
  }
}
```

## JWT Token

The JWT token contains the following payload:

```json
{
  "sub": "60d5f8b8c9e4c62b3d8b4567",  // User ID
  "email": "patient@example.com",
  "role": "patient",
  "iat": 1624287000,
  "exp": 1624892800
}
```

**Token Expiration:** 7 days

## Using the JWT Token

Include the JWT token in the Authorization header for all protected API requests:

```
Authorization: Bearer {token}
```

## Error Responses

### Authentication Errors

| Status Code | Error                        | Description                                       |
|-------------|------------------------------|---------------------------------------------------|
| 401         | Invalid credentials          | Email or password is incorrect                    |
| 401         | Invalid or expired token     | JWT token is invalid or has expired               |
| 403         | Forbidden                    | User doesn't have permission for the resource     |
| 400         | Account not activated        | User account is pending activation                |
| 400         | Invalid access code          | The provided access code is invalid or expired    |
| 409         | User already exists          | Email is already registered                       |

## Test Accounts

For development and testing purposes, you can use the following accounts:

### Admin User
```
Email: admin@test.com
Password: Admin123
```

### Patient User
```
Email: patient@med.com
Password: Patient123!
```

### Practitioner User
```
Email: doctor@med.com
Password: Doctor123!
```

## Role-Based Access Control

The API implements role-based access control (RBAC) for different user types:

### Admin
- Can access and modify all resources
- Can create new users with access codes
- Can manage access codes

### Practitioner
- Can access their own profile
- Can access assigned patients' data
- Can create and update clinical resources for their patients

### Patient
- Can access their own profile and health data
- Can update limited fields in their own profile
- Cannot access other patients' data

## Integration Examples

### React Example (using Axios)

```javascript
import axios from 'axios';

// Configure axios
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

// Login function
const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, user } = response.data;
    
    // Store token and user info
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

// Register function
const register = async (name, email, password, repeatPassword, accessCode) => {
  try {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      repeatPassword,
      accessCode
    });
    
    const { accessToken, user } = response.data;
    
    // Store token and user info
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
};

// Get user profile
const getUserProfile = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get user profile:', error.response?.data || error.message);
    throw error;
  }
};

// Logout function
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
```

## Best Practices

1. **Token Storage**: Store the JWT token in secure storage (HttpOnly cookies when possible, or localStorage as a fallback)
2. **Token Refresh**: Implement token refresh logic if sessions need to last longer than the token expiration
3. **Error Handling**: Implement proper error handling for authentication failures
4. **Secure Routes**: Protect frontend routes based on user roles
5. **HTTPS**: Always use HTTPS in production environments

## Security Considerations

1. **XSS Protection**: Be cautious about storing tokens in localStorage as it's vulnerable to XSS attacks
2. **CSRF Protection**: Implement CSRF protection for cookie-based authentication
3. **Password Requirements**: Enforce strong password requirements (minimum 8 characters, including uppercase, lowercase, numbers, and special characters)
4. **Rate Limiting**: The API implements rate limiting to prevent brute force attacks

## Support

For any issues related to authentication, please contact the backend team at backend@medicare-example.com. 