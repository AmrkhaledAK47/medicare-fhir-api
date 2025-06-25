#!/bin/bash

# Script to verify PostgreSQL setup for HAPI FHIR

echo "=== Verifying PostgreSQL setup for HAPI FHIR ==="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q "hapi-postgres"; then
    echo "❌ PostgreSQL container is not running. Please start it with docker-compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL container is running"

# Check if HAPI FHIR server is running
if ! docker ps | grep -q "hapi-fhir-jpaserver"; then
    echo "❌ HAPI FHIR server container is not running. Please start it with docker-compose up -d"
    exit 1
fi

echo "✅ HAPI FHIR server container is running"

# Test database connection via postgres client in the container
echo "Testing PostgreSQL connection..."
docker exec hapi-postgres psql -U admin -d hapi -c "SELECT 'Connection successful' AS status;" || {
    echo "❌ Could not connect to PostgreSQL database"
    exit 1
}

# Check HAPI FHIR server health
echo "Testing HAPI FHIR server health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/fhir/metadata | grep -q "200"; then
    echo "✅ HAPI FHIR server is healthy and responding"
else
    echo "❌ HAPI FHIR server is not responding properly"
    exit 1
fi

echo "=== Verification complete ==="
echo "PostgreSQL is correctly configured for use with HAPI FHIR"
echo ""
echo "Useful commands:"
echo "- View HAPI FHIR logs: docker logs hapi-fhir-jpaserver"
echo "- View PostgreSQL logs: docker logs hapi-postgres"
echo "- Connect to PostgreSQL: docker exec -it hapi-postgres psql -U admin -d hapi"
echo "- List FHIR resources: curl http://localhost:9090/fhir/Patient"
echo "" 