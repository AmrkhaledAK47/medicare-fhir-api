#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restarting server to apply changes...${NC}"

# Navigate to the backend directory
cd /home/amr/backend

# Check if the process is running
if pgrep -f "node.*start" > /dev/null; then
    echo -e "${YELLOW}Stopping existing server process...${NC}"
    pkill -f "node.*start"
    sleep 2
fi

# Run the server in the background
echo -e "${BLUE}Starting server...${NC}"
npm run start:dev > server.log 2>&1 &

# Wait for the server to start
echo -e "${BLUE}Waiting for server to start...${NC}"
sleep 10

# Check if server is running
if curl -s http://localhost:3000/api/health | grep -q "UP"; then
    echo -e "${GREEN}Server is up and running!${NC}"
else
    echo -e "${RED}Server failed to start. Check logs for details.${NC}"
    cat server.log | tail -n 20
    exit 1
fi

echo -e "${GREEN}Server restarted successfully!${NC}"
