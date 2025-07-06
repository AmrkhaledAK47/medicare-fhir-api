#!/bin/bash

# Simple test script for the MediCare FHIR API authentication flow

# Configuration
API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="adminpassword"
PATIENT_EMAIL="patient@med.com"
PATIENT_PASSWORD="Patient123!"
PRACTITIONER_EMAIL="doctor@med.com"
PRACTITIONER_PASSWORD="Doctor123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

echo -e "${BLUE}Step 2: Creating Patient resource with access code${NC}"
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
    "birthDate": "1990-01-01"
}'

PATIENT_RESPONSE=$(curl -s -X POST "$API_URL/fhir/Patient/with-access-code?email=$PATIENT_EMAIL" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "$PATIENT_DATA")
echo $PATIENT_RESPONSE | jq .

# Extract patient access code and resource ID
PATIENT_ACCESS_CODE=$(echo $PATIENT_RESPONSE | jq -r '.data.accessCode')
PATIENT_RESOURCE_ID=$(echo $PATIENT_RESPONSE | jq -r '.data.resource.id')

if [ "$PATIENT_ACCESS_CODE" == "null" ] || [ -z "$PATIENT_ACCESS_CODE" ]; then
    echo -e "${RED}Failed to get patient access code. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Patient resource created with ID: $PATIENT_RESOURCE_ID${NC}"
echo -e "${GREEN}Access code for patient: $PATIENT_ACCESS_CODE${NC}\n"

echo -e "${BLUE}Step 3: Verifying patient access code${NC}"
VERIFY_CODE_RESPONSE=$(curl -s -X POST "$API_URL/access-codes/verify" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"code\":\"$PATIENT_ACCESS_CODE\"}")
echo $VERIFY_CODE_RESPONSE | jq .

echo -e "${BLUE}Step 4: Registering patient with access code${NC}"
PATIENT_REGISTER_DATA="{\"name\":\"John Smith\",\"email\":\"$PATIENT_EMAIL\",\"password\":\"$PATIENT_PASSWORD\",\"repeatPassword\":\"$PATIENT_PASSWORD\",\"accessCode\":\"$PATIENT_ACCESS_CODE\"}"
PATIENT_REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d "$PATIENT_REGISTER_DATA")
echo $PATIENT_REGISTER_RESPONSE | jq .

# Extract patient token
PATIENT_TOKEN=$(echo $PATIENT_REGISTER_RESPONSE | jq -r '.data.accessToken')

if [ "$PATIENT_TOKEN" == "null" ] || [ -z "$PATIENT_TOKEN" ]; then
    echo -e "${RED}Failed to register patient. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Patient registration successful. Token: ${PATIENT_TOKEN:0:15}...${NC}\n"

echo -e "${GREEN}Test complete!${NC}" 