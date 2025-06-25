#!/bin/bash

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Apache Bench is installed
if ! command -v ab &> /dev/null; then
    echo -e "${RED}Apache Bench (ab) is not installed. Please install it first:${NC}"
    echo -e "  ${BLUE}sudo apt-get install apache2-utils${NC}"
    exit 1
fi

# Check if authentication token file exists
TOKEN_FILE="./postman/auth-tokens.json"
if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}Authentication token file not found. Please run generate-auth-token.js first.${NC}"
    exit 1
fi

# Extract admin token
ADMIN_TOKEN=$(grep -o '"admin": *"[^"]*"' "$TOKEN_FILE" | grep -o '"[^"]*"$' | tr -d '"')
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Admin token not found in token file.${NC}"
    exit 1
fi

# Default values
API_URL=${API_URL:-"http://localhost:3000/api"}
CONCURRENCY=${CONCURRENCY:-10}
REQUESTS=${REQUESTS:-100}
ENDPOINT=${ENDPOINT:-"/fhir/Patient"}

# Help text
show_help() {
    echo -e "${BLUE}FHIR API Benchmark Tool${NC}"
    echo
    echo "Usage: ./benchmark.sh [OPTIONS]"
    echo
    echo "Options:"
    echo "  -c, --concurrency NUM    Number of concurrent connections (default: $CONCURRENCY)"
    echo "  -n, --requests NUM       Number of requests to perform (default: $REQUESTS)"
    echo "  -e, --endpoint PATH      API endpoint to test (default: $ENDPOINT)"
    echo "  -u, --url URL            Base API URL (default: $API_URL)"
    echo "  -h, --help               Show this help message"
    echo
    echo "Examples:"
    echo "  ./benchmark.sh -c 20 -n 1000 -e /fhir/Patient"
    echo "  ./benchmark.sh --endpoint /fhir/Practitioner --requests 500"
    echo
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -c|--concurrency) CONCURRENCY="$2"; shift ;;
        -n|--requests) REQUESTS="$2"; shift ;;
        -e|--endpoint) ENDPOINT="$2"; shift ;;
        -u|--url) API_URL="$2"; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
done

# Ensure endpoint starts with /
if [[ ! $ENDPOINT = /* ]]; then
    ENDPOINT="/$ENDPOINT"
fi

echo -e "${BLUE}=== FHIR API Benchmark ====${NC}"
echo -e "API URL: ${YELLOW}${API_URL}${NC}"
echo -e "Endpoint: ${YELLOW}${ENDPOINT}${NC}"
echo -e "Concurrent connections: ${YELLOW}${CONCURRENCY}${NC}"
echo -e "Total requests: ${YELLOW}${REQUESTS}${NC}"
echo

# Create temporary file for authorization header
AUTH_HEADER_FILE=$(mktemp)
echo "Authorization: Bearer $ADMIN_TOKEN" > "$AUTH_HEADER_FILE"

echo -e "${BLUE}Starting benchmark...${NC}"
echo

# Run Apache Bench
ab -n $REQUESTS -c $CONCURRENCY -H "$(cat $AUTH_HEADER_FILE)" -v 2 "${API_URL}${ENDPOINT}"

# Clean up
rm -f "$AUTH_HEADER_FILE"

echo
echo -e "${GREEN}Benchmark completed!${NC}" 