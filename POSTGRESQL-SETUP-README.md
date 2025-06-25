# PostgreSQL Setup for MediCare FHIR API

This guide explains how to set up and test the MediCare FHIR API with PostgreSQL database integration.

## Overview

The MediCare FHIR API now uses PostgreSQL as the primary database for the HAPI FHIR server, replacing the default H2 in-memory database. This provides improved scalability, reliability, and data persistence.

## Quick Start

For a complete setup and testing process, run:

```bash
./scripts/setup-test-everything.sh
```

This script will:
1. Start all required services (PostgreSQL, HAPI FHIR, MongoDB, NestJS API)
2. Wait for services to initialize
3. Generate authentication tokens for testing
4. Test all API endpoints
5. Provide a summary of the results

## Services

When the setup is complete, the following services will be available:

- **HAPI FHIR Server**: http://localhost:9090/fhir
- **NestJS API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api-docs
- **PostgreSQL Database**: localhost:5432 (admin/admin)
- **MongoDB Database**: localhost:27017

## Individual Scripts

If you prefer to run the steps individually, use the following scripts:

### 1. Setup and Verify Infrastructure

```bash
./scripts/setup-and-verify.sh
```

This script starts all services using Docker Compose and verifies that they are running correctly.

### 2. Generate Authentication Tokens

```bash
node ./scripts/generate-auth-token.js
```

This script registers test users (if they don't exist) and generates authentication tokens for API testing.

### 3. Test API Endpoints

```bash
node ./scripts/test-api-endpoints.js
```

This script tests all API endpoints listed in the API documentation.

## Manual Testing

To manually test the API, you can use the tokens generated in step 2. They are saved in `postman/auth-tokens.json`.

Include the token in your requests:

```
Authorization: Bearer <token>
```

Example using curl:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..." http://localhost:3000/api/users
```

## Database Access

To access the PostgreSQL database directly:

```bash
docker exec -it hapi-postgres psql -U admin -d hapi
```

Common PostgreSQL commands:
- `\dt` - List tables
- `\d+ table_name` - Show table details
- `\q` - Quit

## Logs and Troubleshooting

View logs for all services:

```bash
docker-compose logs -f
```

View logs for a specific service:

```bash
docker-compose logs -f hapi-fhir  # HAPI FHIR server logs
docker-compose logs -f postgres    # PostgreSQL logs
docker-compose logs -f mongodb     # MongoDB logs
docker-compose logs -f nest-api    # NestJS API logs
```

## Stopping Services

To stop all services:

```bash
docker-compose down
```

To stop services and remove volumes (will delete all data):

```bash
docker-compose down -v
```

## Database Optimization

The PostgreSQL database has been optimized for FHIR workloads with the following settings:

- Increased work memory for complex queries
- Optimized maintenance settings
- Custom functions for FHIR operations
- Extended PostgreSQL with useful extensions (pg_trgm, btree_gin, uuid-ossp)

To see the full list of optimizations, check the `scripts/initialize-postgres.sql` file.

## Additional Documentation

For more information, see the following documentation:

- [SCALABILITY.md](docs/SCALABILITY.md) - Details on the scalability improvements
- [DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md) - Guide for migrating from H2 to PostgreSQL
- [TESTING_POSTGRESQL_CONFIG.md](docs/TESTING_POSTGRESQL_CONFIG.md) - Comprehensive testing guide

## Next Steps

After confirming that your setup is working correctly, consider:

1. Adjusting PostgreSQL settings in `scripts/initialize-postgres.sql` for your specific needs
2. Setting up regular database backups
3. Implementing health monitoring
4. Deploying to a production environment using `docker-compose.prod.yml` 