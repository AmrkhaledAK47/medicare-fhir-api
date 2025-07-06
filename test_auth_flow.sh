#!/bin/bash

# Test script for the MediCare FHIR API authentication flow
# This script tests the complete flow from admin login to patient/practitioner registration and resource access

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
NC='\033[0m' # No Color

# Step 1: Admin Login
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

# Step 2: Create Patient resource with access code
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

# Step 3: Create Practitioner resource with access code
echo -e "${BLUE}Step 3: Creating Practitioner resource with access code${NC}"
PRACTITIONER_DATA='{
    "resourceType": "Practitioner",
    "active": true,
    "name": [
        {
            "use": "official",
            "family": "Johnson",
            "given": ["Sarah"]
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

PRACTITIONER_RESPONSE=$(curl -s -X POST "$API_URL/fhir/Practitioner/with-access-code?email=$PRACTITIONER_EMAIL" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "$PRACTITIONER_DATA")
echo $PRACTITIONER_RESPONSE | jq .

# Extract practitioner access code and resource ID
PRACTITIONER_ACCESS_CODE=$(echo $PRACTITIONER_RESPONSE | jq -r '.data.accessCode')
PRACTITIONER_RESOURCE_ID=$(echo $PRACTITIONER_RESPONSE | jq -r '.data.resource.id')

if [ "$PRACTITIONER_ACCESS_CODE" == "null" ] || [ -z "$PRACTITIONER_ACCESS_CODE" ]; then
    echo -e "${RED}Failed to get practitioner access code. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Practitioner resource created with ID: $PRACTITIONER_RESOURCE_ID${NC}"
echo -e "${GREEN}Access code for practitioner: $PRACTITIONER_ACCESS_CODE${NC}\n"

# Step 4: Register patient with access code
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

# Step 5: Register practitioner with access code
echo -e "${BLUE}Step 5: Registering practitioner with access code${NC}"
PRACTITIONER_REGISTER_DATA="{\"name\":\"Sarah Johnson\",\"email\":\"$PRACTITIONER_EMAIL\",\"password\":\"$PRACTITIONER_PASSWORD\",\"repeatPassword\":\"$PRACTITIONER_PASSWORD\",\"accessCode\":\"$PRACTITIONER_ACCESS_CODE\"}"
PRACTITIONER_REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d "$PRACTITIONER_REGISTER_DATA")
echo $PRACTITIONER_REGISTER_RESPONSE | jq .

# Extract practitioner token
PRACTITIONER_TOKEN=$(echo $PRACTITIONER_REGISTER_RESPONSE | jq -r '.data.accessToken')

if [ "$PRACTITIONER_TOKEN" == "null" ] || [ -z "$PRACTITIONER_TOKEN" ]; then
    echo -e "${RED}Failed to register practitioner. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Practitioner registration successful. Token: ${PRACTITIONER_TOKEN:0:15}...${NC}\n"

# Step 6: Patient accesses their own profile
echo -e "${BLUE}Step 6: Patient accessing their own profile${NC}"
PATIENT_PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" -H "Content-Type: application/json" -H "Authorization: Bearer $PATIENT_TOKEN")
echo $PATIENT_PROFILE_RESPONSE | jq .

echo -e "${GREEN}Patient profile access successful${NC}\n"

# Step 7: Patient accesses their FHIR resource
echo -e "${BLUE}Step 7: Patient accessing their FHIR resource${NC}"
PATIENT_FHIR_RESPONSE=$(curl -s -X GET "$API_URL/fhir/Patient/$PATIENT_RESOURCE_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $PATIENT_TOKEN")
echo $PATIENT_FHIR_RESPONSE | jq .

echo -e "${GREEN}Patient FHIR resource access successful${NC}\n"

# Step 8: Practitioner accesses their own profile
echo -e "${BLUE}Step 8: Practitioner accessing their own profile${NC}"
PRACTITIONER_PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" -H "Content-Type: application/json" -H "Authorization: Bearer $PRACTITIONER_TOKEN")
echo $PRACTITIONER_PROFILE_RESPONSE | jq .

echo -e "${GREEN}Practitioner profile access successful${NC}\n"

# Step 9: Practitioner accesses their FHIR resource
echo -e "${BLUE}Step 9: Practitioner accessing their FHIR resource${NC}"
PRACTITIONER_FHIR_RESPONSE=$(curl -s -X GET "$API_URL/fhir/Practitioner/$PRACTITIONER_RESOURCE_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $PRACTITIONER_TOKEN")
echo $PRACTITIONER_FHIR_RESPONSE | jq .

echo -e "${GREEN}Practitioner FHIR resource access successful${NC}\n"

# Step 10: Practitioner attempts to access patient data (should be allowed)
echo -e "${BLUE}Step 10: Practitioner accessing patient data${NC}"
PRACTITIONER_ACCESS_PATIENT_RESPONSE=$(curl -s -X GET "$API_URL/fhir/Patient/$PATIENT_RESOURCE_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $PRACTITIONER_TOKEN")
echo $PRACTITIONER_ACCESS_PATIENT_RESPONSE | jq .

echo -e "${GREEN}Practitioner accessing patient data successful${NC}\n"

# Step 11: Patient attempts to access practitioner data (should be denied)
echo -e "${BLUE}Step 11: Patient attempting to access practitioner data (should be denied)${NC}"
PATIENT_ACCESS_PRACTITIONER_RESPONSE=$(curl -s -X GET "$API_URL/fhir/Practitioner/$PRACTITIONER_RESOURCE_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $PATIENT_TOKEN")
echo $PATIENT_ACCESS_PRACTITIONER_RESPONSE | jq .

echo -e "${GREEN}Test complete!${NC}" 