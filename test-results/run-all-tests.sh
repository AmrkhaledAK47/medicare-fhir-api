#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MediCare FHIR API Comprehensive Test Suite ===${NC}"
echo -e "${BLUE}This script will execute a complete test of the FHIR API endpoints${NC}"

# Create test results directory if not exists
mkdir -p test-results

# Step 1: Restart the server to apply any fixes
echo -e "${YELLOW}Step 1/6: Restarting server to apply fixes...${NC}"
chmod +x restart-server.sh
./restart-server.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Server restart failed. Exiting tests.${NC}"
  exit 1
fi

# Step 2: Authenticate
echo -e "${YELLOW}Step 2/6: Authenticating with the API...${NC}"
chmod +x 01-authenticate.sh
./01-authenticate.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Authentication failed. Exiting tests.${NC}"
  exit 1
fi

# Step 3: Test gender filtering
echo -e "${YELLOW}Step 3/6: Testing gender filtering...${NC}"
chmod +x 02-test-gender-filter.sh
./02-test-gender-filter.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Gender filtering tests failed but continuing...${NC}"
fi

# Step 4: Test pagination
echo -e "${YELLOW}Step 4/6: Testing pagination...${NC}"
chmod +x 03-test-pagination.sh
./03-test-pagination.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Pagination tests failed but continuing...${NC}"
fi

# Step 5: Test all other API endpoints
echo -e "${YELLOW}Step 5/6: Testing all FHIR endpoints...${NC}"
chmod +x test-comprehensive-api.sh
./test-comprehensive-api.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Comprehensive API tests failed but continuing...${NC}"
fi

# Step 6: Analyze results and generate final report
echo -e "${YELLOW}Step 6/6: Analyzing test results...${NC}"
chmod +x 04-analyze-results.sh
./04-analyze-results.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Analysis script failed but continuing...${NC}"
fi

echo -e "${GREEN}All tests completed!${NC}"
echo -e "${BLUE}Review the test results in the test-results directory.${NC}"
echo -e "${BLUE}A comprehensive summary is available in final-report.md${NC}"
