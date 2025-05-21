#!/bin/bash

echo "===== Starting MediCare Infrastructure ====="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if the services are already running
if docker ps | grep -q hapi-fhir-jpaserver; then
    echo "HAPI FHIR server is already running."
    echo "Access it at: http://localhost:9090/fhir"
else
    # Start services using Docker Compose
    echo "Starting MediCare infrastructure using Docker Compose..."
    docker-compose up -d

    echo "Waiting for services to initialize..."
    sleep 10

    # Check if the HAPI FHIR container started successfully
    if docker ps | grep -q hapi-fhir-jpaserver; then
        echo "✅ HAPI FHIR server started successfully!"
        echo "   Access it at: http://localhost:9090/fhir"
    else
        echo "❌ Failed to start HAPI FHIR server. Check Docker logs for details:"
        echo "   docker logs hapi-fhir-jpaserver"
    fi

    # Check if MongoDB started successfully
    if docker ps | grep -q medicare-mongodb; then
        echo "✅ MongoDB started successfully!"
        echo "   Available at: mongodb://localhost:27017"
    else
        echo "❌ Failed to start MongoDB. Check Docker logs for details:"
        echo "   docker logs medicare-mongodb"
    fi
fi

echo ""
echo "===== Useful Commands ====="
echo "• View HAPI FHIR logs: docker logs hapi-fhir-jpaserver"
echo "• View MongoDB logs: docker logs medicare-mongodb"
echo "• Stop all services: docker-compose down"
echo "• Restart services: docker-compose restart"
echo "===== ================ =====" 