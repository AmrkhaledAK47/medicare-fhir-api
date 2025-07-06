#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Analyzing test results...${NC}"

# Check if result directories exist
if [ ! -d "test-results/gender-filter" ] || [ ! -d "test-results/pagination" ]; then
  echo -e "${RED}Test result directories not found. Please run the tests first.${NC}"
  exit 1
fi

ISSUES_FOUND=0
REPORT_FILE="test-results/analysis-report.md"

# Start the report
echo "# MediCare FHIR API Testing Analysis" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## Test Date" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "$(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## Issues Summary" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Analyze gender filter tests
echo -e "${YELLOW}Analyzing gender filter tests...${NC}"

ALL_TOTAL=$(grep -o '"total":[0-9]*' "test-results/gender-filter/all-patients.json" | head -1 | cut -d':' -f2)
MALE_TOTAL=$(grep -o '"total":[0-9]*' "test-results/gender-filter/male-patients.json" | head -1 | cut -d':' -f2)
FEMALE_TOTAL=$(grep -o '"total":[0-9]*' "test-results/gender-filter/female-patients.json" | head -1 | cut -d':' -f2)

MALE_ID=$(grep -o '"id":"[^"]*"' "test-results/gender-filter/male-patients.json" | head -1 | cut -d':' -f2 | tr -d '\"')
FEMALE_ID=$(grep -o '"id":"[^"]*"' "test-results/gender-filter/female-patients.json" | head -1 | cut -d':' -f2 | tr -d '\"')

# Check for gender filtering issues
if [ "$MALE_TOTAL" = "$FEMALE_TOTAL" ] && [ "$MALE_TOTAL" = "$ALL_TOTAL" ]; then
  echo "### 1. Gender Filtering Issue" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "**ISSUE CONFIRMED**: All gender queries (male, female, and no filter) return the same count ($ALL_TOTAL)." >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ "$MALE_TOTAL" = "$FEMALE_TOTAL" ]; then
  echo "### 1. Gender Filtering Issue" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "**ISSUE CONFIRMED**: Male and female filters return the same count ($MALE_TOTAL)." >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ "$MALE_ID" = "$FEMALE_ID" ] && [ ! -z "$MALE_ID" ] && [ ! -z "$FEMALE_ID" ]; then
  echo "### 1. Gender Filtering Issue" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "**ISSUE CONFIRMED**: Male and female filters return different counts but the same patient IDs." >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "### 1. Gender Filtering" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "✅ Gender filtering appears to be working correctly." >> $REPORT_FILE
  echo "- Total patients: $ALL_TOTAL" >> $REPORT_FILE
  echo "- Male patients: $MALE_TOTAL" >> $REPORT_FILE
  echo "- Female patients: $FEMALE_TOTAL" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
fi

# Analyze pagination tests
echo -e "${YELLOW}Analyzing pagination tests...${NC}"

TOTAL_PATIENTS=$(grep -o '"total":[0-9]*' "test-results/pagination/patient-count.json" | head -1 | cut -d':' -f2)
COUNT_1_ENTRIES=$(grep -o '"entry"\s*:\s*\[' "test-results/pagination/count-1.json" | wc -l)
COUNT_2_ENTRIES=$(grep -o '"entry"\s*:\s*\[' "test-results/pagination/count-2.json" | wc -l)
PAGE_1_ID=$(grep -o '"id":"[^"]*"' "test-results/pagination/page-1-count-1.json" | head -1 | cut -d':' -f2 | tr -d '\"')
PAGE_2_ID=$(grep -o '"id":"[^"]*"' "test-results/pagination/page-2-count-1.json" | head -1 | cut -d':' -f2 | tr -d '\"')

PAGINATION_ISSUES=0
PAGINATION_NOTES=""

# Check if _count parameter is respected
if [ "$COUNT_1_ENTRIES" -gt 1 ]; then
  PAGINATION_NOTES="$PAGINATION_NOTES- _count=1 returned more than 1 entry.\n"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

