#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== MediCare Dashboard API Test Flow =====${NC}"

# Base URL for the API
API_URL=${API_URL:-"http://localhost:3000/api"}

# Step 1: Login as patient
echo -e "\n${YELLOW}Step 1: Login as patient${NC}"
echo -e "${BLUE}POST ${API_URL}/auth/login${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Patient123!"
  }')

# Check if login was successful
if [[ $LOGIN_RESPONSE == *"accessToken"* ]]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  # Extract the token
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
  echo -e "Token: ${ACCESS_TOKEN:0:20}...${ACCESS_TOKEN:(-20)}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo $LOGIN_RESPONSE | jq
  exit 1
fi

# Step 2: Get dashboard data
echo -e "\n${YELLOW}Step 2: Get dashboard data${NC}"
echo -e "${BLUE}GET ${API_URL}/dashboard${NC}"

DASHBOARD_RESPONSE=$(curl -s -X GET "${API_URL}/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

# Check if dashboard request was successful
if [[ $DASHBOARD_RESPONSE == *"success"* && $DASHBOARD_RESPONSE == *"profile"* ]]; then
  echo -e "${GREEN}✓ Dashboard data retrieved successfully${NC}"
  
  # Extract and display key information
  PROFILE_NAME=$(echo $DASHBOARD_RESPONSE | jq -r '.data.profile.name')
  BIOMARKER_COUNT=$(echo $DASHBOARD_RESPONSE | jq -r '.data.biomarkers | length')
  APPOINTMENT_COUNT=$(echo $DASHBOARD_RESPONSE | jq -r '.data.appointments | length')
  CALENDAR_COUNT=$(echo $DASHBOARD_RESPONSE | jq -r '.data.calendar | length')
  QUICKACTIONS_COUNT=$(echo $DASHBOARD_RESPONSE | jq -r '.data.quickActions | length')
  
  echo -e "Profile Name: ${PROFILE_NAME}"
  echo -e "Biomarker Count: ${BIOMARKER_COUNT}"
  echo -e "Appointment Count: ${APPOINTMENT_COUNT}"
  echo -e "Calendar Event Count: ${CALENDAR_COUNT}"
  echo -e "Quick Actions Count: ${QUICKACTIONS_COUNT}"
  
  # Check for any errors
  if [[ $DASHBOARD_RESPONSE == *"errors"* ]]; then
    ERRORS=$(echo $DASHBOARD_RESPONSE | jq -r '.data.errors | join(", ")')
    echo -e "${YELLOW}⚠ Partial data loaded with errors: ${ERRORS}${NC}"
  fi
else
  echo -e "${RED}✗ Failed to retrieve dashboard data${NC}"
  echo $DASHBOARD_RESPONSE | jq
  exit 1
fi

# Step 3: Test with admin user (should fail)
echo -e "\n${YELLOW}Step 3: Testing role-based access control${NC}"
echo -e "${BLUE}Login as admin and try to access dashboard${NC}"

ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123"
  }')

if [[ $ADMIN_LOGIN_RESPONSE == *"accessToken"* ]]; then
  ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.data.accessToken')
  
  ADMIN_DASHBOARD_RESPONSE=$(curl -s -X GET "${API_URL}/dashboard" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")
  
  if [[ $ADMIN_DASHBOARD_RESPONSE == *"Access denied: requires patient role"* ]]; then
    echo -e "${GREEN}✓ Role-based access control working correctly${NC}"
    echo -e "Admin user was correctly denied access to the patient dashboard"
  else
    echo -e "${RED}✗ Role-based access control failed${NC}"
    echo $ADMIN_DASHBOARD_RESPONSE | jq
  fi
else
  echo -e "${YELLOW}⚠ Could not test admin access (login failed)${NC}"
  echo $ADMIN_LOGIN_RESPONSE | jq
fi

echo -e "\n${GREEN}===== Dashboard API Test Completed =====${NC}"
echo -e "${YELLOW}For more details, refer to the DASHBOARD_INTEGRATION.md documentation.${NC}" 