#!/bin/bash

# Script to set up PostgreSQL database for HAPI FHIR

echo "=== Setting up PostgreSQL database for HAPI FHIR ==="

# Check if PostgreSQL container is running
if ! docker ps | grep -q "hapi-postgres"; then
    echo "Starting PostgreSQL container..."
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to start
    echo "Waiting for PostgreSQL to start..."
    sleep 10
fi

# Check if PostgreSQL container is running now
if ! docker ps | grep -q "hapi-postgres"; then
    echo "❌ PostgreSQL container failed to start. Check docker-compose logs."
    exit 1
fi

# Create database initialization script
echo "Initializing PostgreSQL with optimizations..."
docker cp scripts/initialize-postgres.sql hapi-postgres:/tmp/initialize-postgres.sql

# Run the initialization script
docker exec -u postgres hapi-postgres psql -d hapi -f /tmp/initialize-postgres.sql

# Verify database setup
echo "Verifying database setup..."
if docker exec -u postgres hapi-postgres psql -d hapi -c "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';" | grep -q "pg_trgm"; then
    echo "✅ PostgreSQL extensions installed successfully"
else
    echo "❌ Failed to install PostgreSQL extensions"
    exit 1
fi

# Start HAPI FHIR server if not running
if ! docker ps | grep -q "hapi-fhir-jpaserver"; then
    echo "Starting HAPI FHIR server..."
    docker-compose up -d hapi-fhir
    
    # Wait for HAPI FHIR to start
    echo "Waiting for HAPI FHIR server to start..."
    sleep 30
    
    # Check if HAPI FHIR server is healthy
    if curl -s -f http://localhost:9090/fhir/metadata > /dev/null; then
        echo "✅ HAPI FHIR server is running"
    else
        echo "❌ HAPI FHIR server failed to start or is not healthy"
        echo "Check logs with: docker logs hapi-fhir-jpaserver"
        exit 1
    fi
else
    echo "HAPI FHIR server is already running"
fi

echo "=== PostgreSQL setup complete ==="
echo ""
echo "Your HAPI FHIR server with PostgreSQL is running at: http://localhost:9090/fhir"
echo "" 