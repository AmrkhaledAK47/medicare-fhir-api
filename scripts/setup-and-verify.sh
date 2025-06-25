#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MediCare FHIR API Setup and Verification ===${NC}"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose and try again.${NC}"
    exit 1
fi

# Make sure we're in the project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "${YELLOW}1. Stopping any existing containers${NC}"
docker-compose down

echo -e "${YELLOW}2. Building and starting all services${NC}"
docker-compose up -d --build

echo -e "${YELLOW}3. Waiting for services to initialize (30 seconds)...${NC}"
sleep 30

# Verify PostgreSQL
echo -e "${YELLOW}4. Verifying PostgreSQL...${NC}"
if docker exec hapi-postgres pg_isready -U admin -d hapi; then
    echo -e "${GREEN}✅ PostgreSQL is running and accepting connections${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not responding${NC}"
    echo "Logs:"
    docker logs hapi-postgres --tail 20
    exit 1
fi

# Verify HAPI FHIR server
echo -e "${YELLOW}5. Verifying HAPI FHIR server...${NC}"
if curl -s -f http://localhost:9090/fhir/metadata > /dev/null; then
    echo -e "${GREEN}✅ HAPI FHIR server is running and responding${NC}"
else
    echo -e "${RED}❌ HAPI FHIR server is not responding${NC}"
    echo "Logs:"
    docker logs hapi-fhir-jpaserver --tail 20
    exit 1
fi

# Verify MongoDB
echo -e "${YELLOW}6. Verifying MongoDB...${NC}"
if docker exec medicare-mongodb mongosh --eval "db.runCommand({ping: 1})" | grep -q "ok: 1"; then
    echo -e "${GREEN}✅ MongoDB is running and responding${NC}"
else
    echo -e "${RED}❌ MongoDB is not responding${NC}"
    echo "Logs:"
    docker logs medicare-mongodb --tail 20
    exit 1
fi

# Verify NestJS API
echo -e "${YELLOW}7. Verifying NestJS API...${NC}"
# Give it a bit more time to start up
sleep 10
if curl -s -f http://localhost:3000/api > /dev/null; then
    echo -e "${GREEN}✅ NestJS API is running and responding${NC}"
else
    echo -e "${RED}❌ NestJS API is not responding${NC}"
    echo "Logs:"
    docker logs medicare-api --tail 20
    exit 1
fi

echo
echo -e "${GREEN}=== All services are up and running! ===${NC}"
echo
echo -e "Services available at:"
echo -e "  - HAPI FHIR Server: ${BLUE}http://localhost:9090/fhir${NC}"
echo -e "  - NestJS API: ${BLUE}http://localhost:3000/api${NC}"
echo -e "  - API Documentation: ${BLUE}http://localhost:3000/api-docs${NC}"
echo
echo -e "${YELLOW}To test the API endpoints, run:${NC}"
echo -e "  ${BLUE}cd postman${NC}"
echo -e "  ${BLUE}newman run medicare-api.postman_collection.json${NC}"
echo
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  ${BLUE}docker-compose logs -f${NC}"
echo
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  ${BLUE}docker-compose down${NC}" 