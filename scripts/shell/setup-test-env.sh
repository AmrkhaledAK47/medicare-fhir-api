#!/bin/bash

# Start MongoDB and FHIR server using docker-compose
echo "Starting MongoDB and FHIR server..."
docker-compose up -d

# Wait for servers to be ready
echo "Waiting for servers to be ready..."
sleep 5

# Check if MongoDB is running
echo "Checking MongoDB connection..."
if nc -z localhost 27017; then
  echo "MongoDB is running"
else
  echo "MongoDB is not running. Please check docker-compose logs."
  exit 1
fi

# Check if FHIR server is running
echo "Checking FHIR server connection..."
if nc -z localhost 9090; then
  echo "FHIR server is running"
else
  echo "FHIR server is not running. Please check docker-compose logs."
  exit 1
fi

echo "Environment is ready for testing!"
echo "Now run: npm run start:dev" 