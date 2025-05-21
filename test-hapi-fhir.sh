#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "===== Testing HAPI FHIR Server ====="
echo ""

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl first.${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Output will not be formatted.${NC}"
    echo "Install jq for better output formatting:"
    echo "Ubuntu/Debian: sudo apt-get install jq"
    echo "macOS: brew install jq"
    HAS_JQ=false
else
    HAS_JQ=true
fi

# HAPI FHIR server URL
FHIR_URL="http://localhost:9090/fhir"

# Test server availability
echo -e "Testing FHIR server connectivity..."
if ! curl -s -o /dev/null -w "%{http_code}" "${FHIR_URL}/metadata" | grep -q "200"; then
    echo -e "${RED}Failed: FHIR server is not running or not accessible at ${FHIR_URL}${NC}"
    echo "Make sure the HAPI FHIR server is running using ./start-hapi-fhir.sh"
    exit 1
fi
echo -e "${GREEN}Success: FHIR server is running at ${FHIR_URL}${NC}"
echo ""

# Test server capabilities
echo "Testing FHIR server capabilities..."
RESPONSE=$(curl -s "${FHIR_URL}/metadata")
if $HAS_JQ; then
    FHIR_VERSION=$(echo "$RESPONSE" | jq -r '.fhirVersion')
    SOFTWARE_NAME=$(echo "$RESPONSE" | jq -r '.software.name')
    echo -e "${GREEN}Server info:${NC}"
    echo "  - FHIR Version: $FHIR_VERSION"
    echo "  - Software: $SOFTWARE_NAME"
else
    echo -e "${GREEN}Server is responding with capability statement${NC}"
fi
echo ""

# Create a test Patient resource
echo "Creating test Patient resource..."
PATIENT_DATA='{
    "resourceType": "Patient",
    "active": true,
    "name": [
        {
            "use": "official",
            "family": "Test",
            "given": ["Patient"]
        }
    ],
    "gender": "unknown",
    "birthDate": "1990-01-01"
}'

PATIENT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$PATIENT_DATA" "${FHIR_URL}/Patient")
if $HAS_JQ; then
    PATIENT_ID=$(echo "$PATIENT_RESPONSE" | jq -r '.id // empty')
    if [ -n "$PATIENT_ID" ]; then
        echo -e "${GREEN}Success: Created Patient resource with ID: ${PATIENT_ID}${NC}"
    else
        echo -e "${RED}Failed: Could not create Patient resource${NC}"
        echo "Response: $(echo "$PATIENT_RESPONSE" | jq '.')"
    fi
else
    echo "Response received from server (install jq for better output)"
fi
echo ""

# Search for patients
echo "Searching for patients..."
SEARCH_RESPONSE=$(curl -s "${FHIR_URL}/Patient?_count=5")
if $HAS_JQ; then
    TOTAL=$(echo "$SEARCH_RESPONSE" | jq -r '.total // 0')
    echo -e "${GREEN}Success: Found ${TOTAL} patients${NC}"
else
    echo -e "${GREEN}Search request completed${NC}"
fi
echo ""

echo -e "${GREEN}===== HAPI FHIR Server Tests Completed =====${NC}" 