#!/bin/bash

# Setup script for MediCare API testing environment
# This script helps set up the necessary environment for testing the patient registration flow

# Text styling
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BOLD}MediCare API Testing Environment Setup${NC}"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js before continuing."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo "Please install npm before continuing."
    exit 1
fi

# Check if Postman is installed
echo -e "${YELLOW}Note: This script assumes you have Postman installed.${NC}"
echo "If not, please download and install it from https://www.postman.com/downloads/"
echo ""

# Check if the API server is running
echo -e "${BOLD}Checking if the API server is running...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}API server is running.${NC}"
else
    echo -e "${YELLOW}Warning: API server doesn't seem to be running at http://localhost:3000/api${NC}"
    echo "Would you like to start the API server now? (y/n)"
    read -r start_server
    if [[ $start_server == "y" || $start_server == "Y" ]]; then
        echo "Starting API server..."
        cd "$(dirname "$0")/.." || exit
        npm run start:dev &
        server_pid=$!
        echo "Server started with PID: $server_pid"
        echo "Waiting for server to initialize..."
        sleep 5
    else
        echo -e "${YELLOW}Please start the API server manually before testing.${NC}"
    fi
fi

# Create admin user if it doesn't exist
echo -e "${BOLD}Setting up admin user...${NC}"
echo "This will create an admin user if it doesn't already exist."
echo "Default credentials: admin@example.com / Admin123!"

curl -s -X POST http://localhost:3000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!","name":"System Admin"}' > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Admin user is ready.${NC}"
else
    echo -e "${RED}Failed to set up admin user.${NC}"
    echo "Please check if the API server is running and supports the setup-admin endpoint."
fi

# Instructions for Postman
echo ""
echo -e "${BOLD}Postman Setup Instructions:${NC}"
echo "1. Import the collection: docs/MediCare_Patient_Flow.postman_collection.json"
echo "2. Import the environment: docs/MediCare_Environment.postman_environment.json"
echo "3. Select the 'MediCare API Environment' from the environment dropdown"
echo "4. Run the requests in sequence, starting with 'Admin Login'"
echo ""
echo -e "${YELLOW}Note: After running the 'Create Patient Resource' request, you'll need to manually set the 'accessCode' variable in Postman.${NC}"
echo "You can find the access code in the server logs or in the database."
echo ""

# Final instructions
echo -e "${BOLD}Setup Complete!${NC}"
echo "You can now test the patient registration flow using Postman."
echo "Follow the documentation in docs/PatientRegistrationFlow.md for more details."
echo ""

exit 0 