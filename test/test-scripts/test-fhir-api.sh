#!/bin/bash

echo "===== MediCare FHIR API Test Script ====="
echo ""

# Set API base URL - now pointing directly to HAPI FHIR server
API_URL="http://localhost:9090/fhir"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it first.${NC}"
    echo "Ubuntu/Debian: sudo apt-get install jq"
    echo "RHEL/CentOS: sudo yum install jq"
    echo "macOS: brew install jq"
    exit 1
fi

# Check if the HAPI FHIR server is running
echo -e "${BLUE}Checking if the HAPI FHIR server is running...${NC}"
if ! curl -s "$API_URL/metadata" > /dev/null; then
    echo -e "${RED}Error: HAPI FHIR server is not running at $API_URL${NC}"
    echo "Please start the HAPI FHIR server first with: ./start-hapi-fhir.sh"
    exit 1
fi
echo -e "${GREEN}HAPI FHIR server is running!${NC}"
echo ""

# Get FHIR server metadata
echo -e "${BLUE}Getting FHIR server metadata...${NC}"
METADATA=$(curl -s "$API_URL/metadata" | jq .)
echo -e "${GREEN}FHIR server metadata:${NC}"
echo "$METADATA" | jq '.resourceType, .fhirVersion, .software.name, .software.version'
echo ""

# Test creating a Patient
echo -e "${BLUE}Creating a Patient resource...${NC}"
PATIENT_DATA='{
    "resourceType": "Patient",
    "active": true,
    "name": [
        {
            "use": "official",
            "family": "Smith",
            "given": ["John"]
        }
    ],
    "gender": "male",
    "birthDate": "1990-01-01",
    "telecom": [
        {
            "system": "phone",
            "value": "555-123-4567",
            "use": "home"
        },
        {
            "system": "email",
            "value": "john.smith@example.com"
        }
    ],
    "address": [
        {
            "use": "home",
            "line": ["123 Main St"],
            "city": "Anytown",
            "state": "CA",
            "postalCode": "12345",
            "country": "USA"
        }
    ]
}'

PATIENT_RESULT=$(curl -s -X POST "$API_URL/Patient" \
    -H "Content-Type: application/json" \
    -d "$PATIENT_DATA")

if echo "$PATIENT_RESULT" | jq -e '.id' > /dev/null; then
    PATIENT_ID=$(echo "$PATIENT_RESULT" | jq -r '.id')
    echo -e "${GREEN}Patient created successfully with ID: $PATIENT_ID${NC}"
else
    echo -e "${RED}Failed to create Patient. Response:${NC}"
    echo "$PATIENT_RESULT" | jq
    PATIENT_ID="unknown"
fi
echo ""

# Test creating a Practitioner
echo -e "${BLUE}Creating a Practitioner resource...${NC}"
PRACTITIONER_DATA='{
    "resourceType": "Practitioner",
    "active": true,
    "name": [
        {
            "use": "official",
            "family": "Johnson",
            "given": ["Sarah"],
            "prefix": ["Dr."]
        }
    ],
    "gender": "female",
    "birthDate": "1980-05-15",
    "telecom": [
        {
            "system": "phone",
            "value": "555-987-6543",
            "use": "work"
        },
        {
            "system": "email",
            "value": "dr.johnson@example.com"
        }
    ],
    "qualification": [
        {
            "code": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
                        "code": "MD",
                        "display": "Doctor of Medicine"
                    }
                ],
                "text": "Doctor of Medicine"
            }
        }
    ]
}'

PRACTITIONER_RESULT=$(curl -s -X POST "$API_URL/Practitioner" \
    -H "Content-Type: application/json" \
    -d "$PRACTITIONER_DATA")

if echo "$PRACTITIONER_RESULT" | jq -e '.id' > /dev/null; then
    PRACTITIONER_ID=$(echo "$PRACTITIONER_RESULT" | jq -r '.id')
    echo -e "${GREEN}Practitioner created successfully with ID: $PRACTITIONER_ID${NC}"
else
    echo -e "${RED}Failed to create Practitioner. Response:${NC}"
    echo "$PRACTITIONER_RESULT" | jq
    PRACTITIONER_ID="unknown"
fi
echo ""

# Test retrieving a Patient
if [ "$PATIENT_ID" != "unknown" ]; then
    echo -e "${BLUE}Retrieving Patient with ID: $PATIENT_ID${NC}"
    PATIENT_GET_RESULT=$(curl -s "$API_URL/Patient/$PATIENT_ID")
    
    if echo "$PATIENT_GET_RESULT" | jq -e '.id' > /dev/null; then
        echo -e "${GREEN}Patient retrieved successfully:${NC}"
        echo "$PATIENT_GET_RESULT" | jq '.id, .name[0].family, .name[0].given[0], .birthDate, .gender'
    else
        echo -e "${RED}Failed to retrieve Patient. Response:${NC}"
        echo "$PATIENT_GET_RESULT" | jq
    fi
    echo ""
fi

# Test pagination of Patients
echo -e "${BLUE}Testing pagination of Patients...${NC}"
PATIENTS_RESULT=$(curl -s "$API_URL/Patient?_count=10")

if echo "$PATIENTS_RESULT" | jq -e '.entry' > /dev/null; then
    TOTAL=$(echo "$PATIENTS_RESULT" | jq -r '.total')
    echo -e "${GREEN}Pagination working. Total patients: $TOTAL${NC}"
    if [ "$TOTAL" -gt 0 ]; then
        FIRST_PATIENT=$(echo "$PATIENTS_RESULT" | jq -r '.entry[0].resource')
        echo -e "First patient in results: $(echo "$FIRST_PATIENT" | jq -r '.name[0].family // "N/A"'), $(echo "$FIRST_PATIENT" | jq -r '.name[0].given[0] // "N/A"')"
    else
        echo "No patients found in results."
    fi
else
    echo -e "${RED}Pagination failed. Response:${NC}"
    echo "$PATIENTS_RESULT" | jq
fi
echo ""

# Show available resource types from capability statement
echo -e "${BLUE}Getting available resource types from capability statement...${NC}"
CAPABILITY=$(curl -s "$API_URL/metadata")

echo -e "${GREEN}Available resource types:${NC}"
echo "$CAPABILITY" | jq '.rest[0].resource[].type'
echo ""

echo -e "${GREEN}Test script completed successfully!${NC}" 