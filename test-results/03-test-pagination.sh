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
OUTPUT_DIR="test-results/pagination"

# Create output directory
mkdir -p $OUTPUT_DIR

echo -e "${BLUE}Testing pagination in Patient resource...${NC}"

# 1. Get count of total patients
echo -e "${BLUE}Getting total patient count...${NC}"
curl -s "$API_URL/Patient?_summary=count" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/patient-count.json"

TOTAL_PATIENTS=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/patient-count.json" | head -1 | cut -d':' -f2)
echo "Total patients: $TOTAL_PATIENTS"

# If we have less than 3 patients, pagination test is less meaningful
if [ "$TOTAL_PATIENTS" -lt 3 ]; then
  echo -e "${YELLOW}Warning: Only $TOTAL_PATIENTS patients found. Pagination tests may be less conclusive.${NC}"
fi

# 2. Test _count parameter with different values
echo -e "${BLUE}Testing _count=1 parameter...${NC}"
curl -s "$API_URL/Patient?_count=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/count-1.json"

echo -e "${BLUE}Testing _count=2 parameter...${NC}"
curl -s "$API_URL/Patient?_count=2" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/count-2.json"

# 3. Test pagination with page parameter
echo -e "${BLUE}Testing page=1 with _count=1...${NC}"
curl -s "$API_URL/Patient?_count=1&page=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/page-1-count-1.json"

echo -e "${BLUE}Testing page=2 with _count=1...${NC}"
curl -s "$API_URL/Patient?_count=1&page=2" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$OUTPUT_DIR/page-2-count-1.json"

# 4. Extract entry counts to verify pagination is working
COUNT_1_ENTRIES=$(grep -o '"entry"\s*:\s*\[' "$OUTPUT_DIR/count-1.json" | wc -l)
COUNT_2_ENTRIES=$(grep -o '"entry"\s*:\s*\[' "$OUTPUT_DIR/count-2.json" | wc -l)

PAGE_1_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/page-1-count-1.json" | head -1 | cut -d':' -f2 | tr -d '\"')
PAGE_2_ID=$(grep -o '"id":"[^"]*"' "$OUTPUT_DIR/page-2-count-1.json" | head -1 | cut -d':' -f2 | tr -d '\"')

echo -e "${YELLOW}Results:${NC}"
echo "Entries with _count=1: $COUNT_1_ENTRIES"
echo "Entries with _count=2: $COUNT_2_ENTRIES"
echo "First ID on page 1: $PAGE_1_ID"
echo "First ID on page 2: $PAGE_2_ID"

# 5. Analyze results
PAGINATION_ISSUES=0

# Check if _count parameter is respected
if [ "$COUNT_1_ENTRIES" -gt 1 ]; then
  echo -e "${RED}ISSUE FOUND: _count=1 returned more than 1 entry.${NC}"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

if [ "$COUNT_2_ENTRIES" -gt 2 ]; then
  echo -e "${RED}ISSUE FOUND: _count=2 returned more than 2 entries.${NC}"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# Check if pages return different results
if [ "$PAGE_1_ID" = "$PAGE_2_ID" ] && [ "$TOTAL_PATIENTS" -gt 1 ]; then
  echo -e "${RED}ISSUE FOUND: Page 1 and page 2 return the same first patient ID.${NC}"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# Extract and check total count is consistent across requests
COUNT_1_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/count-1.json" | head -1 | cut -d':' -f2)
COUNT_2_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/count-2.json" | head -1 | cut -d':' -f2)
PAGE_1_TOTAL=$(grep -o '"total":[0-9]*' "$OUTPUT_DIR/page-1-count-1.json" | head -1 | cut -d':' -f2)

if [ "$COUNT_1_TOTAL" != "$TOTAL_PATIENTS" ] || [ "$COUNT_2_TOTAL" != "$TOTAL_PATIENTS" ] || [ "$PAGE_1_TOTAL" != "$TOTAL_PATIENTS" ]; then
  echo -e "${RED}ISSUE FOUND: Inconsistent total count across pagination requests.${NC}"
  echo "Total in summary: $TOTAL_PATIENTS"
  echo "Total in _count=1: $COUNT_1_TOTAL"
  echo "Total in _count=2: $COUNT_2_TOTAL"
  echo "Total in page=1: $PAGE_1_TOTAL"
  PAGINATION_ISSUES=$((PAGINATION_ISSUES + 1))
fi

# Final assessment
if [ "$PAGINATION_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}Pagination appears to be working correctly.${NC}"
else
  echo -e "${RED}$PAGINATION_ISSUES pagination issues found. See above for details.${NC}"
fi

echo -e "${BLUE}Test results saved to $OUTPUT_DIR${NC}"
