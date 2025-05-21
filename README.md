# FHIR EHR Platform

A FHIR-based Electronic Health Records platform built with NestJS, TypeScript, MongoDB, and Swagger.

## Features

- **RESTful API** built with NestJS and TypeScript
- **FHIR Integration** with a FHIR server
- **MongoDB** for data persistence and caching
- **Swagger Documentation** for API endpoints
- **Authentication** with JWT
- **User Management** with role-based access control
- **Docker** support for easy deployment

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB
- FHIR Server (HAPI FHIR, etc.)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd fhir-ehr-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following contents:

```
# Application
NODE_ENV=development
PORT=3000

# MongoDB Database
MONGODB_URI=mongodb://localhost:27017/fhir_ehr

# JWT Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# FHIR Server 
FHIR_SERVER_BASE_URL=http://localhost:9090/fhir
```

### 4. Start the FHIR server

```bash
npm run fhir:start
```

### 5. Start the application

For development:

```bash
npm run start:dev
```

For production:

```bash
npm run build
npm run start:prod
```

## API Documentation

The API documentation is available at:

```
http://localhost:3000/api/docs
```

## API Endpoints

### Health Check

- `GET /api/health` - Check API health
- `GET /api/health/fhir-server` - Check FHIR server health

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login

### Users

- `GET /api/users/profile` - Get user profile

### FHIR Resources

- `POST /api/fhir/:resourceType` - Create a new resource
- `GET /api/fhir/:resourceType/:id` - Get a specific resource
- `PUT /api/fhir/:resourceType/:id` - Update a resource
- `DELETE /api/fhir/:resourceType/:id` - Delete a resource
- `GET /api/fhir/:resourceType/search` - Search for resources
- `GET /api/fhir/my-resources` - Get resources associated with the user

## License

ISC
