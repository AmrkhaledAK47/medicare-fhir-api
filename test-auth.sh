#!/bin/bash

BASE_URL=http://localhost:3000/api

echo "Testing Authentication API"
echo "=========================="
echo

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Register an admin user or login if already exists
echo -e "${BLUE}Step 1: Registering an admin user${NC}"
ADMIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@medicare.com",
    "password": "Admin123!",
    "repeatPassword": "Admin123!"
  }')

# Check if registration failed due to user already existing
if [[ $(echo $ADMIN_RESPONSE | jq -r '.statusCode') == 409 ]]; then
  echo -e "${GREEN}Admin user already exists. Logging in instead.${NC}"
  ADMIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@medicare.com",
      "password": "Admin123!"
    }')
fi

echo $ADMIN_RESPONSE | jq .
echo

# Extract admin access token
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.accessToken')

# Step 2: Admin creates a patient profile
echo -e "${BLUE}Step 2: Admin creating a patient profile${NC}"
PATIENT_PROFILE_RESPONSE=$(curl -s -X POST ${BASE_URL}/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "name": "John Patient",
    "email": "b41906626@gmail.com",
    "role": "patient"
  }')

echo $PATIENT_PROFILE_RESPONSE | jq .
echo

# Step 3: Check for the access code in logs
echo -e "${BLUE}Step 3: Patient receives access code via email${NC}"
echo -e "${GREEN}Check the server logs for the access code sent to patient@example.com${NC}"
echo

# In a real app, the patient would receive the access code via email
# For this test, we'll just use a placeholder
read -p "Enter the access code sent to the patient (from logs): " ACCESS_CODE

# Step 4: Patient verifies the access code
echo -e "${BLUE}Step 4: Patient verifies the access code${NC}"
VERIFY_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/verify-access-code \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"patient@example.com\",
    \"accessCode\": \"${ACCESS_CODE}\"
  }")

echo $VERIFY_RESPONSE | jq .
echo

# Step 5: Patient completes registration
echo -e "${BLUE}Step 5: Patient completes registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Patient\",
    \"email\": \"b41906626@gmail.com\",
    \"password\": \"Patient123!\",
    \"repeatPassword\": \"Patient123!\",
    \"accessCode\": \"${ACCESS_CODE}\",
    \"phone\": \"+1234567890\"
  }")

echo $REGISTER_RESPONSE | jq .
echo

# Extract patient access token
PATIENT_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

# Step 6: Patient logs in
echo -e "${BLUE}Step 6: Patient logs in${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "b41906626@gmail.com",
    "password": "Patient123!"
  }')

echo $LOGIN_RESPONSE | jq .
echo

echo -e "${GREEN}Authentication testing completed successfully!${NC}" 