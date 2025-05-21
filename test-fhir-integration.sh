#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for required env file
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with your FHIR server configuration."
  echo "Example:"
  echo "FHIR_SERVER_URL=https://your-fhir-server.com/fhir"
  echo "FHIR_AUTH_TYPE=bearer|basic|none"
  echo "FHIR_AUTH_TOKEN=your-token-or-credentials"
  exit 1
fi

# Load environment variables
source .env

# Display header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Third-Party FHIR Integration Tester  ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# Check for required tools
for cmd in curl jq; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}Error: $cmd is not installed${NC}"
    echo "Please install $cmd and try again"
    exit 1
  fi
done

# Validate required env variables
if [ -z "$FHIR_SERVER_URL" ]; then
  echo -e "${RED}Error: FHIR_SERVER_URL not set in .env file${NC}"
  exit 1
fi

echo -e "Testing connection to FHIR server at: ${YELLOW}$FHIR_SERVER_URL${NC}"

# Prepare headers based on auth type
HEADERS=""
if [ "$FHIR_AUTH_TYPE" = "bearer" ] && [ ! -z "$FHIR_AUTH_TOKEN" ]; then
  HEADERS="-H \"Authorization: Bearer $FHIR_AUTH_TOKEN\""
elif [ "$FHIR_AUTH_TYPE" = "basic" ] && [ ! -z "$FHIR_AUTH_TOKEN" ]; then
  HEADERS="-H \"Authorization: Basic $FHIR_AUTH_TOKEN\""
fi

# Function to test connectivity
test_connectivity() {
  echo -e "\n${BLUE}1. Testing Server Connectivity${NC}"
  
  # Use eval to properly handle the headers
  HTTP_CODE=$(eval curl -s -o /dev/null -w "%{http_code}" $HEADERS "$FHIR_SERVER_URL/metadata")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Server is accessible (HTTP $HTTP_CODE)${NC}"
    return 0
  else
    echo -e "${RED}✗ Server returned HTTP $HTTP_CODE${NC}"
    echo -e "${RED}✗ Failed to connect to FHIR server${NC}"
    return 1
  fi
}

# Function to get server capabilities
test_capabilities() {
  echo -e "\n${BLUE}2. Checking Server Capabilities${NC}"
  
  # Use eval to properly handle the headers
  RESPONSE=$(eval curl -s $HEADERS "$FHIR_SERVER_URL/metadata")
  
  # Check if response is valid JSON
  if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ Server did not return valid JSON${NC}"
    return 1
  fi
  
  # Extract FHIR version
  FHIR_VERSION=$(echo "$RESPONSE" | jq -r '.fhirVersion // "Unknown"')
  SOFTWARE=$(echo "$RESPONSE" | jq -r '.software.name // "Unknown"')
  
  echo -e "${GREEN}✓ Server Information:${NC}"
  echo -e "  - FHIR Version: ${YELLOW}$FHIR_VERSION${NC}"
  echo -e "  - Software: ${YELLOW}$SOFTWARE${NC}"
  
  # Check supported resources
  RESOURCES=$(echo "$RESPONSE" | jq -r '.rest[0].resource[].type' 2>/dev/null)
  
  if [ -z "$RESOURCES" ]; then
    echo -e "${YELLOW}! Could not extract supported resources${NC}"
  else
    RESOURCE_COUNT=$(echo "$RESOURCES" | wc -l)
    echo -e "  - Supported Resources: ${YELLOW}$RESOURCE_COUNT${NC} resources"
    echo -e "${GREEN}✓ First 5 supported resources:${NC}"
    echo "$RESOURCES" | head -5 | while read -r resource; do
      echo -e "  - ${YELLOW}$resource${NC}"
    done
  fi
  
  return 0
}

