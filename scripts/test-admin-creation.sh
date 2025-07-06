#!/bin/bash

# Test script for admin user creation in the MediCare FHIR API
# This script tests both the reset-and-create-admin script and the API endpoint for admin creation

# Configuration
API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@medicare.com"
ADMIN_PASSWORD="AdminPass123!"
NEW_ADMIN_EMAIL="newadmin3@medicare.com"
NEW_ADMIN_PASSWORD="NewAdmin123!"
NEW_ADMIN_NAME="New Admin User 3"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to make HTTP requests
function make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    local auth_header=""
    if [ ! -z "$token" ]; then
        auth_header="-H \"Authorization: Bearer $token\""
    fi
    
    if [ ! -z "$data" ]; then
        echo "curl -s -X $method $API_URL$endpoint -H \"Content-Type: application/json\" $auth_header -d '$data'" | bash
    else
        echo "curl -s -X $method $API_URL$endpoint -H \"Content-Type: application/json\" $auth_header" | bash
    fi
}

echo -e "${BLUE}=== Testing Admin User Creation ===${NC}"

# Step 1: Login with the default admin account (should be created by reset-and-create-admin.js)
echo -e "\n${BLUE}Step 1: Login with default admin account${NC}"
LOGIN_RESPONSE=$(make_request "POST" "/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
echo $LOGIN_RESPONSE | jq .

# Extract admin token
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to get admin token. Make sure you've run the reset-and-create-admin.js script.${NC}"
    exit 1
fi

echo -e "${GREEN}Admin login successful. Token: ${ADMIN_TOKEN:0:15}...${NC}"

# Step 2: Create a new admin user using the API endpoint
echo -e "\n${BLUE}Step 2: Creating a new admin user via API${NC}"
CREATE_ADMIN_RESPONSE=$(make_request "POST" "/users/admin" "{\"email\":\"$NEW_ADMIN_EMAIL\",\"password\":\"$NEW_ADMIN_PASSWORD\",\"name\":\"$NEW_ADMIN_NAME\"}" "$ADMIN_TOKEN")
echo $CREATE_ADMIN_RESPONSE | jq .

# Check if admin creation was successful
if echo "$CREATE_ADMIN_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}New admin user created successfully${NC}"
else
    echo -e "${RED}Failed to create new admin user${NC}"
    exit 1
fi

# Step 3: Login with the new admin account
echo -e "\n${BLUE}Step 3: Login with the new admin account${NC}"
NEW_ADMIN_LOGIN=$(make_request "POST" "/auth/login" "{\"email\":\"$NEW_ADMIN_EMAIL\",\"password\":\"$NEW_ADMIN_PASSWORD\"}")
echo $NEW_ADMIN_LOGIN | jq .

# Extract new admin token
NEW_ADMIN_TOKEN=$(echo $NEW_ADMIN_LOGIN | jq -r '.data.accessToken')

if [ "$NEW_ADMIN_TOKEN" == "null" ] || [ -z "$NEW_ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to login with new admin account${NC}"
    exit 1
fi

echo -e "${GREEN}New admin login successful. Token: ${NEW_ADMIN_TOKEN:0:15}...${NC}"

# Step 4: Test admin permissions by listing all users
echo -e "\n${BLUE}Step 4: Testing admin permissions by listing all users${NC}"
USERS_RESPONSE=$(make_request "GET" "/users" "" "$NEW_ADMIN_TOKEN")
echo $USERS_RESPONSE | jq .

if echo "$USERS_RESPONSE" | grep -q "\"_id\""; then
    echo -e "${GREEN}Admin permissions verified - successfully retrieved user list${NC}"
else
    echo -e "${RED}Failed to verify admin permissions${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== All tests passed! Admin user creation is working correctly ===${NC}" 