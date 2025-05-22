# MediCare FHIR API

<div align="center">
  <img src="https://www.hl7.org/fhir/assets/images/fhir-logo-www.png" alt="FHIR Logo" width="300"/>
  <p><strong>A comprehensive FHIR-based Electronic Health Records (EHR) API with role-based access control and ML integration capabilities</strong></p>
</div>

<div align="center">
  <img src="https://hapifhir.io/hapi-fhir/images/logos/raccoon-forwards.png" alt="HAPI FHIR Logo" width="200" style="margin-top: 20px;"/>
  <p><em>Powered by HAPI FHIR - The open-source Java API for HL7 FHIR</em></p>
</div>

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![FHIR v4.0.1](https://img.shields.io/badge/FHIR-v4.0.1-green.svg)](https://www.hl7.org/fhir/)
[![NestJS](https://img.shields.io/badge/NestJS-v10.0.0-red.svg)](https://nestjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-v4.4+-darkgreen.svg)](https://www.mongodb.com/)

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Server](#running-the-server)
- [Architecture](#architecture)
  - [System Architecture](#system-architecture)
  - [Application Layers](#application-layers)
  - [Authentication Flow](#authentication-flow)
- [HAPI FHIR Integration](#hapi-fhir-integration)
  - [HAPI FHIR Overview](#hapi-fhir-overview)
  - [Integration Benefits](#integration-benefits)
  - [HAPI FHIR Server Setup](#hapi-fhir-server-setup)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Role-Based Access](#role-based-access)
  - [Core Endpoints](#core-endpoints)
    - [Auth Endpoints](#auth-endpoints)
    - [User Endpoints](#user-endpoints)
    - [FHIR Resource Endpoints](#fhir-resource-endpoints)
    - [Specific FHIR Resource Endpoints](#specific-fhir-resource-endpoints)
  - [Pagination](#pagination)
  - [Search Parameters](#search-parameters)
  - [Error Handling](#error-handling)
- [Integration Guide](#integration-guide)
  - [JavaScript/TypeScript Integration](#javascripttypescript-integration)
  - [Python Integration](#python-integration)
  - [FHIR Client Libraries](#fhir-client-libraries)
- [FHIR Resources](#fhir-resources)
  - [Supported Resources](#supported-resources)
  - [Resource Validation](#resource-validation)
- [Development Guide](#development-guide)
  - [Adding New Resources](#adding-new-resources)
  - [Custom Operations](#custom-operations)
  - [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [License](#license)

## Overview

MediCare FHIR API is a modern healthcare data platform built on the HL7 FHIR (Fast Healthcare Interoperability Resources) standard. It provides a RESTful interface for interacting with healthcare data, with robust role-based access controls to ensure data security and privacy.

The platform supports standard FHIR resources, including Patient, Practitioner, Encounter, Observation, DiagnosticReport, and more. It's designed to be extensible and can integrate with existing FHIR servers or operate standalone.

### Key Features

- **Fully FHIR R4 Compliant**: Implements FHIR R4 resources, search parameters, and operations
- **Secure Authentication**: JWT-based authentication with access code verification
- **Role-Based Access Control**: Granular permissions for Admin, Practitioner, and Patient roles
- **HAPI FHIR Integration**: Optional integration with HAPI FHIR server for advanced functionality
- **Advanced Search & Filtering**: Comprehensive search capabilities across all resources
- **Pagination**: Efficient data retrieval with standardized pagination patterns
- **Audit Logging**: Complete audit trail of all data access and modifications
- **Email Workflows**: Registration, password reset, and notification workflows

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - A progressive Node.js framework
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: [JWT](https://jwt.io/) with [Passport](http://www.passportjs.org/)
- **API Documentation**: [Swagger/OpenAPI](https://swagger.io/)
- **Validation**: [class-validator](https://github.com/typestack/class-validator)
- **FHIR Server**: [HAPI FHIR](https://hapifhir.io/) (optional integration)
- **Email**: [Nodemailer](https://nodemailer.com/)
- **Testing**: [Jest](https://jestjs.io/)
- **Containerization**: [Docker](https://www.docker.com/)

## Features

- **FHIR R4 Compliant**: Implements FHIR R4 resources, operations, and search parameters
- **Role-Based Access Control**: Admin, Practitioner, and Patient roles with granular permissions
- **Authentication & Authorization**: Secure JWT-based authentication with access code verification
- **Comprehensive API**: Full CRUD operations for all supported FHIR resources
- **Advanced Search**: Support for complex search parameters, chained search, and filtering
- **Pagination**: Efficient data retrieval with standardized pagination
- **Swagger Documentation**: Interactive API documentation with examples
- **Error Handling**: Consistent error responses using FHIR OperationOutcome format
- **Audit Logging**: Comprehensive audit trail of all data access and modifications
- **Email Notifications**: User registration, password reset, and system notifications
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Resource Validation**: Validate FHIR resources against profiles and business rules
- **User Avatar Management**: Upload and manage user profile images
- **Resource History**: Track and retrieve resource version history
- **Terminology Services**: Code validation, ValueSet expansion, and concept translation
- **Custom FHIR Operations**: Support for standard and custom FHIR operations ($everything, $validate, etc.)
- **File Uploads**: Support for file attachments and document references
- **User Registration with Access Codes**: Secure user onboarding process
- **Resource Relationship Management**: Handle references between related FHIR resources
- **Environment-Based Configuration**: Different settings for development, testing, and production

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (v4.4+)
- Docker and Docker Compose (optional, for HAPI FHIR server)
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/medicare-api.git
cd medicare-api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see [Environment Setup](#environment-setup))

4. Start the development server:

```bash
npm run start:dev
```

The API will be available at http://localhost:3000/api with Swagger documentation at http://localhost:3000/api/docs.

### Environment Setup

Create a `.env` file in the root directory:

```
# API Configuration
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000/api

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/medicare
MONGODB_TEST_URI=mongodb://localhost:27017/medicare_test

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
EMAIL_FROM=Medicare API <no-reply@medicare-api.com>

# HAPI FHIR Server (optional)
FHIR_SERVER_URL=http://localhost:9090/fhir
FHIR_SERVER_USERNAME=fhiruser
FHIR_SERVER_PASSWORD=fhirpassword

# Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5000000
```

### Running the Server

#### Development Mode

```bash
npm run start:dev
```

#### Production Mode

```bash
npm run build
npm run start:prod
```

#### With Docker

```bash
docker-compose up -d
```

## Architecture

The MediCare FHIR API follows a modular architecture based on NestJS:

```
src/
├── auth/             # Authentication and authorization
├── config/           # Configuration modules
├── email/            # Email service
├── fhir/             # FHIR resources and services
│   ├── controllers/  # Resource controllers
│   ├── dto/          # Data transfer objects
│   ├── schemas/      # MongoDB schemas
│   └── services/     # Resource services
├── health/           # Health check endpoints
├── users/            # User management
├── pagination/       # Pagination functionality
└── common/           # Shared utilities and interfaces
```

### System Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────────────────────┐    ┌─────────────────┐
│                 │     │                   MediCare API                        │    │                 │
│                 │     │  ┌───────────────┐         ┌───────────────┐         │    │                 │
│  Client Apps    │────▶│  │ Authentication│─────────▶ FHIR Resource │         │    │   MongoDB       │
│  (Web/Mobile)   │     │  │ & Authorization│◀────────│ Controllers   │───────────▶│   Database      │
│                 │◀────│  └───────────────┘         └───────────────┘         │    │                 │
└─────────────────┘     │           │                        │                  │    └─────────────────┘
                        │           │                        │                  │
                        │  ┌────────▼────────┐    ┌──────────▼──────────┐      │
                        │  │   User Service  │    │  FHIR Services      │      │
                        │  │                 │    │                     │      │
                        │  └─────────────────┘    └─────────────────────┘      │
                        │           │                        │                  │
                        │  ┌────────▼────────┐    ┌──────────▼──────────┐      │
                        │  │  Email Service  │    │ Validation Service  │      │    ┌─────────────────┐
                        │  │                 │    │                     │      │    │                 │
                        │  └─────────────────┘    └─────────────────────┘      │───▶│  External      │
                        │                                    │                  │    │  FHIR Server   │
                        │  ┌──────────────────┐   ┌──────────▼──────────┐      │◀───│  (HAPI FHIR)   │
                        │  │ Static File      │   │ Pagination &        │      │    │                 │
                        │  │ Server (Avatars) │   │ Search Services     │      │    └─────────────────┘
                        │  └──────────────────┘   └─────────────────────┘      │
                        │                                                       │
                        └───────────────────────────────────────────────────────┘
```

The updated architecture diagram shows:

1. **Client Applications** - Web and mobile clients that interact with the API
2. **MediCare API** - NestJS-based backend with these components:
   - **Authentication & Authorization** - Handles user authentication, JWT token generation, and permission checks
   - **FHIR Resource Controllers** - RESTful endpoints for FHIR resources
   - **User Service** - Manages user accounts and profiles
   - **Email Service** - Handles email notifications for registration, password reset, etc.
   - **FHIR Services** - Business logic for FHIR resource operations
   - **Validation Service** - Validates FHIR resources against profiles and business rules
   - **Static File Server** - Serves user avatars and other uploaded files
   - **Pagination & Search Services** - Handles efficient data retrieval and filtering
3. **MongoDB Database** - Persistent storage for user data and FHIR resources
4. **External HAPI FHIR Server** - Optional integration for advanced FHIR capabilities

### Application Layers

The application follows a clean architecture pattern with distinct layers:

1. **Controllers**: Handle HTTP requests and delegate to services
2. **Services**: Implement business logic and validation
3. **Repositories**: Interface with the database
4. **DTOs**: Define data transfer objects for validation
5. **Schemas**: Define database models
6. **Guards**: Implement authentication and authorization logic
7. **Interceptors**: Implement cross-cutting concerns

### Authentication Flow

1. User registers with email, password, and access code
2. System validates access code and creates user account
3. User logs in with email and password to receive JWT tokens
4. User includes token in Authorization header for subsequent requests
5. System validates token and grants appropriate permissions based on role

## HAPI FHIR Integration

### HAPI FHIR Overview

[HAPI FHIR](https://hapifhir.io) is the leading open-source implementation of the FHIR standard for healthcare interoperability. It provides a complete solution for working with FHIR resources and implementing FHIR servers and clients.

<div align="center">
  <img src="https://hapifhir.io/hapi-fhir/images/hapi-fhir-banner-dark.png" alt="HAPI FHIR" width="600"/>
</div>

Key features of HAPI FHIR include:

- Complete implementation of the FHIR standard
- Support for FHIR DSTU2, DSTU3, R4, and R5
- RESTful client and server frameworks
- Parsing and serialization
- Validation against profiles
- Terminology services (CodeSystem, ValueSet)
- Clinical reasoning and CQL support
- Master Data Management (MDM)
- Advanced search capabilities
- Transaction and batch processing
- Resource version history support

### Integration Benefits

The MediCare API integrates with HAPI FHIR in multiple ways:

1. **HAPI FHIR Client**: The API uses HAPI FHIR client libraries to interact with external FHIR servers
2. **HAPI FHIR Server**: The API can connect to a HAPI FHIR server as a backend for advanced FHIR capabilities
3. **HAPI FHIR Libraries**: The API utilizes HAPI FHIR libraries for validation, parsing, and resource handling

Benefits of integration include:

- **Advanced FHIR Capabilities**: Access to HAPI FHIR's comprehensive FHIR implementation
- **Terminology Services**: Code validation, ValueSet expansion, and concept translation
- **Resource Validation**: Validate resources against FHIR profiles and implementation guides
- **Interoperability**: Seamless connection with other FHIR-compliant systems
- **Performance Optimization**: Efficient search and retrieval of FHIR resources

### HAPI FHIR Server Setup

To use the HAPI FHIR server integration:

1. Start the HAPI FHIR server using Docker:

```bash
docker-compose -f hapi-fhir-docker-compose.yml up -d
```

2. Configure the MediCare API to use the HAPI FHIR server:

```
# .env file
FHIR_SERVER_URL=http://localhost:9090/fhir
FHIR_SERVER_USERNAME=fhiruser
FHIR_SERVER_PASSWORD=fhirpassword
```

3. Restart the MediCare API server:

```bash
npm run start:dev
```

Once configured, the API will automatically route appropriate FHIR operations to the HAPI FHIR server while still enforcing its own authentication and authorization rules. This provides the best of both worlds: the security and custom functionality of the MediCare API alongside the comprehensive FHIR capabilities of HAPI FHIR.

## API Documentation

### Authentication

All API endpoints (except login and registration) require authentication using JSON Web Tokens (JWT).

#### User Registration

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "securePassword123!",
  "repeatPassword": "securePassword123!",
  "accessCode": "ACCESS-CODE-123",
  "role": "patient"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "123456789",
    "name": "User Name",
    "email": "user@example.com",
    "role": "patient",
    "status": "pending"
  }
}
```

> **Note**: The first admin user can register without an access code. Subsequent users require a valid access code.

#### Obtaining a Token

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123456789",
    "name": "User Name",
    "email": "user@example.com",
    "role": "patient",
    "status": "active"
  }
}
```

#### Using Tokens in Requests

Include the token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access

The system supports three user roles, each with different permissions:

#### Admin
- Can access all endpoints
- Full CRUD capabilities on all resources
- Can manage users and assign roles
- Can access system statistics and configuration

#### Practitioner
- Can view all patient data
- Can create and update medical records
- Can access patient demographics and statistics
- Limited ability to modify system configuration

#### Patient
- Can view their own medical records only
- Limited ability to update their personal information
- Cannot access other patients' data
- Cannot access system configuration

### Core Endpoints

#### Auth Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `POST /api/auth/verify-access-code` - Verify access code for registration
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with code
- `POST /api/auth/refresh-token` - Get a new access token using refresh token

#### User Endpoints

- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/profile` - Get user profile with avatar
- `POST /api/users` - Create user (Admin only)
- `POST /api/users/with-resource` - Create user with FHIR resource
- `PATCH /api/users/:id/avatar` - Update user avatar
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

#### FHIR Resource Endpoints

- `GET /api/fhir/:resourceType` - Get resources by type
- `GET /api/fhir/:resourceType/:id` - Get resource by ID
- `GET /api/fhir/:resourceType/:id/_history` - Get resource version history
- `POST /api/fhir/:resourceType` - Create resource
- `PUT /api/fhir/:resourceType/:id` - Update resource
- `DELETE /api/fhir/:resourceType/:id` - Delete resource
- `POST /api/fhir/:resourceType/$validate` - Validate resource without saving
- `POST /api/fhir/$validate-batch` - Validate a batch of resources

#### Specific FHIR Resource Endpoints

##### Patient Endpoints
- `GET /api/fhir/Patient` - Get all patients
- `GET /api/fhir/Patient/:id` - Get patient by ID
- `GET /api/fhir/examples/paginated-patients` - Get paginated patient list
- `POST /api/fhir/Patient` - Create patient
- `PUT /api/fhir/Patient/:id` - Update patient
- `DELETE /api/fhir/Patient/:id` - Delete patient

##### Practitioner Endpoints
- `GET /api/fhir/Practitioner` - Get all practitioners
- `GET /api/fhir/Practitioner/:id` - Get practitioner by ID
- `GET /api/fhir/examples/paginated-practitioners` - Get paginated practitioner list
- `POST /api/fhir/Practitioner` - Create practitioner
- `PUT /api/fhir/Practitioner/:id` - Update practitioner
- `DELETE /api/fhir/Practitioner/:id` - Delete practitioner

##### Encounter Endpoints
- `GET /api/fhir/Encounter` - Get all encounters
- `GET /api/fhir/Encounter/:id` - Get encounter by ID
- `GET /api/fhir/Encounter/patient/:patientId` - Get encounters for patient
- `POST /api/fhir/Encounter` - Create encounter
- `PUT /api/fhir/Encounter/:id` - Update encounter
- `DELETE /api/fhir/Encounter/:id` - Delete encounter

##### Condition Endpoints
- `GET /api/fhir/Condition` - Get all conditions
- `GET /api/fhir/Condition/:id` - Get condition by ID
- `GET /api/fhir/Condition/$my-conditions` - Get current user's conditions
- `GET /api/fhir/Condition/patient/:patientId` - Get conditions for patient
- `GET /api/fhir/Condition/patient/:patientId/active` - Get active conditions for patient
- `GET /api/fhir/Condition/$by-category` - Get conditions by category
- `GET /api/fhir/Condition/encounter/:encounterId` - Get conditions for encounter
- `POST /api/fhir/Condition` - Create condition
- `PUT /api/fhir/Condition/:id` - Update condition
- `DELETE /api/fhir/Condition/:id` - Delete condition

##### Medication Endpoints
- `GET /api/fhir/Medication` - Get all medications
- `GET /api/fhir/Medication/:id` - Get medication by ID
- `GET /api/fhir/Medication/$common` - Get common medications
- `POST /api/fhir/Medication` - Create medication
- `PUT /api/fhir/Medication/:id` - Update medication
- `DELETE /api/fhir/Medication/:id` - Delete medication

##### MedicationRequest Endpoints
- `GET /api/fhir/MedicationRequest` - Get all medication requests
- `GET /api/fhir/MedicationRequest/:id` - Get medication request by ID
- `GET /api/fhir/MedicationRequest/$my-medications` - Get current user's medication requests
- `GET /api/fhir/MedicationRequest/patient/:patientId/active` - Get active medication requests for patient
- `GET /api/fhir/MedicationRequest/encounter/:encounterId` - Get medication requests for encounter
- `POST /api/fhir/MedicationRequest` - Create medication request
- `PUT /api/fhir/MedicationRequest/:id` - Update medication request
- `DELETE /api/fhir/MedicationRequest/:id` - Delete medication request

##### Procedure Endpoints
- `GET /api/fhir/Procedure` - Get all procedures
- `GET /api/fhir/Procedure/:id` - Get procedure by ID
- `GET /api/fhir/Procedure/$my-procedures` - Get current user's procedures
- `GET /api/fhir/Procedure/patient/:patientId` - Get procedures for patient
- `GET /api/fhir/Procedure/$by-code` - Get procedures by code
- `GET /api/fhir/Procedure/encounter/:encounterId` - Get procedures for encounter
- `POST /api/fhir/Procedure` - Create procedure
- `PUT /api/fhir/Procedure/:id` - Update procedure
- `DELETE /api/fhir/Procedure/:id` - Delete procedure

##### Questionnaire Endpoints
- `GET /api/questionnaires` - Get all questionnaires
- `GET /api/questionnaires/:id` - Get questionnaire by ID
- `POST /api/questionnaires` - Create questionnaire
- `PUT /api/questionnaires/:id` - Update questionnaire
- `DELETE /api/questionnaires/:id` - Delete questionnaire

##### Payment Endpoints
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

##### Terminology Endpoints
- `GET /api/fhir/terminology/validate-code` - Validate terminology code
- `GET /api/fhir/terminology/expand` - Expand value set
- `GET /api/fhir/terminology/translate` - Translate code between code systems
- `GET /api/fhir/terminology/lookup` - Look up code details
- `POST /api/fhir/terminology/find-matches` - Find matching codes

##### Documentation Endpoints
- `GET /api/fhir/documentation` - Get API documentation
- `GET /api/fhir/documentation/examples/:resourceType` - Get examples for resource type
- `GET /api/fhir/documentation/operations` - Get available operations
- `GET /api/fhir/documentation/usage` - Get API usage information

##### Health Check Endpoints
- `GET /api/health` - Basic system health check
- `GET /api/health/fhir-server` - FHIR server health check

### Pagination

All endpoints that return multiple resources support pagination using the following query parameters:

- `page` - Page number (default: 1)
- `limit` - Number of items per page (default: 10, max: 100)

Example:
```
GET /api/fhir/Patient?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "meta": {
    "totalItems": 100,
    "itemsPerPage": 20,
    "totalPages": 5,
    "currentPage": 2
  },
  "links": {
    "first": "/api/fhir/Patient?page=1&limit=20",
    "previous": "/api/fhir/Patient?page=1&limit=20",
    "current": "/api/fhir/Patient?page=2&limit=20",
    "next": "/api/fhir/Patient?page=3&limit=20",
    "last": "/api/fhir/Patient?page=5&limit=20"
  }
}
```

### Search Parameters

FHIR resources support standard FHIR search parameters:

- `_id` - Search by resource ID
- `_lastUpdated` - Search by last updated date
- `_tag` - Search by tag
- `_profile` - Search by profile
- `_security` - Search by security label
- `_text` - Search by text content
- `_content` - Search by content
- `_list` - Search by list
- `_has` - Reverse chained search
- `_type` - Search by resource type

Resource-specific parameters are also supported. For example, Patient resources support:

- `name` - Search by patient name
- `given` - Search by given name
- `family` - Search by family name
- `identifier` - Search by identifier
- `gender` - Search by gender
- `birthdate` - Search by birth date
- `address` - Search by address
- `email` - Search by email
- `phone` - Search by phone number
- `organization` - Search by managing organization
- `practitioner` - Search by practitioner

### Error Handling

The API uses standardized error responses following the FHIR OperationOutcome format:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "invalid",
      "diagnostics": "Invalid resource: The resource did not pass validation",
      "details": {
        "text": "Invalid resource: The resource did not pass validation"
      }
    }
  ]
}
```

Common HTTP status codes:

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request or validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Integration Guide

### JavaScript/TypeScript Integration

#### Using Axios

```javascript
import axios from 'axios';

// Configure client
const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Login and set token
async function login(email, password) {
  try {
    const response = await client.post('/auth/login', { email, password });
    const token = response.data.accessToken;
    
    // Set token for future requests
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get patient list
async function getPatients(searchParams = {}) {
  try {
    const response = await client.get('/fhir/Patient', { params: searchParams });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch patients:', error.response?.data || error.message);
    throw error;
  }
}

// Create a patient
async function createPatient(patientData) {
  try {
    const response = await client.post('/fhir/Patient', patientData);
    return response.data;
  } catch (error) {
    console.error('Failed to create patient:', error.response?.data || error.message);
    throw error;
  }
}
```

### Python Integration

```python
import requests
import json

# Base configuration
BASE_URL = 'http://localhost:3000/api'
session = requests.Session()
session.headers.update({'Content-Type': 'application/json'})

def login(email, password):
    """Login and set authorization token for future requests"""
    response = requests.post(
        f"{BASE_URL}/auth/login", 
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    token = response.json()['accessToken']
    session.headers.update({'Authorization': f'Bearer {token}'})
    return token

def get_patients(search_params=None):
    """Get list of patients with optional search parameters"""
    response = session.get(f"{BASE_URL}/fhir/Patient", params=search_params)
    response.raise_for_status()
    return response.json()

def create_patient(patient_data):
    """Create a new patient"""
    response = session.post(f"{BASE_URL}/fhir/Patient", json=patient_data)
    response.raise_for_status()
    return response.json()

def get_patient_encounters(patient_id):
    """Get encounters for a specific patient"""
    response = session.get(f"{BASE_URL}/fhir/Encounter/patient/{patient_id}")
    response.raise_for_status()
    return response.json()
```

### FHIR Client Libraries

For more advanced FHIR operations, consider using dedicated FHIR client libraries:

#### JavaScript/TypeScript
- [fhir.js](https://github.com/FHIR/fhir.js)
- [fhir-kit-client](https://github.com/Vermonster/fhir-kit-client)

#### Python
- [fhirclient](https://github.com/smart-on-fhir/client-py)
- [fhir-resources](https://github.com/nazrulworld/fhir.resources)

#### Java
- [HAPI FHIR Client](https://hapifhir.io/hapi-fhir/docs/client/introduction.html)

#### .NET
- [FHIR .NET API](https://github.com/FirelyTeam/firely-net-sdk)

## FHIR Resources

### Supported Resources

The API supports the following FHIR resources:

- **Patient**: Core demographic information about individuals receiving healthcare services
- **Practitioner**: Healthcare providers involved in patient care
- **Organization**: Healthcare organizations providing services
- **Encounter**: Interactions between patients and healthcare providers
- **Observation**: Measurements and simple assertions about patients
- **DiagnosticReport**: Results of diagnostic investigations
- **Medication**: Medications and pharmaceutical products
- **MedicationRequest**: Medication orders and prescriptions
- **Procedure**: Actions performed on or for a patient during an encounter
- **Condition**: Clinical conditions, problems, or diagnoses
- **Questionnaire**: Structured sets of questions
- **QuestionnaireResponse**: Answers to questions in Questionnaires
- **Payment**: Financial transactions related to healthcare services

### Resource Validation

All FHIR resources undergo thorough validation at multiple levels:

#### Schema Validation
- Structural validation against FHIR R4 resource schemas
- Data type and cardinality checking for all elements
- Required field validation

#### Reference Validation
- Integrity checking of resource references (e.g., Patient references in Encounters)
- Verification of reference existence when required
- Proper formatting of reference URLs

#### Business Rule Validation
- Custom validation rules specific to healthcare workflows
- Patient-practitioner relationship validation
- Date consistency checks (e.g., birth date vs encounter date)

#### Profile Validation
- Support for validating resources against FHIR profiles
- Ability to enforce organization-specific extensions and constraints
- Implementation Guide conformance checking

#### Resource Validation API

You can validate resources without creating them using the validation endpoints:

```
# Validate a single resource
POST /api/fhir/:resourceType/$validate

# Validate a batch of resources
POST /api/fhir/$validate-batch

# Validate specific resource instance
POST /api/fhir/:resourceType/:id/$validate
```

Validation responses use the FHIR OperationOutcome format to provide detailed information about validation issues:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "structure",
      "diagnostics": "Patient.name.given: minimum required = 1, but only found 0",
      "location": ["Patient.name[0].given"]
    }
  ]
}
```

## Development Guide

### Adding New Resources

To add support for a new FHIR resource:

1. Create a schema in `src/fhir/schemas/resource-name.schema.ts`
2. Create DTOs in `src/fhir/dto/resource-name.dto.ts`
3. Create a service in `src/fhir/services/resource-name.service.ts`
4. Create a controller in `src/fhir/controllers/resource-name.controller.ts`
5. Register the service and controller in the appropriate module

### Custom Operations

To add a custom operation:

1. Add a method to the resource service
2. Add an endpoint to the resource controller using `@Post('$operation-name')` or `@Get('$operation-name')`
3. Implement the operation logic
4. Update documentation

### Testing

Run tests using:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Security Considerations

- All endpoints (except login and registration) require authentication
- JWT tokens expire after a configurable time (default: 1 day)
- Role-based access control ensures users can only access appropriate resources
- Access codes are required for user registration
- Passwords are hashed using bcrypt
- Audit logs track all data access and modifications

## Contributing

We welcome contributions to the MediCare FHIR API! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature-name`)
7. Create a new Pull Request

Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

## License

This project is licensed under the [ISC License](LICENSE).
