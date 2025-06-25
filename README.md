# MediCare FHIR API

A modern FHIR-compliant API for healthcare data management built with NestJS and HAPI FHIR.

## Overview

MediCare FHIR API provides a comprehensive RESTful interface for interacting with healthcare data using the HL7 FHIR (Fast Healthcare Interoperability Resources) standard. The API supports various healthcare resources, authentication, and role-based access controls.

## Features

- **FHIR-Compliant**: Implements the FHIR standard for healthcare data interoperability
- **Advanced Search**: Supports complex search parameters, including chained and composite searches
- **Role-Based Access Control**: Different access levels for patients, practitioners, and administrators
- **JWT Authentication**: Secure authentication using JSON Web Tokens
- **Docker Integration**: Easy deployment with Docker containers
- **Comprehensive Documentation**: API documentation and testing plans included

## Supported FHIR Resources

- Patient
- Practitioner
- Organization
- Encounter
- Observation
- DiagnosticReport
- Condition
- Procedure
- AllergyIntolerance
- MedicationRequest
- Medication

## Advanced FHIR Features

- **Composite Search Parameters**: Combine multiple search criteria for complex queries
- **Chained Parameters**: Search based on properties of referenced resources
- **Reference Range Searches**: Find observations with specific reference ranges
- **Reverse Chaining**: Find resources that reference specific resources
- **Include and Reverse Include**: Include referenced resources in responses
- **Custom Endpoints**: Specialized endpoints for common clinical queries

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/medicare-fhir-api.git
cd medicare-fhir-api
```

2. Start the Docker containers:
```bash
docker-compose up -d
```

3. Generate an authentication token:
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }' | jq -r '.accessToken' > token.txt
```

### Testing

Run the test scripts to verify API functionality:

```bash
./test/observation-api-test.sh
```

## API Documentation

Detailed API documentation can be found in the `docs` directory:

- [API Documentation](docs/API-DOCUMENTATION.md): General API documentation
- [API Testing Plan](docs/API-TESTING-PLAN.md): Comprehensive testing plan
- [Observation Enhancements](docs/OBSERVATION-ENHANCEMENTS.md): Documentation for Observation resource enhancements
- [Enhancements Summary](docs/ENHANCEMENTS-SUMMARY.md): Summary of all API enhancements

## Architecture

The API is built with the following technologies:

- **NestJS**: A progressive Node.js framework for building efficient and scalable server-side applications
- **HAPI FHIR**: An open-source implementation of the FHIR specification
- **PostgreSQL**: Database for storing user information
- **Docker**: Containerization for easy deployment

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [HL7 FHIR](https://www.hl7.org/fhir/) for the FHIR specification
- [HAPI FHIR](https://hapifhir.io/) for the FHIR server implementation
- [NestJS](https://nestjs.com/) for the API framework

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/YOUR_GITHUB_USERNAME/fhir-ehr-platform/tree/main)

## Quick Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

To deploy this application to DigitalOcean App Platform:

1. Click the "Deploy to DigitalOcean" button above
2. Follow the setup wizard to configure your application
3. Deploy and access your application

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
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-blue.svg)](https://www.postgresql.org/)

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Quick Setup](#quick-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Server](#running-the-server)
- [PostgreSQL Integration](#postgresql-integration)
  - [Benefits](#benefits)
  - [Setup](#setup)
  - [Testing](#testing)
  - [Monitoring](#monitoring)
- [Architecture](#architecture)
  - [System Architecture](#system-architecture)
  - [Application Layers](#application-layers)
  - [Authentication Flow](#authentication-flow)
- [HAPI FHIR Integration](#hapi-fhir-integration)
  - [HAPI FHIR Overview](#hapi-fhir-overview)
  - [Integration Benefits](#integration-benefits)
  - [HAPI FHIR Server Setup](#hapi-fhir-server-setup)
- [API Documentation](#api-documentation)
  - [Swagger Documentation](#swagger-documentation)
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
- **PostgreSQL Database**: Robust, scalable PostgreSQL database for HAPI FHIR server
- **Advanced Search & Filtering**: Comprehensive search capabilities across all resources
- **Pagination**: Efficient data retrieval with standardized pagination patterns
- **Audit Logging**: Complete audit trail of all data access and modifications
- **Email Workflows**: Registration, password reset, and notification workflows

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - A progressive Node.js framework
- **User Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **FHIR Database**: [PostgreSQL](https://www.postgresql.org/) - For scalable HAPI FHIR storage
- **Authentication**: [JWT](https://jwt.io/) with [Passport](http://www.passportjs.org/)
- **API Documentation**: [Swagger/OpenAPI](https://swagger.io/)
- **Validation**: [class-validator](https://github.com/typestack/class-validator)
- **FHIR Server**: [HAPI FHIR](https://hapifhir.io/)
- **Email**: [Nodemailer](https://nodemailer.com/)
- **Testing**: [Jest](https://jestjs.io/)
- **Containerization**: [Docker](https://www.docker.com/) and Docker Compose

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

### Quick Setup

For a complete setup that includes PostgreSQL, HAPI FHIR, MongoDB, and the NestJS API:

```bash
./scripts/setup-test-everything.sh
```

This will start all services, generate authentication tokens, and test all API endpoints.

For detailed PostgreSQL setup instructions, see [POSTGRESQL-SETUP-README.md](POSTGRESQL-SETUP-README.md).

### Prerequisites

- Docker and Docker Compose
- Node.js (v16+) for development
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/medicare-api.git
cd medicare-api
```

2. Set up environment variables (see [Environment Setup](#environment-setup))

3. Start all services:

```bash
./scripts/setup-and-verify.sh
```

The API will be available at:
- NestJS API: http://localhost:3000/api 
- API Documentation: http://localhost:3000/api-docs
- HAPI FHIR Server: http://localhost:9090/fhir

### Environment Setup

Create a `.env` file in the root directory (see `.env.example` for a template).

### Running the Server

#### Development Mode with Docker

```bash
./scripts/setup-and-verify.sh
```

#### Development Mode Without Docker

```bash
npm install
npm run start:dev
```

#### Production Mode

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## PostgreSQL Integration

### Benefits

The PostgreSQL database integration for HAPI FHIR provides several key benefits:

1. **Data Persistence**: Unlike H2 in-memory database, PostgreSQL persists data across restarts
2. **Scalability**: Handles larger volumes of healthcare data
3. **Performance**: Optimized for FHIR workloads with custom extensions and functions
4. **Reliability**: Enterprise-grade database with proven track record in healthcare
5. **Search Capabilities**: Advanced indexing and search functionality

### Setup

To set up the PostgreSQL database for HAPI FHIR:

```bash
# Complete setup script
./scripts/setup-and-verify.sh

# Or individual scripts
docker-compose up -d postgres
./scripts/initialize-postgres.sql
```

For full setup details, see [DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md).

### Testing

To test the PostgreSQL configuration:

```bash
# Generate authentication tokens
node ./scripts/generate-auth-token.js

# Test API endpoints
node ./scripts/test-api-endpoints.js

# Benchmark API performance
./scripts/benchmark.sh -e /fhir/Patient -n 100 -c 10
```

### Monitoring

To monitor resource usage:

```bash
# Monitor container resources (updates every 5 seconds)
./scripts/monitor-resources.sh

# Check logs
docker-compose logs -f
```

For detailed testing procedures, see [TESTING_POSTGRESQL_CONFIG.md](docs/TESTING_POSTGRESQL_CONFIG.md).

## Architecture

The MediCare FHIR API follows a modular architecture based on NestJS with PostgreSQL for the HAPI FHIR server and MongoDB for user authentication:

```
┌─────────────────┐     ┌──────────────────────────────────────────────────────┐
│                 │     │                   MediCare API                        │
│                 │     │  ┌───────────────┐         ┌───────────────┐         │
│  Client Apps    │────▶│  │ Authentication│─────────▶ FHIR Resource │         │
│  (Web/Mobile)   │     │  │ & Authorization│◀────────│ Controllers   │───────────▶┌─────────────────┐
│                 │◀────│  └───────────────┘         └───────────────┘         │   │   MongoDB       │
└─────────────────┘     │           │                        │                  │   │   (Users)       │
                        │           │                        │                  │   └─────────────────┘
                        │  ┌────────▼────────┐    ┌──────────▼──────────┐      │
                        │  │   User Service  │    │  FHIR Services      │      │
                        │  │                 │    │                     │      │
                        │  └─────────────────┘    └─────────────────────┘      │
                        │                                    │                  │
                        │                                    │                  │   ┌─────────────────┐
                        │                                    ▼                  │   │                 │
                        │                          ┌───────────────────┐       │───▶│  HAPI FHIR     │
                        │                          │ HAPI FHIR Client  │       │   │  Server         │
                        │                          └───────────────────┘       │◀──│                 │
                        │                                                       │   └────────┬────────┘
                        │                                                       │            │
                        └───────────────────────────────────────────────────────┘            │
                                                                                             ▼
                                                                                    ┌─────────────────┐
                                                                                    │  PostgreSQL     │
                                                                                    │  Database       │
                                                                                    └─────────────────┘
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
2. **HAPI FHIR Server**: The API connects to a HAPI FHIR server as a backend for advanced FHIR capabilities
3. **HAPI FHIR Libraries**: The API utilizes HAPI FHIR libraries for validation, parsing, and resource handling

Benefits of integration include:

- **Advanced FHIR Capabilities**: Access to HAPI FHIR's comprehensive FHIR implementation
- **Terminology Services**: Code validation, ValueSet expansion, and concept translation
- **Resource Validation**: Validate resources against FHIR profiles and implementation guides
- **Interoperability**: Seamless connection with other FHIR-compliant systems
- **Performance Optimization**: Efficient search and retrieval of FHIR resources

### HAPI FHIR Server Setup

Our implementation uses a PostgreSQL-backed HAPI FHIR server for improved scalability and data persistence. This represents an upgrade from the default H2 in-memory database that comes with the standard HAPI FHIR server.

#### Key Database Improvements

- **Persistence**: PostgreSQL provides robust data persistence, unlike the H2 in-memory database
- **Scalability**: PostgreSQL can handle much larger FHIR resource collections
- **Performance**: Optimized for high-throughput healthcare data operations
- **Reliability**: Supports database replication, backup, and recovery mechanisms
- **Standards Compliance**: Fully supports all FHIR operations within a production environment

To use the HAPI FHIR server with PostgreSQL:

1. Start the infrastructure using Docker Compose:

```bash
docker-compose up -d
```

2. Verify the setup is working correctly:

```bash
./scripts/verify-postgres-setup.sh
```

3. Access the HAPI FHIR server at:
   - http://localhost:9090/fhir

#### Production Deployment

For production deployments, use our production-ready configuration:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This configuration includes:
- Secured database connections (no exposed ports)
- Optimized PostgreSQL settings for FHIR workloads
- Proper volume management for data persistence
- NGINX reverse proxy with SSL support

See the [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## API Documentation

### Swagger Documentation

The MediCare FHIR API includes comprehensive API documentation using Swagger/OpenAPI. This documentation provides detailed information about all endpoints, request/response formats, and authentication requirements.

#### Viewing Documentation

When running the application, Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

This interactive documentation allows you to:
- Browse all API endpoints organized by category
- View detailed request and response schemas
- Test API calls directly from the browser
- Authenticate using JWT tokens
- View examples and descriptions

#### Generating Static Documentation

For sharing with frontend teams or deploying to a static hosting service, you can generate static Swagger documentation:

```bash
# Install required dependencies
npm install

# Generate static Swagger documentation
npm run swagger:generate
```

This creates a `swagger-static` directory containing:
- `swagger.json`: The complete OpenAPI specification
- `index.html`: Interactive Swagger UI for viewing the documentation
- `README.md`: Usage instructions for the frontend team

#### Serving Documentation Locally

To view the generated documentation locally:

```bash
npm run swagger:serve
```

This starts a local HTTP server at `http://localhost:8000` with the Swagger documentation.

#### Deploying Documentation

The generated documentation can be deployed to various platforms:

```bash
# Show available deployment options
npm run swagger:deploy

# Deploy to a specific platform (e.g., Netlify)
npm run swagger:deploy netlify
```

Supported platforms include:
- Local server
- Netlify
- GitHub Pages
- Surge.sh
- AWS S3
- Firebase Hosting
- Vercel

For more details about the Swagger documentation, please see the [Swagger Documentation Guide](docs/SWAGGER-DOCUMENTATION.md).

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
- `DELETE /api/fhir/Encounter/:id`