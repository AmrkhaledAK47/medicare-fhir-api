# MediCare FHIR API Authentication Flow

This document outlines the authentication flow for the MediCare FHIR API, focusing on how users are registered, authenticated, and authorized to access FHIR resources.

## Overview

The authentication system follows these key principles:

1. **Role-Based Access Control (RBAC)**: Users have specific roles (admin, practitioner, patient) that determine their access permissions.
2. **Access Code System**: New users are invited via access codes, which are sent by email.
3. **FHIR Resource Integration**: User accounts are linked to FHIR resources (Patient or Practitioner).

## Authentication Flow

### 1. Admin Creates FHIR Resources with Access Codes

An admin creates Patient or Practitioner resources directly in the FHIR server and generates access codes for registration:

```
POST /api/fhir/Patient/with-access-code?email=patient@example.com
POST /api/fhir/Practitioner/with-access-code?email=doctor@example.com
```

This process:
- Creates a FHIR resource (Patient or Practitioner)
- Generates a unique access code
- Sends an email to the specified address with the access code
- Stores the relationship between the access code and the FHIR resource

### 2. User Registration with Access Code

Users receive their access code via email and use it to register:

```
POST /api/auth/register
```

With payload:
```json
{
  "name": "John Doe",
  "email": "patient@example.com",
  "password": "securepassword",
  "accessCode": "ABC123"
}
```

The system:
- Verifies the access code is valid and not expired
- Creates a user account with the appropriate role (patient or practitioner)
- Links the user account to the FHIR resource
- Marks the access code as used
- Returns a JWT token for authentication

### 3. User Login

Registered users can log in:

```
POST /api/auth/login
```

With payload:
```json
{
  "email": "patient@example.com",
  "password": "securepassword"
}
```

The system:
- Verifies credentials
- Returns a JWT token for authentication

### 4. Accessing Protected Resources

Authenticated users can access resources based on their role:

```
GET /api/fhir/Patient/{id}
GET /api/fhir/Observation?subject=Patient/{id}
```

The system:
- Validates the JWT token
- Checks if the user has permission to access the requested resource
- Returns the resource if authorized

## Special Cases

### First Admin User

The first user to register without an access code is automatically assigned the admin role. This allows for initial system setup.

### Password Reset

Users can request a password reset:

```
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Technical Implementation

### JWT Authentication

- Tokens contain: user ID, email, and role
- Default expiration: 7 days
- Protected routes use `JwtAuthGuard`

### Role-Based Guards

The `RolesGuard` checks if a user has the required role to access a specific endpoint.

### Access Code Security

- Access codes expire after a configurable period (default: 7 days)
- Codes are single-use only
- Email verification ensures the code is used by the intended recipient

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register with access code
- `POST /api/auth/login`: User login
- `POST /api/auth/verify-access-code`: Verify access code validity
- `POST /api/auth/forgot-password`: Request password reset
- `POST /api/auth/reset-password`: Reset password with code
- `GET /api/auth/me`: Get current user profile

### Access Codes (Admin Only)

- `POST /api/access-codes`: Create access code
- `POST /api/access-codes/batch`: Create multiple access codes
- `POST /api/access-codes/resend/{id}`: Resend access code email
- `GET /api/access-codes`: List all access codes

### FHIR Resources with Access Codes (Admin Only)

- `POST /api/fhir/Patient/with-access-code`: Create Patient with access code
- `POST /api/fhir/Practitioner/with-access-code`: Create Practitioner with access code

## Security Considerations

- All passwords are hashed using bcrypt
- Access codes are securely generated using crypto.randomBytes
- JWT tokens are signed with a secure secret
- Email notifications are sent for security-related events 