# Function to test Patient resource operations
test_patient_operations() {
  echo -e "\n${BLUE}3. Testing Patient Resource Operations${NC}"
  
  # Create a test patient
  echo -e "\n${BLUE}3.1 Creating test patient${NC}"
  PATIENT_DATA='{
    "resourceType": "Patient",
    "name": [{"family": "TestPatient", "given": ["Integration"]}],
    "gender": "unknown",
    "birthDate": "2000-01-01"
  }'
  
  # Use eval to properly handle the headers
  CREATE_RESPONSE=$(eval curl -s -X POST -H \"Content-Type: application/json\" $HEADERS -d \'$PATIENT_DATA\' "$FHIR_SERVER_URL/Patient")
  
  # Check if response is valid JSON
  if ! echo "$CREATE_RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to create Patient. Server did not return valid JSON${NC}"
    return 1
  fi
  
  # Get patient ID
  PATIENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
  
  if [ -z "$PATIENT_ID" ]; then
    echo -e "${RED}✗ Failed to create Patient. No ID returned${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ Created Patient with ID: ${YELLOW}$PATIENT_ID${NC}"
  
  # Read the created patient
  echo -e "\n${BLUE}3.2 Reading patient${NC}"
  READ_RESPONSE=$(eval curl -s $HEADERS "$FHIR_SERVER_URL/Patient/$PATIENT_ID")
  
  # Check if response is valid JSON
  if ! echo "$READ_RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to read Patient. Server did not return valid JSON${NC}"
    return 1
  fi
  
  READ_ID=$(echo "$READ_RESPONSE" | jq -r '.id // empty')
  
  if [ "$READ_ID" = "$PATIENT_ID" ]; then
    echo -e "${GREEN}✓ Successfully read Patient: ${YELLOW}$PATIENT_ID${NC}"
  else
    echo -e "${RED}✗ Failed to read correct Patient${NC}"
    return 1
  fi
  
  # Update the patient
  echo -e "\n${BLUE}3.3 Updating patient${NC}"
  UPDATE_DATA=$(echo "$READ_RESPONSE" | jq '.name[0].family = "UpdatedTestPatient"')
  
  UPDATE_RESPONSE=$(eval curl -s -X PUT -H \"Content-Type: application/json\" $HEADERS -d \'$UPDATE_DATA\' "$FHIR_SERVER_URL/Patient/$PATIENT_ID")
  
  # Check if response is valid JSON
  if ! echo "$UPDATE_RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to update Patient. Server did not return valid JSON${NC}"
    return 1
  fi
  
  UPDATED_FAMILY=$(echo "$UPDATE_RESPONSE" | jq -r '.name[0].family // empty')
  
  if [ "$UPDATED_FAMILY" = "UpdatedTestPatient" ]; then
    echo -e "${GREEN}✓ Successfully updated Patient: ${YELLOW}$PATIENT_ID${NC}"
  else
    echo -e "${YELLOW}! Update response did not confirm the changes${NC}"
  fi
  
  # Search for patients
  echo -e "\n${BLUE}3.4 Searching for patients${NC}"
  SEARCH_RESPONSE=$(eval curl -s $HEADERS "$FHIR_SERVER_URL/Patient?family=UpdatedTestPatient")
  
  # Check if response is valid JSON
  if ! echo "$SEARCH_RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to search for Patients. Server did not return valid JSON${NC}"
    return 1
  fi
  
  SEARCH_TOTAL=$(echo "$SEARCH_RESPONSE" | jq -r '.total // 0')
  
  if [ "$SEARCH_TOTAL" -gt 0 ]; then
    echo -e "${GREEN}✓ Search found ${YELLOW}$SEARCH_TOTAL${GREEN} matching patients${NC}"
  else
    echo -e "${YELLOW}! Search found no matching patients${NC}"
  fi
  
  # Delete the patient
  echo -e "\n${BLUE}3.5 Deleting patient${NC}"
  DELETE_RESPONSE=$(eval curl -s -X DELETE $HEADERS "$FHIR_SERVER_URL/Patient/$PATIENT_ID" -w "%{http_code}" -o /dev/null)
  
  if [ "$DELETE_RESPONSE" = "200" ] || [ "$DELETE_RESPONSE" = "204" ]; then
    echo -e "${GREEN}✓ Successfully deleted Patient: ${YELLOW}$PATIENT_ID${NC}"
  else
    echo -e "${YELLOW}! Delete operation returned HTTP code: ${YELLOW}$DELETE_RESPONSE${NC}"
  fi
  
  return 0
}

# Test advanced operations
test_advanced_operations() {
  echo -e "\n${BLUE}4. Testing Advanced Operations${NC}"
  
  # Test transaction bundle if supported
  echo -e "\n${BLUE}4.1 Testing transaction capability${NC}"
  
  BUNDLE_DATA='{
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      {
        "request": {
          "method": "POST",
          "url": "Patient"
        },
        "resource": {
          "resourceType": "Patient",
          "name": [{"family": "BundleTest", "given": ["Transaction"]}],
          "gender": "unknown"
        }
      }
    ]
  }'
  
  TRANSACTION_RESPONSE=$(eval curl -s -X POST -H \"Content-Type: application/json\" $HEADERS -d \'$BUNDLE_DATA\' "$FHIR_SERVER_URL")
  
  # Check if response is valid JSON
  if ! echo "$TRANSACTION_RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${YELLOW}! Transaction operation not supported or failed${NC}"
  else
    TX_TYPE=$(echo "$TRANSACTION_RESPONSE" | jq -r '.resourceType // empty')
    
    if [ "$TX_TYPE" = "Bundle" ]; then
      echo -e "${GREEN}✓ Transaction bundle supported${NC}"
      ENTRY_COUNT=$(echo "$TRANSACTION_RESPONSE" | jq '.entry | length // 0')
      echo -e "${GREEN}✓ Bundle response has ${YELLOW}$ENTRY_COUNT${GREEN} entries${NC}"
    else
      echo -e "${YELLOW}! Transaction bundle may not be supported${NC}"
    fi
  fi
  
  return 0
}

# Run the tests
test_connectivity
if [ $? -eq 0 ]; then
  test_capabilities
  test_patient_operations
  test_advanced_operations
  
  echo -e "\n${GREEN}==================================${NC}"
  echo -e "${GREEN}✓ Integration tests completed${NC}"
  echo -e "${GREEN}==================================${NC}"
else
  echo -e "\n${RED}==================================${NC}"
  echo -e "${RED}✗ Integration tests failed${NC}"
  echo -e "${RED}==================================${NC}"
  exit 1
fi 