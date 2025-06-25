#!/bin/bash

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default refresh interval in seconds
INTERVAL=${1:-5}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

# Function to clear screen based on OS
clear_screen() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        clear
    else
        printf "\033c"
    fi
}

# Function to get resource usage stats
get_stats() {
    # Get timestamp
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

    # Get containers
    CONTAINERS=$(docker ps --format "{{.Names}}")

    # Print header
    clear_screen
    echo -e "${BLUE}=== MediCare FHIR API Resource Monitor ===${NC}"
    echo -e "${CYAN}Refreshing every ${INTERVAL} seconds. Press Ctrl+C to exit.${NC}"
    echo -e "${CYAN}Timestamp: ${TIMESTAMP}${NC}"
    echo

    # Print resource usage for each container
    echo -e "${YELLOW}CONTAINER NAME                CPU %      MEM USAGE / LIMIT     MEM %      NET I/O             BLOCK I/O${NC}"
    echo "-------------------------------------------------------------------------------------------------------------------------------------------------"

    for CONTAINER in $CONTAINERS; do
        # Get container stats
        STATS=$(docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" "$CONTAINER")
        
        # Check if container is related to our project
        if [[ "$CONTAINER" == *"hapi"* || "$CONTAINER" == *"postgres"* || "$CONTAINER" == *"medicare"* || "$CONTAINER" == *"mongo"* ]]; then
            # Format container name with color based on service type
            if [[ "$CONTAINER" == *"hapi"* ]]; then
                CONTAINER_NAME="${GREEN}${CONTAINER}${NC}"
            elif [[ "$CONTAINER" == *"postgres"* ]]; then
                CONTAINER_NAME="${BLUE}${CONTAINER}${NC}"
            elif [[ "$CONTAINER" == *"mongodb"* ]]; then
                CONTAINER_NAME="${YELLOW}${CONTAINER}${NC}"
            else
                CONTAINER_NAME="${CYAN}${CONTAINER}${NC}"
            fi
            
            # Extract stats
            CPU=$(echo "$STATS" | cut -f1)
            MEM=$(echo "$STATS" | cut -f2)
            MEM_PERC=$(echo "$STATS" | cut -f3)
            NET=$(echo "$STATS" | cut -f4)
            BLOCK=$(echo "$STATS" | cut -f5)
            
            # Print container stats
            printf "%-30s %-10s %-20s %-10s %-18s %-20s\n" "$CONTAINER_NAME" "$CPU" "$MEM" "$MEM_PERC" "$NET" "$BLOCK"
        fi
    done

    echo
    echo -e "${CYAN}Database Connection Status:${NC}"
    echo "-------------------------------------------------------------------------------------------------------------------------------------------------"

    # Check PostgreSQL connection
    if docker exec hapi-postgres pg_isready -U admin -d hapi > /dev/null 2>&1; then
        echo -e "PostgreSQL: ${GREEN}Connected${NC} (Server is accepting connections)"
    else
        echo -e "PostgreSQL: ${RED}Disconnected${NC} (Server is not accepting connections)"
    fi

    # Check MongoDB connection
    if docker exec medicare-mongodb mongosh --quiet --eval "db.runCommand({ping: 1}).ok" | grep -q "1"; then
        echo -e "MongoDB:    ${GREEN}Connected${NC} (Server is accepting connections)"
    else
        echo -e "MongoDB:    ${RED}Disconnected${NC} (Server is not accepting connections)"
    fi

    # Check FHIR server health
    FHIR_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/fhir/metadata)
    if [ "$FHIR_HEALTH" -eq 200 ]; then
        echo -e "HAPI FHIR:  ${GREEN}Healthy${NC} (Server is responding to metadata requests)"
    else
        echo -e "HAPI FHIR:  ${RED}Unhealthy${NC} (Server is not responding to metadata requests)"
    fi

    # Check NestJS API health
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api)
    if [ "$API_HEALTH" -eq 200 ]; then
        echo -e "NestJS API: ${GREEN}Healthy${NC} (API is responding to requests)"
    else
        echo -e "NestJS API: ${RED}Unhealthy${NC} (API is not responding to requests)"
    fi

    echo
    echo -e "${CYAN}Main Service URLs:${NC}"
    echo -e "  - HAPI FHIR Server: ${BLUE}http://localhost:9090/fhir${NC}"
    echo -e "  - NestJS API: ${BLUE}http://localhost:3000/api${NC}"
    echo -e "  - API Documentation: ${BLUE}http://localhost:3000/api-docs${NC}"
}

# Continuously monitor resources
while true; do
    get_stats
    sleep $INTERVAL
done 