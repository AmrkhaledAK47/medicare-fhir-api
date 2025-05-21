# MediCare FHIR API Quick Start Guide

This guide will help you get started with the MediCare FHIR API quickly.

## Prerequisites

- Node.js (v16+)
- MongoDB (v4.4+)
- Docker and Docker Compose
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/medicare-api.git
cd medicare-api
```

### 2. Environment Setup

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

# HAPI FHIR Server
FHIR_SERVER_URL=http://localhost:9090/fhir
```

### 3. Start the HAPI FHIR Server

```bash
# Start HAPI FHIR and MongoDB containers
./start-hapi-fhir.sh
```

### 4. Install Dependencies and Start the API

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev
```

The API will be available at http://localhost:3000/api with Swagger documentation at http://localhost:3000/api/docs.

## Initial Setup

### Create the First Admin User

You can use our setup script to create the initial admin user:

```bash
node scripts/setup-admin.js
```

Or manually via API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@medicare.com",
    "password": "AdminPass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## Core Concepts

### FHIR Resources

Our API provides access to standard FHIR resources:

- Patient
- Practitioner
- Organization
- Encounter
- Observation
- DiagnosticReport
- Medication
- Questionnaire
- Payment

### Authentication Flow

1. Register or login to get a JWT token
2. Include the token in the Authorization header for all requests
3. Access resources according to your role permissions

### Role-based Access

- **Admin**: Full access to all resources
- **Practitioner**: Access to assigned patients and clinical data
- **Patient**: Access only to own medical records

## Testing Your Setup

### Run Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "fhirServer": {
    "status": "connected",
    "version": "5.7.0"
  },
  "database": {
    "status": "connected"
  }
}
```

### Login and Test Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@medicare.com",
    "password": "AdminPass123!"
  }'
```

This will return a JWT token:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "admin@medicare.com",
    "role": "admin"
  }
}
```

Use this token for subsequent requests:

```bash
# Get patients
curl -X GET http://localhost:3000/api/fhir/Patient \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Development Tasks

### Creating a New FHIR Resource

1. Create schema in `/src/fhir/schemas/{resource-name}.schema.ts`
2. Create DTOs in `/src/fhir/dto/create-{resource-name}.dto.ts` and `/src/fhir/dto/update-{resource-name}.dto.ts`
3. Create service in `/src/fhir/services/{resource-name}.service.ts`
4. Create controller in `/src/fhir/controllers/{resource-name}.controller.ts`
5. Register the module components in `fhir.module.ts`

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Testing Role-Based Security

We provide a script to test role-based access security:

```bash
node scripts/test-role-security.js
```

This script will:
1. Login as different roles (admin, practitioner, patient)
2. Test access to various resources
3. Report which operations are allowed or denied for each role

## Managing the FHIR Server

### View FHIR Server Logs

```bash
npm run fhir:logs
```

### Restart FHIR Server

```bash
npm run fhir:stop
npm run fhir:start
```

## Additional Resources

- [API Documentation](API-DOCUMENTATION.md)
- [Integration Guide](INTEGRATION-GUIDE.md)
- [FHIR Implementation Guide](https://www.hl7.org/fhir/)
- [Role-based Permissions](ROLE-PERMISSIONS.md)
- [API Visual Guide](API-VISUAL-GUIDE.md)

## Troubleshooting

### FHIR Server Not Responding

Check if the HAPI FHIR server is running:

```bash
docker ps | grep hapi-fhir
```

If not running, start it:

```bash
./start-hapi-fhir.sh
```

### MongoDB Connection Issues

Verify MongoDB is running:

```bash
docker ps | grep mongodb
```

Check MongoDB logs:

```bash
docker logs mongodb
```

### API Error: Unknown Resource Type

This error occurs when the resource type casing is incorrect. FHIR is case-sensitive and expects resource types with proper casing:

- ✅ `Patient`, `Observation`, `DiagnosticReport`
- ❌ `patient`, `observation`, `diagnosticreport`

### JWT Authentication Errors

If you're getting 401 Unauthorized errors:
1. Make sure your token hasn't expired
2. Verify the correct token format: `Bearer YOUR_TOKEN`
3. Check that the JWT_SECRET in your .env matches the one used to generate the token

## Next Steps

1. Review the [API Documentation](API-DOCUMENTATION.md) for detailed API information
2. Explore the [Integration Guide](INTEGRATION-GUIDE.md) for client integration examples
3. Check the [FHIR Resource Guide](https://www.hl7.org/fhir/resourcelist.html) for standard FHIR resource formats 