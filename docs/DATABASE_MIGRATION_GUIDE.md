# H2 to PostgreSQL Migration Guide for HAPI FHIR Server

This document outlines the step-by-step process for migrating the HAPI FHIR server from using the H2 in-memory database to PostgreSQL for improved scalability and data persistence.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Migration Process](#migration-process)
- [Data Migration](#data-migration)
- [Configuration Updates](#configuration-updates)
- [Verification Steps](#verification-steps)
- [Rollback Procedure](#rollback-procedure)
- [Common Issues](#common-issues)

## Overview

The HAPI FHIR server initially uses an H2 in-memory database for development and testing purposes. While suitable for these environments, H2 does not provide the scalability, performance, or persistence required for production environments. This migration guide facilitates the transition to PostgreSQL, a robust, open-source relational database that better supports the requirements of a production FHIR server.

## Prerequisites

Before beginning the migration, ensure you have:

1. **Access to Both Environments**:
   - A running instance of the HAPI FHIR server with H2 database
   - A PostgreSQL database server (version 12 or higher recommended)
   - Network connectivity between the two environments

2. **Required Tools**:
   - PostgreSQL client tools (`psql`)
   - Java 11 or higher
   - Docker and Docker Compose (if using containerized setup)

3. **Database Credentials**:
   - PostgreSQL admin credentials
   - Credentials for the new HAPI FHIR database user

4. **Backup and Restore Strategy**:
   - Sufficient disk space for database exports and imports
   - Backup of the current H2 database

## Migration Process

### 1. Setup PostgreSQL Server

```bash
# Start PostgreSQL container if using Docker setup
docker-compose up -d postgres

# Wait for PostgreSQL to start
sleep 10

# Verify PostgreSQL is running
docker exec hapi-postgres pg_isready
```

### 2. Create and Configure Database

```bash
# Connect to PostgreSQL and create the HAPI database
docker exec -it hapi-postgres psql -U postgres -c "CREATE DATABASE hapi;"

# Create dedicated user for HAPI FHIR
docker exec -it hapi-postgres psql -U postgres -c "CREATE USER hapifhir WITH PASSWORD 'hapifhir';"

# Grant permissions
docker exec -it hapi-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hapi TO hapifhir;"
```

### 3. Initialize PostgreSQL with FHIR Optimizations

```bash
# Copy initialization script to container
docker cp scripts/initialize-postgres.sql hapi-postgres:/tmp/

# Run the initialization script
docker exec -it hapi-postgres psql -U postgres -d hapi -f /tmp/initialize-postgres.sql
```

## Data Migration

### 1. Export Data from H2

If you have existing data in H2 that needs to be preserved:

```bash
# Stop HAPI FHIR server
docker-compose stop hapi-fhir

# Extract FHIR resources from H2 as NDJSON
java -jar hapi-fhir-cli.jar export \
  --source-url jdbc:h2:file:./h2_database \
  --source-username sa \
  --output /tmp/fhir_export \
  --output-format ndjson
```

### 2. Import Data into PostgreSQL

```bash
# Import FHIR resources into PostgreSQL
java -jar hapi-fhir-cli.jar import \
  --target-url jdbc:postgresql://localhost:5432/hapi \
  --target-username hapifhir \
  --target-password hapifhir \
  --input /tmp/fhir_export \
  --input-format ndjson
```

## Configuration Updates

### 1. Update HAPI FHIR Configuration

Modify `application.yaml` to use PostgreSQL instead of H2:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/hapi
    username: hapifhir
    password: hapifhir
    driverClassName: org.postgresql.Driver
    max-active: 15
  jpa:
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQL95Dialect
      hibernate.search.enabled: true
      hibernate.search.backend.type: lucene
      hibernate.search.backend.directory.type: local-filesystem
      hibernate.search.backend.directory.root: target/lucenefiles
      hibernate.search.backend.lucene_version: 8.11.1
```

### 2. Update Docker Compose Configuration

Update the `docker-compose.yml` file to include PostgreSQL service:

```yaml
version: '3'

services:
  hapi-fhir:
    image: hapiproject/hapi:latest
    container_name: hapi-fhir-server
    ports:
      - "8080:8080"
    environment:
      - spring.datasource.url=jdbc:postgresql://postgres:5432/hapi
      - spring.datasource.username=hapifhir
      - spring.datasource.password=hapifhir
      - spring.datasource.driverClassName=org.postgresql.Driver
      - spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQL95Dialect
    depends_on:
      - postgres
    networks:
      - hapi-fhir-net

  postgres:
    image: postgres:14
    container_name: hapi-postgres
    environment:
      POSTGRES_DB: hapi
      POSTGRES_USER: hapifhir
      POSTGRES_PASSWORD: hapifhir
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - hapi-fhir-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hapifhir -d hapi"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:

networks:
  hapi-fhir-net:
```

## Verification Steps

### 1. Start the System with PostgreSQL

```bash
# Start the entire stack
docker-compose up -d
```

### 2. Verify Database Connectivity

```bash
# Check if HAPI FHIR can connect to PostgreSQL
docker logs hapi-fhir-server | grep -i "database"
```

### 3. Test FHIR Operations

```bash
# Test metadata endpoint
curl -X GET http://localhost:8080/fhir/metadata

# Create a test patient
curl -X POST -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Patient","name":[{"family":"Migration","given":["Test"]}],"gender":"male"}' \
  http://localhost:8080/fhir/Patient

# Verify patient was created
curl -X GET http://localhost:8080/fhir/Patient?name=Migration
```

### 4. Verify Data Integrity

If you migrated data from H2:

```bash
# Count resources in old and new database to verify all data was migrated
OLD_COUNT=$(java -jar hapi-fhir-cli.jar count --url jdbc:h2:file:./h2_database)
NEW_COUNT=$(java -jar hapi-fhir-cli.jar count --url jdbc:postgresql://localhost:5432/hapi --username hapifhir --password hapifhir)

echo "H2 resource count: $OLD_COUNT"
echo "PostgreSQL resource count: $NEW_COUNT"
```

## Rollback Procedure

If issues are encountered during migration:

### 1. Revert Configuration Changes

```bash
# Restore original application.yaml
git checkout -- application.yaml

# Restore original docker-compose.yml
git checkout -- docker-compose.yml
```

### 2. Restart with H2

```bash
# Restart HAPI FHIR with original H2 configuration
docker-compose up -d hapi-fhir
```

## Common Issues

### 1. Connection Issues

**Problem**: HAPI FHIR cannot connect to PostgreSQL.

**Solutions**:
- Verify network connectivity between containers
- Check PostgreSQL logs for authentication issues
- Ensure PostgreSQL service is fully initialized before HAPI FHIR starts

```bash
# Add container dependency in docker-compose.yml
depends_on:
  - postgres
```

### 2. Schema Generation Issues

**Problem**: Hibernate fails to generate or update schema.

**Solutions**:
- Set `spring.jpa.hibernate.ddl-auto=update` for initial migration
- Ensure the database user has sufficient privileges
- Check for compatibility issues between Hibernate and PostgreSQL versions

### 3. Performance Issues

**Problem**: Queries run slower in PostgreSQL compared to H2.

**Solutions**:
- Run VACUUM ANALYZE on PostgreSQL tables
- Add appropriate indexes for common FHIR search parameters
- Configure PostgreSQL for better performance using `initialize-postgres.sql`

```bash
# Run VACUUM ANALYZE
docker exec -it hapi-postgres psql -U postgres -d hapi -c "VACUUM ANALYZE;"
```

## Conclusion

After completing this migration, your HAPI FHIR server should be running with PostgreSQL as its database backend. This configuration provides improved scalability, data persistence, and performance for production environments.

Continue monitoring the system performance and adjust PostgreSQL settings as needed for your specific workload. Remember to implement a proper backup strategy for your PostgreSQL database to ensure data safety. 