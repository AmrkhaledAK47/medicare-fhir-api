#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Function to run a test and check the response
run_test() {
  local description=$1
  local command=$2
  
  echo -e "${YELLOW}Testing: ${description}${NC}"
  echo -e "Command: ${command}"
  
  # Run the command and capture the output
  response=$(eval $command)
  
  # Check if the response contains an error
  if echo "$response" | grep -q "error\|OperationOutcome"; then
    echo -e "${RED}FAILED: Error in response${NC}"
    echo "$response" | head -20
  else
    echo -e "${GREEN}SUCCESS${NC}"
    # Print a truncated version of the response
    echo "$response" | head -20
    if [ $(echo "$response" | wc -l) -gt 20 ]; then
      echo "... (truncated)"
    fi
  fi
  
  echo -e "\n"
}

# Generate a token
print_section "Generating Authentication Token"
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}' > token_response.json

# Extract the token
TOKEN=$(cat token_response.json | grep -o '"accessToken":"[^"]*"' | cut -d':' -f2 | tr -d '"')
echo "Token: ${TOKEN:0:20}... (truncated)"
echo $TOKEN > token.txt

# Check if token was generated successfully
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to generate token. Exiting.${NC}"
  exit 1
fi

# Authentication Testing
print_section "Authentication Testing"

run_test "Unauthorized access" \
  "curl -s 'http://localhost:3000/api/fhir/Patient' | jq"

run_test "Authorized access" \
  "curl -s 'http://localhost:3000/api/fhir/Patient' -H 'Authorization: Bearer $TOKEN' | jq"

# Patient Resource Testing
print_section "Patient Resource Testing"

run_test "Get all patients" \
  "curl -s 'http://localhost:3000/api/fhir/Patient' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Get patient by ID" \
  "curl -s 'http://localhost:3000/api/fhir/Patient/1' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search patients by gender" \
  "curl -s 'http://localhost:3000/api/fhir/Patient?gender=male' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search patients by name" \
  "curl -s 'http://localhost:3000/api/fhir/Patient?name=John' -H 'Authorization: Bearer $TOKEN' | jq"

# Observation Resource Testing
print_section "Observation Resource Testing"

run_test "Get all observations" \
  "curl -s 'http://localhost:3000/api/fhir/Observation' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Get observation by ID" \
  "curl -s 'http://localhost:3000/api/fhir/Observation/1' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search observations by patient" \
  "curl -s 'http://localhost:3000/api/fhir/Observation?subject=Patient/1' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search observations by category" \
  "curl -s 'http://localhost:3000/api/fhir/Observation?category=vital-signs' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search observations by value range" \
  "curl -s 'http://localhost:3000/api/fhir/Observation?value-min=100&value-max=200' -H 'Authorization: Bearer $TOKEN' | jq"

# Encounter Resource Testing
print_section "Encounter Resource Testing"

run_test "Get all encounters" \
  "curl -s 'http://localhost:3000/api/fhir/Encounter' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Get encounter by ID" \
  "curl -s 'http://localhost:3000/api/fhir/Encounter/1' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search encounters by patient" \
  "curl -s 'http://localhost:3000/api/fhir/Encounter?subject=Patient/1' -H 'Authorization: Bearer $TOKEN' | jq"

# Condition Resource Testing
print_section "Condition Resource Testing"

run_test "Get all conditions" \
  "curl -s 'http://localhost:3000/api/fhir/Condition' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search conditions by patient" \
  "curl -s 'http://localhost:3000/api/fhir/Condition?subject=Patient/1' -H 'Authorization: Bearer $TOKEN' | jq"

# Medication Resource Testing
print_section "Medication Resource Testing"

run_test "Get all medications" \
  "curl -s 'http://localhost:3000/api/fhir/Medication' -H 'Authorization: Bearer $TOKEN' | jq"

# MedicationRequest Resource Testing
print_section "MedicationRequest Resource Testing"

run_test "Get all medication requests" \
  "curl -s 'http://localhost:3000/api/fhir/MedicationRequest' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Search medication requests by patient" \
  "curl -s 'http://localhost:3000/api/fhir/MedicationRequest?subject=Patient/1' -H 'Authorization: Bearer $TOKEN' | jq"

# Test Pagination
print_section "Pagination Testing"

run_test "Test pagination with _count" \
  "curl -s 'http://localhost:3000/api/fhir/Patient?_count=1' -H 'Authorization: Bearer $TOKEN' | jq"

run_test "Test pagination with page parameter" \
  "curl -s 'http://localhost:3000/api/fhir/Patient?_count=1&page=2' -H 'Authorization: Bearer $TOKEN' | jq"

# Test URL rewriting in links
print_section "URL Rewriting Testing"

run_test "Test URL rewriting in bundle links" \
  "curl -s 'http://localhost:3000/api/fhir/Patient?_count=1' -H 'Authorization: Bearer $TOKEN' | jq '.link'"

echo -e "\n${GREEN}Testing completed!${NC}" 