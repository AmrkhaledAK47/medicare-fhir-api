# Testing the PostgreSQL Configuration for HAPI FHIR

This guide provides comprehensive testing procedures for verifying that the PostgreSQL database is correctly configured and functioning optimally with the HAPI FHIR server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Basic Connectivity Tests](#basic-connectivity-tests)
- [Database Configuration Verification](#database-configuration-verification)
- [FHIR Resource Testing](#fhir-resource-testing)
- [Performance Testing](#performance-testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before testing, ensure you have:

1. PostgreSQL client tools installed (`psql`)
2. `curl` or another HTTP client for API testing
3. Docker and Docker Compose installed (for containerized setup)
4. The verification script: `scripts/verify-postgres-setup.sh`

## Basic Connectivity Tests

### 1. Database Connection

Test basic connectivity to the PostgreSQL database:

```bash
# Using the verify script
./scripts/verify-postgres-setup.sh

# Manually connecting to the database
docker exec -it hapi-postgres psql -U postgres -d hapi
```

Expected result: Successful connection to the database with no errors.

### 2. HAPI FHIR Server Connection

Verify that the HAPI FHIR server is running and can be reached:

```bash
curl -X GET http://localhost:8080/fhir/metadata
```

Expected result: A valid FHIR capability statement in JSON format.

## Database Configuration Verification

### 1. Check PostgreSQL Extensions

Verify that the required PostgreSQL extensions are installed:

```sql
SELECT * FROM pg_extension;
```

Expected extensions:
- `pg_trgm` (for text search)
- `btree_gin` (for GIN indexes)
- `uuid-ossp` (for UUID generation)
- `pg_stat_statements` (for query monitoring)

### 2. Verify Database Parameters

Check that the PostgreSQL parameters are set correctly:

```sql
SHOW work_mem;
SHOW maintenance_work_mem;
SHOW effective_cache_size;
SHOW max_connections;
SHOW shared_buffers;
SHOW random_page_cost;
SHOW effective_io_concurrency;
SHOW max_worker_processes;
SHOW max_parallel_workers;
SHOW max_parallel_workers_per_gather;
```

Compare the values against those set in the `initialize-postgres.sql` script.

### 3. Validate FHIR Custom Functions

Test the custom PostgreSQL functions created for FHIR operations:

```sql
-- Test the fhir_resource_contains function
SELECT fhir_resource_contains('{"resourceType":"Patient", "name":[{"given":["John"]}]}', 'John');

-- Test the extract_fhir_date function
SELECT extract_fhir_date('{"resourceType":"Observation", "effectiveDateTime":"2023-01-15"}', 'effectiveDateTime');
```

Expected results: The first query should return true, and the second query should return a date value.

## FHIR Resource Testing

### 1. Create a Test Patient

```bash
curl -X POST -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Patient","name":[{"family":"Test","given":["Patient"]}],"gender":"male","birthDate":"1970-01-01"}' \
  http://localhost:8080/fhir/Patient
```

Expected result: A successful response with an assigned ID for the new Patient resource.

### 2. Retrieve the Patient

```bash
curl -X GET http://localhost:8080/fhir/Patient?name=Test
```

Expected result: A FHIR bundle containing the Patient resource created in the previous step.

### 3. Modify the Patient

```bash
# First, get the ID from the previous request
PATIENT_ID="[ID from previous request]"

curl -X PUT -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Patient","id":"'$PATIENT_ID'","name":[{"family":"Test","given":["Updated","Patient"]}],"gender":"male","birthDate":"1970-01-01"}' \
  http://localhost:8080/fhir/Patient/$PATIENT_ID
```

Expected result: A successful response with the updated Patient resource.

### 4. Delete the Patient

```bash
curl -X DELETE http://localhost:8080/fhir/Patient/$PATIENT_ID
```

Expected result: A successful deletion response.

## Performance Testing

### 1. Batch Resource Creation

Test the database's ability to handle bulk inserts:

```bash
# Create a file with a FHIR transaction bundle containing multiple resources
curl -X POST -H "Content-Type: application/fhir+json" \
  -d @path/to/transaction-bundle.json \
  http://localhost:8080/fhir
```

Expected result: Successful creation of all resources in the bundle with acceptable response time.

### 2. Complex Search Operations

Test the performance of complex search operations:

```bash
# Search with multiple parameters
curl -X GET "http://localhost:8080/fhir/Observation?code=8867-4&date=gt2021-01-01&_include=Observation:subject&_sort=date"
```

Monitor query execution time in the PostgreSQL logs.

### 3. Query Plan Analysis

Examine query execution plans to verify index usage:

```sql
EXPLAIN ANALYZE SELECT * FROM hfj_resource 
WHERE res_type = 'Patient' 
AND res_deleted_at IS NULL 
AND res_id IN (
  SELECT res_id FROM hfj_spidx_string 
  WHERE hash_identity = 'Patient.name' 
  AND sp_value ILIKE '%Test%'
);
```

Expected result: The query plan should use appropriate indexes and show efficient execution.

## Troubleshooting

### Common Issues and Solutions

1. **Connection Refused Errors**
   - Verify that the PostgreSQL container is running
   - Check port mappings in docker-compose.yml
   - Ensure network connectivity between containers

2. **Slow Query Performance**
   - Check if appropriate indexes are created and used
   - Verify that autovacuum is running properly
   - Review PostgreSQL settings for memory allocation

3. **Out of Memory Errors**
   - Adjust `work_mem` and `shared_buffers` settings
   - Consider increasing container memory limits
   - Monitor memory usage patterns

4. **Database Corruption**
   - Ensure proper shutdown procedures
   - Implement regular backups
   - Consider enabling Write-Ahead Logging (WAL)

### Diagnostic Commands

```bash
# View PostgreSQL logs
docker exec hapi-postgres cat /var/log/postgresql/postgresql-14-main.log

# Check PostgreSQL processes
docker exec hapi-postgres ps aux | grep postgres

# View current connections
docker exec -it hapi-postgres psql -U postgres -d hapi -c "SELECT * FROM pg_stat_activity;"

# Check table sizes
docker exec -it hapi-postgres psql -U postgres -d hapi -c "SELECT pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size, relname FROM pg_class c LEFT JOIN pg_namespace n ON n.oid = c.relnamespace WHERE relkind = 'r' AND n.nspname = 'public' ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 20;"
```

## Next Steps

After successful testing, consider:

1. Setting up monitoring with Prometheus/Grafana
2. Implementing an automated backup strategy
3. Creating a disaster recovery plan
4. Documenting performance baselines for future reference 