#!/bin/bash

# Colors for better output readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# API configuration
API_BASE="http://localhost:3000/api"
ACCESS_TOKEN=""
USER_ID=""

# Test image for avatar upload
TEST_IMAGE="test-avatar.jpg"

echo -e "${BLUE}=== MediCare Dashboard & Profile API Test Script ===${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl and try again.${NC}"
    exit 1
fi

# Function to create a test image if it doesn't exist
create_test_image() {
    if [ ! -f "$TEST_IMAGE" ]; then
        echo -e "${YELLOW}Creating test image for avatar upload...${NC}"
        
        # Use curl to download a placeholder image if wget is not available
        curl -s "https://via.placeholder.com/150/0000FF/FFFFFF?text=Test+Avatar" -o "$TEST_IMAGE"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Test image created successfully.${NC}"
        else
            echo -e "${RED}Failed to create test image. Avatar upload test will be skipped.${NC}"
            return 1
        fi
    fi
    return 0
}

# Function to authenticate and get token
authenticate() {
    local email="$1"
    local password="$2"
    local role="$3"
    
    echo -e "${YELLOW}Authenticating as ${role} (${email})...${NC}"
    
    local response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
    
    # Check if authentication was successful
    if echo "$response" | grep -q "\"success\":true"; then
        ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
        USER_ID=$(echo "$response" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
        echo -e "${GREEN}Authentication successful.${NC}"
        echo "Token: ${ACCESS_TOKEN:0:20}..."
        echo "User ID: $USER_ID"
        return 0
    else
        echo -e "${RED}Authentication failed.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to get user profile
get_user_profile() {
    echo -e "\n${YELLOW}Getting user profile...${NC}"
    
    local response=$(curl -s -X GET "${API_BASE}/auth/me" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if request was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Successfully retrieved user profile.${NC}"
        echo -e "${BLUE}Profile data:${NC}"
        echo "$response" | grep -o '"name":"[^"]*' | sed 's/"name":"/Name: /'
        echo "$response" | grep -o '"email":"[^"]*' | sed 's/"email":"/Email: /'
        echo "$response" | grep -o '"role":"[^"]*' | sed 's/"role":"/Role: /'
        echo "$response" | grep -o '"status":"[^"]*' | sed 's/"status":"/Status: /'
        
        # Check if user has a profile image
        local profile_image=$(echo "$response" | grep -o '"profileImageUrl":"[^"]*' | sed 's/"profileImageUrl":"//')
        if [ -n "$profile_image" ]; then
            echo "Profile Image URL: $profile_image"
        else
            echo "Profile Image: None"
        fi
        
        return 0
    else
        echo -e "${RED}Failed to retrieve user profile.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to get dashboard data
get_dashboard() {
    echo -e "\n${YELLOW}Fetching dashboard data...${NC}"
    
    local response=$(curl -s -X GET "${API_BASE}/dashboard" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if request was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Successfully retrieved dashboard data.${NC}"
        
        # Display dashboard components
        echo -e "\n${BLUE}Dashboard Components:${NC}"
        
        # Check profile
        if echo "$response" | grep -q "\"profile\":"; then
            echo -e "${GREEN}✓ Profile data available${NC}"
            
            # Check for chronic diseases
            if echo "$response" | grep -q "\"diseases\":"; then
                echo -e "  ${GREEN}✓ Chronic diseases available${NC}"
                
                # Count physical diseases
                local physical_count=$(echo "$response" | grep -o "\"physical\":\[.*\]" | grep -o "\"[^\"]*\"" | wc -l)
                echo -e "    - Physical conditions: $physical_count"
                
                # Count speech diseases
                local speech_count=$(echo "$response" | grep -o "\"speech\":\[.*\]" | grep -o "\"[^\"]*\"" | wc -l)
                echo -e "    - Speech conditions: $speech_count"
            else
                echo -e "  ${YELLOW}✗ No chronic diseases found${NC}"
            fi
        else
            echo -e "${RED}✗ Profile data not available${NC}"
        fi
        
        # Check biomarkers
        if echo "$response" | grep -q "\"biomarkers\":"; then
            local biomarker_count=$(echo "$response" | grep -o "\"biomarkers\":\[.*\]" | grep -o "{" | wc -l)
            echo -e "${GREEN}✓ Biomarkers available ($biomarker_count)${NC}"
        else
            echo -e "${RED}✗ Biomarkers not available${NC}"
        fi
        
        # Check appointments
        if echo "$response" | grep -q "\"appointments\":"; then
            local appointment_count=$(echo "$response" | grep -o "\"appointments\":\[.*\]" | grep -o "{" | wc -l)
            echo -e "${GREEN}✓ Appointments available ($appointment_count)${NC}"
        else
            echo -e "${RED}✗ Appointments not available${NC}"
        fi
        
        # Check calendar
        if echo "$response" | grep -q "\"calendar\":"; then
            local calendar_count=$(echo "$response" | grep -o "\"calendar\":\[.*\]" | grep -o "{" | wc -l)
            echo -e "${GREEN}✓ Calendar events available ($calendar_count)${NC}"
        else
            echo -e "${RED}✗ Calendar events not available${NC}"
        fi
        
        # Check quick actions
        if echo "$response" | grep -q "\"quickActions\":"; then
            local action_count=$(echo "$response" | grep -o "\"quickActions\":\[.*\]" | grep -o "{" | wc -l)
            echo -e "${GREEN}✓ Quick actions available ($action_count)${NC}"
        else
            echo -e "${RED}✗ Quick actions not available${NC}"
        fi
        
        # Check if there are any errors
        if echo "$response" | grep -q "\"errors\":"; then
            echo -e "\n${YELLOW}Dashboard Errors:${NC}"
            echo "$response" | grep -o "\"errors\":\[.*\]" | sed 's/"errors":\[//' | sed 's/\]//' | sed 's/,/\n/g' | sed 's/"//g'
        fi
        
        return 0
    else
        echo -e "${RED}Failed to retrieve dashboard data.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to upload avatar
upload_avatar() {
    echo -e "\n${YELLOW}Uploading avatar...${NC}"
    
    # Check if test image exists
    if [ ! -f "$TEST_IMAGE" ]; then
        echo -e "${RED}Test image not found. Skipping avatar upload.${NC}"
        return 1
    fi
    
    local response=$(curl -s -X PATCH "${API_BASE}/users/${USER_ID}/avatar" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -F "avatar=@${TEST_IMAGE}")
    
    # Check if request was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Avatar uploaded successfully.${NC}"
        local avatar_url=$(echo "$response" | grep -o '"avatarUrl":"[^"]*' | sed 's/"avatarUrl":"//')
        echo "New Avatar URL: $avatar_url"
        return 0
    else
        echo -e "${RED}Failed to upload avatar.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to test access control
test_access_control() {
    local role=$1
    echo -e "\n${YELLOW}Testing access control for role: ${role}...${NC}"
    
    # Try to access the dashboard
    local response=$(curl -s -X GET "${API_BASE}/dashboard" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    if [ "$role" = "patient" ]; then
        # Patients should be able to access the dashboard
        if echo "$response" | grep -q "\"success\":true"; then
            echo -e "${GREEN}Access control test PASSED: Patient can access dashboard.${NC}"
            return 0
        else
            echo -e "${RED}Access control test FAILED: Patient cannot access dashboard.${NC}"
            echo "Response: $response"
            return 1
        fi
    else
        # Non-patients should NOT be able to access the dashboard
        if echo "$response" | grep -q "\"success\":false"; then
            echo -e "${GREEN}Access control test PASSED: ${role} cannot access dashboard.${NC}"
            return 0
        else
            echo -e "${RED}Access control test FAILED: ${role} can access dashboard but should not.${NC}"
            echo "Response: $response"
            return 1
        fi
    fi
}

# Main test flow
main() {
    echo -e "\n${BLUE}Starting API tests...${NC}"
    
    # Create test image for avatar upload
    create_test_image
    
    # Test 1: Patient role
    echo -e "\n${BLUE}Test 1: Patient Authentication & Dashboard Access${NC}"
    if authenticate "patient@example.com" "Patient123!" "patient"; then
        get_user_profile
        get_dashboard
        upload_avatar
        test_access_control "patient"
    fi
    
    # Test 2: Admin role (should not have access to dashboard)
    echo -e "\n${BLUE}Test 2: Admin Authentication & Dashboard Access${NC}"
    if authenticate "admin@example.com" "Admin123!" "admin"; then
        get_user_profile
        test_access_control "admin"
    fi
    
    # Test 3: Practitioner role (should not have access to dashboard)
    echo -e "\n${BLUE}Test 3: Practitioner Authentication & Dashboard Access${NC}"
    if authenticate "practitioner@example.com" "Practitioner123!" "practitioner"; then
        get_user_profile
        test_access_control "practitioner"
    fi
    
    echo -e "\n${BLUE}All tests completed.${NC}"
}

# Run the main test flow
main 