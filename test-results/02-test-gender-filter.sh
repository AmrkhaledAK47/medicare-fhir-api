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
OUTPUT_DIR="test-results/gender-filter"

# Create output directory
mkdir -p $OUTPUT_DIR

echo -e "${BLUE}Testing gender filtering in Patient resource...${NC}"

# 1. Get all patients (baseline)
echo -e "${BLUE}Getting all patients...${NC}"
curl -s "$API_URL/Patient" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/all-patients.json"

# 2. Get male patients
echo -e "${BLUE}Getting male patients...${NC}"
curl -s "$API_URL/Patient?gender=male" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/male-patients.json"

# 3. Get female patients
echo -e "${BLUE}Getting female patients...${NC}"
curl -s "$API_URL/Patient?gender=female" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/female-patients.json"

# 4. Compare counts
ALL_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/all-patients.json" | head -1 | cut -d':' -f2)
MALE_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/male-patients.json" | head -1 | cut -d':' -f2)
FEMALE_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/female-patients.json" | head -1 | cut -d':' -f2)

echo -e "${YELLOW}Results:${NC}"
echo "Total patients: $ALL_TOTAL"
echo "Male patients: $MALE_TOTAL"
echo "Female patients: $FEMALE_TOTAL"

# 5. Analyze results
if [ "$MALE_TOTAL" = "$FEMALE_TOTAL" ] && [ "$MALE_TOTAL" = "$ALL_TOTAL" ]; then
  echo -e "${RED}ISSUE CONFIRMED: Gender filtering is not working! All queries return the same count.${NC}"
elif [ "$MALE_TOTAL" = "$FEMALE_TOTAL" ]; then
  echo -e "${RED}ISSUE CONFIRMED: Male and female filters return the same count.${NC}"
elif [ "$MALE_TOTAL" -gt 0 ] && [ "$FEMALE_TOTAL" -gt 0 ] && [ "$ALL_TOTAL" -gt "$MALE_TOTAL" ] && [ "$ALL_TOTAL" -gt "$FEMALE_TOTAL" ]; then
  echo -e "${GREEN}Gender filtering appears to be working correctly.${NC}"
  
  # Extract a patient ID from male and female results for deeper comparison
  MALE_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/male-patients.json" | head -1 | cut -d':' -f2 | tr -d '\"')
  FEMALE_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/female-patients.json" | head -1 | cut -d':' -f2 | tr -d '\"')
  
  echo "Sample male patient ID: $MALE_ID"
  echo "Sample female patient ID: $FEMALE_ID"
  
  # Check if IDs are different
  if [ "$MALE_ID" = "$FEMALE_ID" ]; then
    echo -e "${RED}ISSUE FOUND: Same patient IDs found in both male and female results!${NC}"
  fi
else
  echo -e "${YELLOW}Inconclusive results. Further investigation needed.${NC}"
fi

echo -e "${BLUE}Test results saved to $OUTPUT_DIR${NC}"
