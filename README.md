# MediCare FHIR API

![FHIR API](https://www.hl7.org/fhir/assets/images/fhir-logo-www.png)

A comprehensive FHIR-based Electronic Health Records (EHR) API with role-based access control and ML integration capabilities.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Role-Based Access](#role-based-access)
  - [Core Endpoints](#core-endpoints)
- [Integration Guide](#integration-guide)
- [FHIR Resources](#fhir-resources)
- [Contributing](#contributing)
- [License](#license)

## Overview

MediCare FHIR API is a modern healthcare data platform built on the HL7 FHIR (Fast Healthcare Interoperability Resources) standard. It provides a RESTful interface for interacting with healthcare data, with robust role-based access controls to ensure data security and privacy.

The platform supports standard FHIR resources, including Patient, Practitioner, Encounter, Observation, DiagnosticReport, and more. It's designed to be extensible and can integrate with existing FHIR servers or operate standalone.

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

- **FHIR R4 Compliant**: Implements FHIR R4 resources and operations
- **Role-Based Access Control**: Admin, Practitioner, and Patient roles with appropriate permissions
- **Authentication & Authorization**: Secure JWT-based authentication
- **Comprehensive API**: Full CRUD operations for all supported FHIR resources
- **Advanced Search**: Support for complex search parameters and filtering
- **Pagination**: Efficient data retrieval with pagination
- **Swagger Documentation**: Interactive API documentation
- **Error Handling**: Consistent error responses with appropriate status codes
- **Audit Logging**: Track all data access and modifications
- **Email Notifications**: User registration and password reset workflows
- **Docker Support**: Easy deployment with Docker and Docker Compose

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

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/medicare
MONGODB_TEST_URI=mongodb://localhost:27017/medicare_test

# HAPI FHIR Server (optional)
FHIR_SERVER_URL=http://localhost:9090/fhir
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
└── users/            # User management
```

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Client Apps    │────▶│  MediCare API   │────▶│   MongoDB       │
│  (Web/Mobile)   │     │  (NestJS)       │     │   Database      │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                               │
                               │ Optional
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │  External       │
                        │  FHIR Server    │
                        │  (HAPI FHIR)    │
                        │                 │
                        └─────────────────┘
```

For a more detailed architecture overview, including application layers, authentication flow, and role-based access control, see [API Architecture](API-ARCHITECTURE.md).

## API Documentation

### Authentication

All API endpoints (except login and registration) require authentication using JSON Web Tokens (JWT).

#### Obtaining a Token

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

#### User Endpoints

- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

#### FHIR Resource Endpoints

- `GET /api/fhir/:resourceType` - Get resources by type
- `GET /api/fhir/:resourceType/:id` - Get resource by ID
- `POST /api/fhir/:resourceType` - Create resource
- `PUT /api/fhir/:resourceType/:id` - Update resource
- `DELETE /api/fhir/:resourceType/:id` - Delete resource

#### Health Check Endpoints

- `GET /api/health` - Basic system health check
- `GET /api/health/fhir-server` - FHIR server health check

## Integration Guide

### JavaScript/TypeScript (Axios)

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
    const token = response.data.access_token;
    
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
```

### Python (Requests)

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
    token = response.json()['access_token']
    session.headers.update({'Authorization': f'Bearer {token}'})
    return token

def get_patients(search_params=None):
    """Get list of patients with optional search parameters"""
    response = session.get(f"{BASE_URL}/fhir/Patient", params=search_params)
    response.raise_for_status()
    return response.json()
```

## FHIR Resources

The API supports the following FHIR resources:

- **Patient**: Core demographic information about individuals receiving healthcare services
- **Practitioner**: Healthcare providers involved in patient care
- **Organization**: Healthcare organizations providing services
- **Encounter**: Interactions between patients and healthcare providers
- **Observation**: Measurements and simple assertions about patients
- **DiagnosticReport**: Results of diagnostic investigations
- **Medication**: Medications and pharmaceutical products
- **Questionnaire**: Structured sets of questions
- **Payment**: Financial transactions related to healthcare services

## Contributing

We welcome contributions to the MediCare FHIR API! Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

## License

This project is licensed under the [ISC License](LICENSE).
