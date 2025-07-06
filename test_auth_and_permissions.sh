#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000/api"

# Test results counters
PASSED=0
FAILED=0
TOTAL=0

# Function to run a test
run_test() {
  local test_name=$1
  local command=$2
  local expected_status=$3
  local check_condition=$4
  
  echo -e "\n${YELLOW}Test: ${test_name}${NC}"
  echo -e "${BLUE}Command: ${command}${NC}"
  
  # Run the command and capture output
  RESPONSE=$(eval $command)
  STATUS=$?
  
  # Increment total tests
  TOTAL=$((TOTAL+1))
  
  # Check if command succeeded
  if [ $STATUS -ne 0 ]; then
    echo -e "${RED}FAILED: Command execution error${NC}"
    echo "$RESPONSE"
    FAILED=$((FAILED+1))
    return
  fi
  
  # Check if response matches expected condition
  if eval "$check_condition"; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${RED}FAILED: Response did not meet expected condition${NC}"
    echo "$RESPONSE" | jq 2>/dev/null || echo "$RESPONSE"
    FAILED=$((FAILED+1))
  fi
}

# Function to print section header
print_section() {
  echo -e "\n${PURPLE}======== $1 ========${NC}"
}

# Function to create a test user
create_test_user() {
  local role=$1
  local email=$2
  local password=$3
  local name=$4
  
  # First, create an access code for the role
  echo -e "\n${BLUE}Creating access code for $role...${NC}"
  ACCESS_CODE_RESPONSE=$(curl -s -X POST "$BASE_URL/access-codes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"role\": \"$role\", \"expiresAt\": \"2030-12-31T23:59:59.999Z\"}")
  
  # Extract the access code
  ACCESS_CODE=$(echo $ACCESS_CODE_RESPONSE | jq -r '.data.code')
  
  if [ -z "$ACCESS_CODE" ] || [ "$ACCESS_CODE" = "null" ]; then
    echo -e "${RED}Failed to create access code for $role${NC}"
    echo "$ACCESS_CODE_RESPONSE" | jq
    return 1
  fi
  
  echo -e "${GREEN}Access code created: $ACCESS_CODE${NC}"
  
  # Now register the user with the access code
  echo -e "\n${BLUE}Registering $role user...${NC}"
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"password\": \"$password\", \"firstName\": \"$name\", \"lastName\": \"Test\", \"role\": \"$role\", \"accessCode\": \"$ACCESS_CODE\"}")
  
  # Check if registration was successful
  if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}User $email registered successfully${NC}"
    return 0
  else
    echo -e "${RED}Failed to register user $email${NC}"
    echo "$REGISTER_RESPONSE" | jq
    return 1
  fi
}

# Function to login and get token
login_user() {
  local email=$1
  local password=$2
  
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"password\": \"$password\"}")
  
  # Extract token
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d':' -f2 | tr -d '"')
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to login as $email${NC}"
    echo "$LOGIN_RESPONSE" | jq
    return 1
  fi
  
  echo -e "${GREEN}Successfully logged in as $email${NC}"
  echo $TOKEN
  return 0
}

# Get admin token
ADMIN_TOKEN=$(cat token.txt)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}No admin token found in token.txt. Exiting tests.${NC}"
  exit 1
fi

print_section "TESTING FHIR ENDPOINTS"

# Test accessing Patient endpoint without authentication
run_test "Access Patient endpoint without auth" \
  "curl -s \"$BASE_URL/fhir/Patient\"" \
  0 \
  "echo \$RESPONSE | grep -q 'statusCode.*401'"

# Test accessing Patient endpoint with admin token
run_test "Admin list all patients" \
  "curl -s \"$BASE_URL/fhir/Patient\" -H \"Authorization: Bearer $ADMIN_TOKEN\"" \
  0 \
  "echo \$RESPONSE | grep -q 'resourceType'"

print_section "TESTING AUTH ENDPOINTS"

# Test auth/me endpoint
run_test "Get user profile" \
  "curl -s \"$BASE_URL/auth/me\" -H \"Authorization: Bearer $ADMIN_TOKEN\"" \
  0 \
  "echo \$RESPONSE | grep -q 'success.*true'"

print_section "TESTING ACCESS CODES ENDPOINTS"

# Test creating an access code
run_test "Create access code" \
  "curl -s -X POST \"$BASE_URL/access-codes\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer $ADMIN_TOKEN\" -d '{\"role\": \"practitioner\", \"expiresAt\": \"2030-12-31T23:59:59.999Z\"}'"\
  0 \
  "echo \$RESPONSE | grep -q 'success.*true'"

# Extract the access code from the response
ACCESS_CODE=$(echo $RESPONSE | grep -o '"code":"[^"]*"' | cut -d':' -f2 | tr -d '"')

# Test verifying an access code
run_test "Verify access code" \
  "curl -s -X POST \"$BASE_URL/access-codes/verify\" -H \"Content-Type: application/json\" -d '{\"code\": \"$ACCESS_CODE\"}'"\
  0 \
  "echo \$RESPONSE | grep -q 'success.*true'"

# Test listing all access codes
run_test "List all access codes" \
  "curl -s \"$BASE_URL/access-codes\" -H \"Authorization: Bearer $ADMIN_TOKEN\""\
  0 \
  "echo \$RESPONSE | grep -q 'success.*true'"

# ======== TEST SUMMARY ========
echo -e "\n${PURPLE}======== TEST SUMMARY ========${NC}"
echo -e "Total tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

# Exit with status based on test results
if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi 