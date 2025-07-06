#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Authenticating with MediCare FHIR API...${NC}"

# Login to get authentication token
AUTH_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }')

# Extract token using grep and cut (more portable than jq)
ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d':' -f2 | tr -d '\"')

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Authentication failed. Response:${NC}"
  echo "$AUTH_RESPONSE"
  exit 1
else
  echo -e "${GREEN}Authentication successful.${NC}"
  echo "$ACCESS_TOKEN" > token.txt
  echo -e "${BLUE}Token saved to token.txt${NC}"
  
  # Test token by making a request to the health endpoint
  HEALTH_RESPONSE=$(curl -s "http://localhost:3000/api/health/fhir-server" -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$HEALTH_RESPONSE" | grep -q "status.*up"; then
    echo -e "${GREEN}FHIR server is up and running.${NC}"
  else
    echo -e "${RED}FHIR server health check failed. Response:${NC}"
    echo "$HEALTH_RESPONSE"
  fi
fi
