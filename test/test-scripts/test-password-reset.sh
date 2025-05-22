#!/bin/bash

BASE_URL=http://localhost:3000/api

echo "Testing Password Reset Flow"
echo "=========================="
echo

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ask for the user's email
read -p "Enter the email address to test password reset: " USER_EMAIL

# Step 1: Request password reset
echo -e "${BLUE}Step 1: Requesting password reset code${NC}"
RESET_REQUEST_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${USER_EMAIL}\"
  }")

echo $RESET_REQUEST_RESPONSE | jq .
echo

# Step 2: Check for the reset code in logs
echo -e "${BLUE}Step 2: User receives reset code via email${NC}"
echo -e "${GREEN}Check the server logs for the reset code sent to ${USER_EMAIL}${NC}"
echo

# Get the reset code from the user
read -p "Enter the reset code (from logs): " RESET_CODE

# Step 3: Reset password using the code
echo -e "${BLUE}Step 3: Resetting password with code${NC}"
NEW_PASSWORD="NewPassword123!"
RESET_PASSWORD_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${USER_EMAIL}\",
    \"resetCode\": \"${RESET_CODE}\",
    \"newPassword\": \"${NEW_PASSWORD}\"
  }")

echo $RESET_PASSWORD_RESPONSE | jq .
echo

# Step 4: Test login with new password
echo -e "${BLUE}Step 4: Testing login with new password${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${USER_EMAIL}\",
    \"password\": \"${NEW_PASSWORD}\"
  }")

echo $LOGIN_RESPONSE | jq .
echo

if [[ $(echo $LOGIN_RESPONSE | jq -r '.accessToken') != "null" && $(echo $LOGIN_RESPONSE | jq -r '.accessToken') != "" ]]; then
  echo -e "${GREEN}Password reset flow completed successfully!${NC}"
else
  echo -e "${RED}Password reset flow failed. Please check the error messages above.${NC}"
fi 