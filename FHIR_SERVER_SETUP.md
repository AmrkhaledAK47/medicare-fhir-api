# HAPI FHIR Server Setup

This document provides instructions for setting up and using the HAPI FHIR server in our EHR platform.

## Overview

We've replaced the public HAPI FHIR test server with our own self-hosted HAPI FHIR server for several advantages:

- **Control**: Full control over the server configuration and data
- **Security**: No public access to our healthcare data
- **Performance**: Better performance with a dedicated server
- **Customization**: Ability to customize the server for our specific needs
- **Reliability**: Not dependent on external services that may change or become unavailable

## Requirements

- Docker and Docker Compose
- Node.js (for running initialization scripts)

## Quick Start

1. Start the FHIR server:
   ```bash
   npm run fhir:start
   ```

2. Initialize the FHIR server with sample resources:
   ```bash
   npm run fhir:init
   ```

3. To do both steps at once:
   ```bash
   npm run fhir:setup
   ```

4. To stop the FHIR server:
   ```bash
   npm run fhir:stop
   ```

5. To view the logs:
   ```bash
   npm run fhir:logs
   ```

## Server Details

- **FHIR Server URL**: http://localhost:9090/fhir
- **Web UI**: http://localhost:9090 (provides a user interface to explore and interact with resources)
- **PostgreSQL Database**: Running on port 5432

## Architecture

Our setup consists of:

1. **HAPI FHIR Server**: An open-source implementation of the FHIR standard
2. **PostgreSQL**: A robust database for storing FHIR resources
3. **Docker & Docker Compose**: For containerization and orchestration

## Configuration

The server is configured via:

1. `docker-compose.yml`: Defines the containers and networking
2. `hapi-fhir-config.yaml`: HAPI FHIR server specific configuration

### Key Configuration Options

Some important configuration options you might want to adjust:

- **Security settings**: CORS, authentication
- **Validation settings**: Enabling/disabling validation
- **Resource limits**: Page sizes, search results

## Sample Resources

The initialization script loads the following sample resources:

- Organization: ACME Health System
- Practitioners: Dr. Sarah Johnson and Dr. Carlos Martinez
- Patients: Emily Wilson and Michael Rodriguez

## Debugging

If you encounter issues:

1. Check the server logs:
   ```bash
   npm run fhir:logs
   ```

2. Verify the server health:
   ```bash
   curl http://localhost:9090/fhir/metadata
   ```

3. Run the health check API endpoint:
   ```bash
   curl http://localhost:3000/api/fhir/server-health
   ```

## Customizing the FHIR Server

To customize the server configuration:

1. Modify `hapi-fhir-config.yaml`
2. Restart the server:
   ```bash
   npm run fhir:stop && npm run fhir:start
   ```

## Backing Up Data

The PostgreSQL data is persisted in a Docker volume named `hapi-postgres-data`. To back up the data:

```bash
docker exec fhir_postgres pg_dump -U admin hapi > hapi_backup.sql
```

## Restoration

To restore from a backup:

```bash
cat hapi_backup.sql | docker exec -i fhir_postgres psql -U admin -d hapi
```

## Performance Considerations

For production deployments, consider:

- Using external PostgreSQL with optimized configuration
- Allocating appropriate resources to the Docker containers
- Setting up proper authentication and SSL

## Resources

- [HAPI FHIR Documentation](https://hapifhir.io/hapi-fhir/docs/)
- [FHIR Standard](https://hl7.org/FHIR/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) 