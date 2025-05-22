#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  FHIR API Integration Test Runner    ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# Start the containers if they're not already running
echo -e "${YELLOW}Checking if HAPI FHIR and MongoDB are running...${NC}"
if ! docker ps | grep -q "hapi-fhir-jpaserver"; then
  echo -e "${YELLOW}Starting the necessary containers...${NC}"
  docker-compose up -d
  
  # Wait for HAPI FHIR server to be ready
  echo -e "${YELLOW}Waiting for HAPI FHIR server to be ready...${NC}"
  attempt=0
  while [ $attempt -lt 30 ]; do
    if curl -sf http://localhost:9090/fhir/metadata > /dev/null; then
      echo -e "${GREEN}HAPI FHIR server is ready!${NC}"
      break
    fi
    attempt=$((attempt+1))
    echo -n "."
    sleep 2
  done
  
  if [ $attempt -eq 30 ]; then
    echo -e "${RED}Timed out waiting for HAPI FHIR server to be ready.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}Containers are already running.${NC}"
fi

# Start NestJS API in test mode in the background
echo -e "${YELLOW}Starting NestJS API in test mode...${NC}"
NODE_ENV=test npm run start:dev > api.log 2>&1 &
API_PID=$!

# Wait for API to be ready
echo -e "${YELLOW}Waiting for API to be ready...${NC}"
attempt=0
while [ $attempt -lt 30 ]; do
  # First try without auth
  if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}API is ready!${NC}"
    break
  fi
  
  # If that fails, try checking if the server is running by checking if the port is open
  if nc -z localhost 3000; then
    echo -e "${GREEN}API port is open and server is running!${NC}"
    break
  fi
  
  attempt=$((attempt+1))
  echo -n "."
  sleep 1
done

if [ $attempt -eq 30 ]; then
  echo -e "${RED}Timed out waiting for API to be ready.${NC}"
  kill $API_PID
  exit 1
fi

# Run the integration tests
echo -e "${YELLOW}Running integration tests...${NC}"
npm run test:e2e

TEST_RESULT=$?

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
kill $API_PID

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}All integration tests passed successfully!${NC}"
else
  echo -e "${RED}Some integration tests failed.${NC}"
  echo -e "${YELLOW}Check the test output above for details.${NC}"
fi

# Ask if user wants to keep containers running
echo
echo -e "${YELLOW}Do you want to keep the containers running? (y/n)${NC}"
read -r keep_running

if [ "$keep_running" != "y" ] && [ "$keep_running" != "Y" ]; then
  echo -e "${YELLOW}Stopping containers...${NC}"
  docker-compose down
  echo -e "${GREEN}Containers stopped.${NC}"
else
  echo -e "${GREEN}Containers are still running.${NC}"
  echo -e "${YELLOW}You can stop them later with: docker-compose down${NC}"
fi

exit $TEST_RESULT 