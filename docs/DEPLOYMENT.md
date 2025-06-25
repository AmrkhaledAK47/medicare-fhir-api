# Deployment Guide for MediCare FHIR API

This guide provides detailed instructions for deploying the MediCare FHIR API in various environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Database Configuration](#database-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The MediCare FHIR API consists of two main components:

1. **HAPI FHIR Server**: A robust FHIR-compliant server built on HAPI FHIR with PostgreSQL persistence
2. **NestJS API**: A Node.js application providing authentication, authorization, and additional business logic

## Prerequisites

Before deploying, ensure you have the following installed:

- Docker and Docker Compose (latest stable version)
- Node.js (v16+) and npm (only required for development)
- Git (for cloning the repository)

## Development Deployment

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/fhir-ehr-platform.git
cd fhir-ehr-platform
```

### Step 2: Set Up Environment Variables

Create a `.env` file based on the `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file to match your development environment.

### Step 3: Start the Services

```bash
# Start all services (HAPI FHIR with PostgreSQL, MongoDB, NestJS app)
docker-compose up -d
```

### Step 4: Verify the Deployment

Run the verification script:

```bash
chmod +x scripts/verify-postgres-setup.sh
./scripts/verify-postgres-setup.sh
```

The API will be available at:
- HAPI FHIR Server: http://localhost:9090/fhir
- NestJS API: http://localhost:3000/api

## Production Deployment

For production deployments, additional security measures are recommended.

### Option 1: Docker-based Deployment

1. Create a production configuration file:

```bash
cp docker-compose.yml docker-compose.prod.yml
```

2. Modify `docker-compose.prod.yml` with production-specific settings:
   - Remove exposed database ports
   - Add proper volume mappings
   - Set production environment variables

3. Deploy using the production configuration:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Cloud Deployment (DigitalOcean Example)

1. Click the "Deploy to DigitalOcean" button in the README
2. Follow the DigitalOcean App Platform setup wizard
3. Configure environment variables for production use

## Database Configuration

### PostgreSQL for HAPI FHIR Server

The HAPI FHIR server uses PostgreSQL for data persistence by default. The configuration is specified in `application.yaml`:

```yaml
spring:
  datasource:
    url: 'jdbc:postgresql://postgres:5432/hapi'
    username: admin
    password: admin
    driverClassName: org.postgresql.Driver
  jpa:
    properties:
      hibernate.dialect: ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect
```

#### Important Considerations:

1. **Data Persistence**: 
   - PostgreSQL data is stored in the `postgres-data` volume
   - For production, consider using a managed database service or proper backup strategies

2. **Database Scaling**:
   - For high-volume deployments, consider connection pooling
   - PostgreSQL can be configured for read replicas if needed

3. **Database Maintenance**:
   - Regular backups are recommended
   - Performance tuning may be required for large datasets

### MongoDB for User Management

The NestJS application uses MongoDB for user management and authentication. This is configured in `.env`:

```
MONGODB_URI=mongodb://localhost:27017/medicare
```

## Troubleshooting

### Common Issues

#### 1. HAPI FHIR Server fails to start

Check the logs:
```bash
docker logs hapi-fhir-jpaserver
```

Common causes:
- PostgreSQL is not running or not reachable
- Invalid database credentials
- Insufficient database permissions

#### 2. Database connection errors

If PostgreSQL connection fails:
```bash
# Check PostgreSQL logs
docker logs hapi-postgres

# Verify PostgreSQL is running
docker ps | grep postgres
```

#### 3. Performance Issues

If the server is slow:
- Check PostgreSQL configuration
- Monitor database connection pool
- Consider increasing container resources

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub issues](https://github.com/YOUR_GITHUB_USERNAME/fhir-ehr-platform/issues)
2. Join the [HAPI FHIR Community](https://chat.fhir.org/) for general HAPI FHIR questions
3. Reach out to the project maintainers via email 