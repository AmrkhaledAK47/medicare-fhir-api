#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure doctl is installed and authenticated
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if doctl is authenticated
if ! doctl account get &> /dev/null; then
    echo -e "${RED}Error: doctl is not authenticated. Please run 'doctl auth init' first.${NC}"
    exit 1
fi

echo -e "${GREEN}Deploying Medicare FHIR EHR Platform to DigitalOcean App Platform...${NC}"

# Create the app from the spec file
echo -e "${YELLOW}Creating app from .do/app.yaml specification...${NC}"
doctl apps create --spec .do/app.yaml

# Get the app ID
APP_ID=$(doctl apps list --format ID --no-header | head -1)

if [ -z "$APP_ID" ]; then
    echo -e "${RED}Failed to get app ID. Please check if the app was created successfully.${NC}"
    exit 1
fi

echo -e "${GREEN}App created with ID: $APP_ID${NC}"
echo -e "${GREEN}Deployment in progress. You can check status with:${NC}"
echo -e "doctl apps get $APP_ID"

echo -e "${YELLOW}Waiting for deployment to complete...${NC}"

# Wait for deployment to complete
while true; do
    PHASE=$(doctl apps get $APP_ID --format "DeploymentInProgress" --no-header)
    if [ "$PHASE" = "false" ]; then
        break
    fi
    echo -e "${YELLOW}.${NC}"
    sleep 10
done

echo -e "${GREEN}Deployment completed!${NC}"

# Get app URL
APP_URL=$(doctl apps get $APP_ID --format "DefaultIngress" --no-header)
echo -e "${GREEN}Your app is now available at: ${YELLOW}$APP_URL${NC}"
echo -e "${GREEN}API documentation is available at: ${YELLOW}$APP_URL/api/docs${NC}" 