#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Testing specific endpoints that were failing..."

# Get authentication token
echo -e "${GREEN}Getting authentication token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}')

# Extract token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d':' -f2 | tr -d '"')

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get authentication token${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully obtained authentication token${NC}"

# Test 1: Get Observation by ID
echo -e "\n${YELLOW}Test 1: Get Observation by ID (obs-1)${NC}"
echo -e "Command: curl -s 'http://localhost:3000/api/fhir/Observation/obs-1' -H 'Authorization: Bearer $ACCESS_TOKEN' | jq"
RESPONSE=$(curl -s "http://localhost:3000/api/fhir/Observation/obs-1" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$RESPONSE" | grep -q "resourceType.*Observation"; then
  echo -e "${GREEN}SUCCESS${NC}"
  echo "$RESPONSE" | jq
else
  echo -e "${RED}FAILED${NC}"
  echo "$RESPONSE" | jq
fi

# Test 2: Get Encounter by ID
echo -e "\n${YELLOW}Test 2: Get Encounter by ID (enc-1)${NC}"
echo -e "Command: curl -s 'http://localhost:3000/api/fhir/Encounter/enc-1' -H 'Authorization: Bearer $ACCESS_TOKEN' | jq"
RESPONSE=$(curl -s "http://localhost:3000/api/fhir/Encounter/enc-1" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$RESPONSE" | grep -q "resourceType.*Encounter"; then
  echo -e "${GREEN}SUCCESS${NC}"
  echo "$RESPONSE" | jq
else
  echo -e "${RED}FAILED${NC}"
  echo "$RESPONSE" | jq
fi

# Test 3: Search Observations by value range
echo -e "\n${YELLOW}Test 3: Search Observations by value range${NC}"
echo -e "Command: curl -s 'http://localhost:3000/api/fhir/Observation?value-min=50&value-max=100' -H 'Authorization: Bearer $ACCESS_TOKEN' | jq"
RESPONSE=$(curl -s "http://localhost:3000/api/fhir/Observation?value-min=50&value-max=100" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$RESPONSE" | grep -q "resourceType.*Bundle"; then
  echo -e "${GREEN}SUCCESS${NC}"
  echo "$RESPONSE" | jq
else
  echo -e "${RED}FAILED${NC}"
  echo "$RESPONSE" | jq
fi

# Test 4: Test pagination with page parameter
echo -e "\n${YELLOW}Test 4: Test pagination with page parameter${NC}"
echo -e "Command: curl -s 'http://localhost:3000/api/fhir/Patient?_count=1&page=2' -H 'Authorization: Bearer $ACCESS_TOKEN' | jq"
RESPONSE=$(curl -s "http://localhost:3000/api/fhir/Patient?_count=1&page=2" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$RESPONSE" | grep -q "resourceType.*Bundle"; then
  echo -e "${GREEN}SUCCESS${NC}"
  echo "$RESPONSE" | jq '.entry[0].resource.id'
  echo "$RESPONSE" | jq '.link'
else
  echo -e "${RED}FAILED${NC}"
  echo "$RESPONSE" | jq
fi

echo -e "\n${GREEN}Testing completed!${NC}" 