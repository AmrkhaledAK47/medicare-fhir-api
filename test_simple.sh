#!/bin/bash

# Simple test script for the MediCare FHIR API permissions
API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="Admin123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Admin Login${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
echo $ADMIN_LOGIN_RESPONSE | jq .

# Extract admin token
ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to get admin token. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Admin login successful. Token: ${ADMIN_TOKEN:0:15}...${NC}\n"

echo -e "${BLUE}Step 2: Create a test patient${NC}"
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
    "gender": "male",
    "birthDate": "1990-01-01"
}'

PATIENT_RESPONSE=$(curl -s -X POST "$API_URL/fhir/Patient" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "$PATIENT_DATA")
echo $PATIENT_RESPONSE | jq .

# Extract patient ID
PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.id')

if [ "$PATIENT_ID" == "null" ] || [ -z "$PATIENT_ID" ]; then
    echo -e "${RED}Failed to create patient. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Patient created with ID: $PATIENT_ID${NC}\n"

echo -e "${BLUE}Step 3: Create a test practitioner${NC}"
PRACTITIONER_DATA='{
    "resourceType": "Practitioner",
    "active": true,
    "name": [
        {
            "use": "official",
            "family": "Test",
            "given": ["Doctor"]
        }
    ]
}'

PRACTITIONER_RESPONSE=$(curl -s -X POST "$API_URL/fhir/Practitioner" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "$PRACTITIONER_DATA")
echo $PRACTITIONER_RESPONSE | jq .

# Extract practitioner ID
PRACTITIONER_ID=$(echo $PRACTITIONER_RESPONSE | jq -r '.id')

if [ "$PRACTITIONER_ID" == "null" ] || [ -z "$PRACTITIONER_ID" ]; then
    echo -e "${RED}Failed to create practitioner. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Practitioner created with ID: $PRACTITIONER_ID${NC}\n"

echo -e "${BLUE}Step 4: Associate patient with practitioner${NC}"
PATIENT_UPDATE_DATA="{
    \"resourceType\": \"Patient\",
    \"id\": \"$PATIENT_ID\",
    \"generalPractitioner\": [
        {
            \"reference\": \"Practitioner/$PRACTITIONER_ID\"
        }
    ]
}"

PATIENT_UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/fhir/Patient/$PATIENT_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "$PATIENT_UPDATE_DATA")
echo $PATIENT_UPDATE_RESPONSE | jq .

echo -e "${GREEN}Patient updated with practitioner reference${NC}\n"

echo -e "${GREEN}Test complete!${NC}" 