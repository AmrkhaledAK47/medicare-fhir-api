#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MediCare FHIR API Complete Setup and Testing ===${NC}"
echo

# Make sure we're in the project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Step 1: Set up and verify infrastructure
echo -e "${YELLOW}Step 1: Setting up and verifying infrastructure${NC}"
./scripts/setup-and-verify.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Infrastructure setup failed. Please check the logs and try again.${NC}"
    exit 1
fi
echo

# Step 2: Generate authentication tokens
echo -e "${YELLOW}Step 2: Generating authentication tokens${NC}"
# Wait for API to be fully ready
echo "Waiting for the API to be fully ready..."
sleep 10
node ./scripts/generate-auth-token.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Authentication token generation failed.${NC}"
    exit 1
fi
echo

# Step 3: Test API endpoints
echo -e "${YELLOW}Step 3: Testing API endpoints${NC}"
node ./scripts/test-api-endpoints.js
TEST_RESULT=$?
echo

# Display overall results
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}=== Setup and Testing Completed Successfully! ===${NC}"
    echo -e "${GREEN}Your MediCare FHIR API with PostgreSQL is now ready for use.${NC}"
else
    echo -e "${YELLOW}=== Setup Complete, But Some Tests Failed ===${NC}"
    echo -e "${YELLOW}Review the test output above for details on the failing tests.${NC}"
    echo -e "${YELLOW}The infrastructure is running, but you may need to address API issues.${NC}"
fi

echo
echo -e "Services available at:"
echo -e "  - HAPI FHIR Server: ${BLUE}http://localhost:9090/fhir${NC}"
echo -e "  - NestJS API: ${BLUE}http://localhost:3000/api${NC}"
echo -e "  - API Documentation: ${BLUE}http://localhost:3000/api-docs${NC}"
echo
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  ${BLUE}docker-compose logs -f${NC}"
echo
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  ${BLUE}docker-compose down${NC}" 