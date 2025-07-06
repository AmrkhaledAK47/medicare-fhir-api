#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if token file exists
if [ ! -f "token.txt" ]; then
  echo -e "${RED}Token file not found. Please run 01-authenticate.sh first.${NC}"
  exit 1
fi

ACCESS_TOKEN=$(cat token.txt)
API_URL="http://localhost:3000/api/fhir"
OUTPUT_DIR="test-results/comprehensive"

# Create output directory
mkdir -p $OUTPUT_DIR

echo -e "${BLUE}Comprehensive API Testing - Testing all major FHIR endpoints${NC}"

# Test Patient endpoint with fixed gender parameter
echo -e "${BLUE}Testing Patient endpoint with gender filter (fixed)...${NC}"
curl -s "$API_URL/Patient?gender=male" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-male.json"

curl -s "$API_URL/Patient?gender=female" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-female.json"

# Test pagination with fixed parameters
echo -e "${BLUE}Testing Patient endpoint with pagination (fixed)...${NC}"
curl -s "$API_URL/Patient?_count=1&page=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-page1.json"

curl -s "$API_URL/Patient?_count=1&page=2" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-page2.json"

# Test Observation endpoint
echo -e "${BLUE}Testing Observation endpoint...${NC}"
curl -s "$API_URL/Observation" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/observation.json"

# Test Encounter endpoint
echo -e "${BLUE}Testing Encounter endpoint...${NC}"
curl -s "$API_URL/Encounter" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/encounter.json"

# Test DiagnosticReport endpoint
echo -e "${BLUE}Testing DiagnosticReport endpoint...${NC}"
curl -s "$API_URL/DiagnosticReport" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/diagnostic-report.json"

# Test MedicationRequest endpoint
echo -e "${BLUE}Testing MedicationRequest endpoint...${NC}"
curl -s "$API_URL/MedicationRequest" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/medication-request.json"

# Test Practitioner endpoint
echo -e "${BLUE}Testing Practitioner endpoint...${NC}"
curl -s "$API_URL/Practitioner" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/practitioner.json"

# Test search functionality
echo -e "${BLUE}Testing search functionality across resources...${NC}"
curl -s "$API_URL/Patient?name:contains=John" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-search-name.json"

# Test date range search
echo -e "${BLUE}Testing date range search...${NC}"
curl -s "$API_URL/Patient?birthdate=ge1970-01-01" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-birthdate-range.json"

# Test multiple parameters
echo -e "${BLUE}Testing multiple search parameters...${NC}"
curl -s "$API_URL/Patient?gender=male&_count=2&_sort=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-multiple-params.json"

# Analyze the results
echo -e "${BLUE}Analyzing API test results...${NC}"
REPORT_FILE="$OUTPUT_DIR/comprehensive-report.md"

echo "# Comprehensive FHIR API Test Report" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## Test Date" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "$(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## Results Summary" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check gender filtering
MALE_COUNT=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-male.json" | head -1 | cut -d':' -f2)
FEMALE_COUNT=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-female.json" | head -1 | cut -d':' -f2)

echo "### Gender Filtering Test" >> $REPORT_FILE
if [ "$MALE_COUNT" != "$FEMALE_COUNT" ]; then
  echo "✅ Gender filtering is working correctly" >> $REPORT_FILE
  echo "- Male patients: $MALE_COUNT" >> $REPORT_FILE
  echo "- Female patients: $FEMALE_COUNT" >> $REPORT_FILE
else
  echo "❌ Gender filtering may still have issues" >> $REPORT_FILE
  echo "- Male patients: $MALE_COUNT" >> $REPORT_FILE
  echo "- Female patients: $FEMALE_COUNT" >> $REPORT_FILE
  echo "Both searches returned the same number of results." >> $REPORT_FILE
fi

# Check pagination
PAGE1_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/patient-page1.json" | head -1 | cut -d':' -f2 | tr -d '\"')
PAGE2_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/patient-page2.json" | head -1 | cut -d':' -f2 | tr -d '\"')

echo "" >> $REPORT_FILE
echo "### Pagination Test" >> $REPORT_FILE
if [ "$PAGE1_ID" != "$PAGE2_ID" ]; then
  echo "✅ Pagination is working correctly" >> $REPORT_FILE
  echo "- Page 1 first ID: $PAGE1_ID" >> $REPORT_FILE
  echo "- Page 2 first ID: $PAGE2_ID" >> $REPORT_FILE
else
  echo "❌ Pagination may still have issues" >> $REPORT_FILE
  echo "- Page 1 first ID: $PAGE1_ID" >> $REPORT_FILE
  echo "- Page 2 first ID: $PAGE2_ID" >> $REPORT_FILE
  echo "Both pages returned the same first ID." >> $REPORT_FILE
fi

# Check other endpoints
echo "" >> $REPORT_FILE
echo "### Other FHIR Resources" >> $REPORT_FILE

for resource in observation encounter diagnostic-report medication-request practitioner; do
  result=$(grep -o '"resourceType":"[^"]*"' "$OUTPUT_DIR/$resource.json" | head -1 | cut -d':' -f2 | tr -d '\"')
  if [ ! -z "$result" ]; then
    echo "✅ $resource endpoint is functional" >> $REPORT_FILE
  else
    echo "❌ $resource endpoint returned no or invalid data" >> $REPORT_FILE
  fi
done

# Check search functionality
SEARCH_RESULTS=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-search-name.json" | head -1 | cut -d':' -f2)
echo "" >> $REPORT_FILE
echo "### Search Functionality" >> $REPORT_FILE
if [ ! -z "$SEARCH_RESULTS" ]; then
  echo "✅ Name search is functional (found $SEARCH_RESULTS results)" >> $REPORT_FILE
else
  echo "❌ Name search returned no or invalid data" >> $REPORT_FILE
fi

# Check date range search
DATE_RESULTS=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-birthdate-range.json" | head -1 | cut -d':' -f2)
echo "" >> $REPORT_FILE
echo "### Date Range Search" >> $REPORT_FILE
if [ ! -z "$DATE_RESULTS" ]; then
  echo "✅ Date range search is functional (found $DATE_RESULTS results)" >> $REPORT_FILE
else
  echo "❌ Date range search returned no or invalid data" >> $REPORT_FILE
fi

# Check multiple parameters
MULTI_RESULTS=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-multiple-params.json" | head -1 | cut -d':' -f2)
echo "" >> $REPORT_FILE
echo "### Multiple Parameters" >> $REPORT_FILE
if [ ! -z "$MULTI_RESULTS" ]; then
  echo "✅ Multiple parameters search is functional (found $MULTI_RESULTS results)" >> $REPORT_FILE
else
  echo "❌ Multiple parameters search returned no or invalid data" >> $REPORT_FILE
fi

echo -e "${GREEN}Test complete! Results saved to $REPORT_FILE${NC}"
