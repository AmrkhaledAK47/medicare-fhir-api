#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Seeding Mock Data for Dashboard Testing =====${NC}"

# Get FHIR server URL from environment or use default
FHIR_SERVER_URL=${FHIR_SERVER_URL:-"http://localhost:9090/fhir"}

# Step 1: Seed biomarker observations
echo -e "\n${YELLOW}Step 1: Seeding biomarker observations${NC}"
BIOMARKERS_RESPONSE=$(curl -s -X POST "$FHIR_SERVER_URL" \
  -H "Content-Type: application/fhir+json" \
  -d @seed-biomarkers.json)

# Check if biomarkers were created successfully
if [[ $BIOMARKERS_RESPONSE == *"Bundle"* && $BIOMARKERS_RESPONSE == *"transaction-response"* ]]; then
  echo -e "${GREEN}✓ Biomarkers seeded successfully${NC}"
else
  echo -e "${RED}✗ Failed to seed biomarkers${NC}"
  echo $BIOMARKERS_RESPONSE | json_pp
  exit 1
fi

# Step 2: Seed appointments
echo -e "\n${YELLOW}Step 2: Seeding appointments${NC}"
APPOINTMENTS_RESPONSE=$(curl -s -X POST "$FHIR_SERVER_URL" \
  -H "Content-Type: application/fhir+json" \
  -d @seed-appointments.json)

# Check if appointments were created successfully
if [[ $APPOINTMENTS_RESPONSE == *"Bundle"* && $APPOINTMENTS_RESPONSE == *"transaction-response"* ]]; then
  echo -e "${GREEN}✓ Appointments seeded successfully${NC}"
else
  echo -e "${RED}✗ Failed to seed appointments${NC}"
  echo $APPOINTMENTS_RESPONSE | json_pp
  exit 1
fi

# Step 3: Seed calendar events (CarePlans and ServiceRequests)
echo -e "\n${YELLOW}Step 3: Seeding calendar events${NC}"
CALENDAR_RESPONSE=$(curl -s -X POST "$FHIR_SERVER_URL" \
  -H "Content-Type: application/fhir+json" \
  -d @seed-calendar-events.json)

# Check if calendar events were created successfully
if [[ $CALENDAR_RESPONSE == *"Bundle"* && $CALENDAR_RESPONSE == *"transaction-response"* ]]; then
  echo -e "${GREEN}✓ Calendar events seeded successfully${NC}"
else
  echo -e "${RED}✗ Failed to seed calendar events${NC}"
  echo $CALENDAR_RESPONSE | json_pp
  exit 1
fi

echo -e "\n${GREEN}===== Data seeding completed successfully! =====${NC}"
echo -e "${YELLOW}Now run the test-dashboard-flow.sh script to test the dashboard with the seeded data.${NC}" 