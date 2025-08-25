#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting React + Express Application${NC}"

# Check if root node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Root node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install root dependencies${NC}"
        exit 1
    fi
fi

# Check if client node_modules exists
if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}Client node_modules not found. Installing client dependencies...${NC}"
    cd client
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install client dependencies${NC}"
        exit 1
    fi
    cd ..
fi

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Start Express server in background
echo -e "${GREEN}Starting Express server...${NC}"
node server/index.js &
SERVER_PID=$!

# Give server a moment to start
sleep 2

# Start React development server
echo -e "${GREEN}Starting React development server...${NC}"
npm run dev &
REACT_PID=$!

# Wait a moment for React to start, then open browser
echo -e "${GREEN}Waiting for React to start...${NC}"
sleep 5

# Open the React app in default browser
echo -e "${GREEN}Opening http://localhost:5173 in browser...${NC}"
open http://localhost:5173

# Wait for both processes
wait