if [ "$COUNT_2_ENTRIES" -gt 2 ]; then
  PAGINATION_NOTES="$PAGINATION_NOTES- _count=2 returned more than 2 entries.\n"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# Check if pages return different results
if [ "$PAGE_1_ID" = "$PAGE_2_ID" ] && [ "$TOTAL_PATIENTS" -gt 1 ]; then
  PAGINATION_NOTES="$PAGINATION_NOTES- Page 1 and page 2 return the same first patient ID.\n"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# Add pagination analysis to report
if [ "$PAGINATION_ISSUES" -gt 0 ]; then
  echo "### 2. Pagination Issue" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "**ISSUE CONFIRMED**: Pagination is not working correctly." >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo -e "$PAGINATION_NOTES" | sed 's/\\n/\n/g' >> $REPORT_FILE
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "### 2. Pagination" >> $REPORT_FILE
  echo "" >> $REPORT_FILE
  echo "✅ Pagination appears to be working correctly." >> $REPORT_FILE
  echo "- _count=1 returns the correct number of entries." >> $REPORT_FILE
  echo "- _count=2 returns the correct number of entries." >> $REPORT_FILE
  echo "- Different pages return different patient IDs." >> $REPORT_FILE
  echo "" >> $REPORT_FILE
fi

# Add recommendations for fixing issues
echo "## Recommendations" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ "$ISSUES_FOUND" -gt 0 ]; then
  if [ "$MALE_TOTAL" = "$FEMALE_TOTAL" ] || [ "$MALE_ID" = "$FEMALE_ID" ]; then
    echo "### Gender Filtering Fix" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "1. In the PatientController's `transformQueryParams` method:" >> $REPORT_FILE
    echo "   - Ensure the 'gender' parameter is properly passed to the HAPI FHIR server" >> $REPORT_FILE
    echo "   - Add logging to see the exact value being sent to the server" >> $REPORT_FILE
    echo "   - Verify that the correct parameter name 'gender' is being used (not 'Gender' or any other variation)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "2. In the HAPI FHIR adapter's `search` method:" >> $REPORT_FILE
    echo "   - Verify that query parameters are not being dropped or modified" >> $REPORT_FILE
    echo "   - Add logging to show the exact URL and query string being sent to the FHIR server" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "3. Check the docker logs of the HAPI FHIR server to see the incoming requests:" >> $REPORT_FILE
    echo "   ```bash" >> $REPORT_FILE
    echo "   docker logs hapi-fhir -f" >> $REPORT_FILE
    echo "   ```" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
  fi
  
  if [ "$PAGINATION_ISSUES" -gt 0 ]; then
    echo "### Pagination Fix" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "1. In the BaseResourceController's `transformQueryParams` method:" >> $REPORT_FILE
    echo "   - Ensure the '_count', 'page', and '_getpagesoffset' parameters are correctly converted" >> $REPORT_FILE
    echo "   - Verify that all parameters are correctly passed to the HAPI FHIR adapter" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "2. In the HAPI FHIR adapter's `search` method:" >> $REPORT_FILE 
    echo "   - Add logging to show the exact query parameters being sent to the FHIR server" >> $REPORT_FILE
    echo "   - Verify that pagination parameters are not being overridden" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "3. Check the HAPI FHIR server configuration:" >> $REPORT_FILE
    echo "   - Make sure the server respects the provided pagination parameters" >> $REPORT_FILE
    echo "   - Check if there are any default pagination settings that might be overriding the requested values" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
  fi
else
  echo "✅ No issues found in the tests. Both gender filtering and pagination appear to be working correctly." >> $REPORT_FILE
fi

echo -e "${GREEN}Analysis complete. Report saved to $REPORT_FILE${NC}"
echo -e "${BLUE}Found $ISSUES_FOUND issues.${NC}"
