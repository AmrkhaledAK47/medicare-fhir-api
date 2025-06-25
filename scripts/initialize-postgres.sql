-- PostgreSQL initialization script for HAPI FHIR

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search improvements
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- For GIN index support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation

-- Optimize PostgreSQL for FHIR workloads
ALTER SYSTEM SET work_mem = '16MB';  -- Increase working memory for complex queries
ALTER SYSTEM SET maintenance_work_mem = '128MB';  -- For better vacuum and index operations
ALTER SYSTEM SET effective_cache_size = '1GB';  -- Estimate of OS cache for planning
ALTER SYSTEM SET random_page_cost = '1.1';  -- Assuming SSD storage
ALTER SYSTEM SET checkpoint_completion_target = '0.9';  -- Spread checkpoints
ALTER SYSTEM SET wal_buffers = '16MB';  -- WAL buffer size
ALTER SYSTEM SET default_statistics_target = '100';  -- More statistics for planner
ALTER SYSTEM SET max_parallel_workers_per_gather = '4';  -- Max parallel query workers
ALTER SYSTEM SET effective_io_concurrency = '200';  -- Concurrent I/O operations
ALTER SYSTEM SET max_connections = '100';  -- Adjust based on expected connections

-- Create useful functions for FHIR operations

-- Function to search JSON data in FHIR resources
CREATE OR REPLACE FUNCTION fhir_resource_contains(resource_json JSONB, search_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN resource_json::TEXT ILIKE '%' || search_text || '%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract a FHIR date from a resource
CREATE OR REPLACE FUNCTION extract_fhir_date(resource_json JSONB, path_to_date TEXT)
RETURNS TIMESTAMP AS $$
DECLARE
    date_value TEXT;
BEGIN
    date_value := resource_json #>> ARRAY_REMOVE(STRING_TO_ARRAY(path_to_date, '.'), '');
    
    -- Handle FHIR date formats
    IF date_value ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' THEN
        RETURN date_value::TIMESTAMP;
    ELSIF date_value ~ '^\d{4}-\d{2}-\d{2}$' THEN
        RETURN (date_value || 'T00:00:00Z')::TIMESTAMP;
    ELSE
        RETURN NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create custom indices for common FHIR search patterns

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Apply database settings
ALTER DATABASE hapi SET search_path TO "$user", public;
ALTER DATABASE hapi SET statement_timeout = '300000';  -- 5-minute timeout on statements

-- Notify of successful completion
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL database has been successfully initialized for HAPI FHIR.';
END $$; 