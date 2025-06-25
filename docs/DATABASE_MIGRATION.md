# MediCare FHIR API Database Migration Guide

This document provides an overview of the migration from H2 in-memory database to PostgreSQL for the MediCare FHIR API.

## Table of Contents

1. [Overview](#overview)
2. [Migration Benefits](#migration-benefits)
3. [Architecture Changes](#architecture-changes)
4. [Configuration Details](#configuration-details)
5. [Troubleshooting](#troubleshooting)
6. [Verification Steps](#verification-steps)
7. [Rollback Procedure](#rollback-procedure)

## Overview

The MediCare FHIR API has been enhanced by transitioning from an H2 in-memory database to PostgreSQL. This change provides improved scalability, data persistence, and production readiness.

## Migration Benefits

- **Data Persistence**: Unlike H2 in-memory database, PostgreSQL provides permanent storage that persists across server restarts.
- **Scalability**: PostgreSQL can handle larger datasets and concurrent connections.
- **Performance**: Optimized for FHIR workloads with specialized indexes and query performance.
- **Production-Ready**: Enterprise-grade database solution suitable for healthcare data.
- **Advanced Features**: Full-text search, JSON capabilities, and transaction management.

## Architecture Changes

### Previous Architecture

```
┌───────────────┐       ┌─────────────┐
│  NestJS API   │───────│   H2 DB     │
│  (Medicare)   │       │ (In-memory) │
└───────────────┘       └─────────────┘
        │
        │
┌───────────────┐
│  MongoDB      │
│  (User data)  │
└───────────────┘
```

### New Architecture

```
┌───────────────┐       ┌─────────────┐
│  NestJS API   │───────│  PostgreSQL │
│  (Medicare)   │       │  (FHIR data)│
└───────────────┘       └─────────────┘
        │
        │
┌───────────────┐
│  MongoDB      │
│  (User data)  │
└───────────────┘
```

## Configuration Details

### PostgreSQL Configuration

The PostgreSQL database is configured with the following settings:

- **Database Name**: `hapi`
- **Username**: `admin` 
- **Password**: `admin`
- **Port**: `5433` (mapped from container port 5432)
- **Initialization Script**: `scripts/initialize-postgres.sql`

### HAPI FHIR Server Configuration

The HAPI FHIR server now uses the following PostgreSQL connection:

```yaml
spring:
  datasource:
    url: 'jdbc:postgresql://postgres:5432/hapi'
    username: admin
    password: admin
    driverClassName: org.postgresql.Driver
  jpa:
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
      hibernate.search.enabled: true
```

### Docker Configuration

The PostgreSQL service is configured in `docker-compose.yml`:

```yaml
postgres:
  image: postgres:14
  container_name: hapi-postgres
  environment:
    POSTGRES_DB: hapi
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: admin
  ports:
    - "5433:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - ./scripts/initialize-postgres.sql:/docker-entrypoint-initdb.d/initialize-postgres.sql:ro
  networks:
    - medicare-network
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U admin -d hapi"]
    interval: 10s
    timeout: 5s
    retries: 5
```

## Troubleshooting

### Known Issues

#### HAPI FHIR Server Unhealthy Status

**Issue**: The HAPI FHIR server may be marked as "unhealthy" by Docker even though it's functioning correctly.

**Solution**: This is often due to the health check timing. The FHIR server may need more time to initialize fully. You can:

1. Increase the `retries` value in the healthcheck configuration
2. Verify functionality by accessing `http://localhost:9090/fhir/metadata`

#### PostgreSQL Port Conflicts

**Issue**: Port conflicts with a local PostgreSQL instance.

**Solution**: The PostgreSQL port has been changed from the default 5432 to 5433 to avoid conflicts with local installations.

#### Email Service Connection Issues

**Issue**: The NestJS API may have issues connecting to the email service.

**Solution**: The email service has been updated to gracefully handle connection issues by providing console logs of emails instead of attempting to send them. This prevents the application from failing when email credentials are invalid or unavailable.

## Verification Steps

To verify the successful migration:

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. Check health of PostgreSQL:
   ```bash
   docker exec -it hapi-postgres psql -U admin -d hapi -c "SELECT current_database(), version();"
   ```

3. Verify HAPI FHIR server:
   ```bash
   curl http://localhost:9090/fhir/metadata
   ```

4. Verify NestJS API:
   ```bash
   curl http://localhost:3000/api/health
   ```

## Rollback Procedure

If you need to roll back to the H2 database:

1. Stop all containers:
   ```bash
   docker-compose down
   ```

2. Revert the `application.yaml` file to use H2 database:
   ```yaml
   spring:
     datasource:
       url: 'jdbc:h2:file:./target/database/h2'
       username: sa
       password: null
       driverClassName: org.h2.Driver
   ```

3. Remove the PostgreSQL service from `docker-compose.yml`.

4. Restart the services:
   ```bash
   docker-compose up -d
   ``` 