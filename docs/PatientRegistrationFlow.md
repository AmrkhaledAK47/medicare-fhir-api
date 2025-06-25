# Patient Registration Flow

## Overview

The patient registration flow in the MediCare system follows a secure multi-step process designed to ensure proper identity verification while maintaining a good user experience. This document outlines the complete flow from patient resource creation by an administrator to the patient's successful login and access to their health records.

## Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │         │             │
│    Admin    │         │   System    │         │   Patient   │         │  Database   │
│             │         │             │         │             │         │             │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │                       │
       │  Create Patient       │                       │                       │
       │  Resource             │                       │                       │
       │─────────────────────>│                       │                       │
       │                       │                       │                       │
       │                       │  Store Patient Data   │                       │
       │                       │──────────────────────>│                       │
       │                       │                       │                       │
       │                       │  Generate Access Code │                       │
       │                       │───────────────────────┐                       │
       │                       │                       │                       │
       │                       │  Send Email with      │                       │
       │                       │  Access Code          │                       │
       │                       │─────────────────────>│                       │
       │                       │                       │                       │
       │                       │                       │  Verify Access Code   │
       │                       │                       │─────────────────────>│
       │                       │                       │                       │
       │                       │                       │  Complete Registration│
       │                       │                       │─────────────────────>│
       │                       │                       │                       │
       │                       │                       │  Login                │
       │                       │                       │─────────────────────>│
       │                       │                       │                       │
       │                       │                       │  Access FHIR Resources│
       │                       │                       │─────────────────────>│
       │                       │                       │                       │
```

## Detailed Process

### 1. Administrator Creates Patient Resource

An administrator with appropriate permissions initiates the patient registration process by creating a FHIR Patient resource along with a corresponding user profile in the system.

**Key actions:**
- Admin logs in to the system
- Admin creates a new Patient resource with demographic information
- Admin provides patient's email address and phone number
- System creates a FHIR Patient resource with a unique identifier
- System creates a user profile with "pending" status
- System generates a secure access code

### 2. Access Code Delivery

The system automatically sends an email to the patient's provided email address containing:
- A welcome message
- Instructions for completing registration
- The unique access code
- A link to the registration page

### 3. Patient Verifies Access Code

The patient receives the email and follows the registration link:
- Patient enters their email address and the provided access code
- System validates the access code against the stored value
- If valid, the system allows the patient to proceed to registration

### 4. Patient Completes Registration

After access code verification, the patient completes their registration:
- Patient creates a secure password
- Patient confirms their personal information
- System updates the user status from "pending" to "active"
- System links the user account to the existing FHIR Patient resource

### 5. Patient Login and Access

Once registered, the patient can:
- Log in using their email and password
- Access their personal health information
- View their FHIR Patient resource data
- Interact with other authorized FHIR resources (e.g., Observations, Conditions)

## Security Considerations

- **Access Code Security**: Access codes are cryptographically secure, single-use, and time-limited
- **Password Requirements**: Strong password policies are enforced during registration
- **Data Protection**: All sensitive data is encrypted both in transit and at rest
- **Authorization**: Patients can only access their own resources, enforced by SMART on FHIR authorization

## Error Handling

- **Invalid Access Code**: After 3 failed attempts, the access code is invalidated
- **Expired Access Code**: Access codes expire after 24 hours
- **Email Delivery Failures**: Administrators can regenerate and resend access codes
- **Duplicate Registrations**: System prevents creating duplicate accounts for the same email

## Testing the Flow

A Postman collection is available at `docs/MediCare_Patient_Flow.postman_collection.json` to test the complete patient registration flow. Import this collection into Postman and set up the required environment variables to test each step of the process.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Administrator or patient login |
| `/api/users/with-resource` | POST | Create patient resource and user profile |
| `/api/auth/verify-access-code` | POST | Verify the access code |
| `/api/auth/register` | POST | Complete patient registration |
| `/api/users/profile` | GET | Get user profile information |
| `/api/fhir/Patient/{id}` | GET | Get patient FHIR resource |
| `/api/users/regenerate-access-code` | POST | Regenerate access code (admin only) | 