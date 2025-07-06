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
PATIENT_ID=""
SCAN_ID=""

# Test image
TEST_IMAGE="test-brain-scan.jpg"

echo -e "${BLUE}=== MediCare Brain Tumor Detection Test Script ===${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl and try again.${NC}"
    exit 1
fi

# Function to create a test image if it doesn't exist
create_test_image() {
    if [ ! -f "$TEST_IMAGE" ]; then
        echo -e "${YELLOW}Creating test brain scan image...${NC}"
        
        # Use curl to download a sample brain MRI image
        curl -s "https://www.researchgate.net/profile/Walid-Ayadi/publication/323167167/figure/fig1/AS:594723894824961@1518828248511/MRI-brain-tumor-image.png" -o "$TEST_IMAGE"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Test image created successfully.${NC}"
        else
            echo -e "${RED}Failed to create test image. Brain tumor detection test will be skipped.${NC}"
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
        
        # If user is a patient, get their FHIR ID
        if [ "$role" = "patient" ]; then
            PATIENT_ID=$(echo "$response" | grep -o '"fhirResourceId":"[^"]*' | sed 's/"fhirResourceId":"//')
            echo -e "${GREEN}Patient ID: ${PATIENT_ID}${NC}"
        fi
        
        echo -e "${GREEN}Authentication successful.${NC}"
        echo "Token: ${ACCESS_TOKEN:0:20}..."
        return 0
    else
        echo -e "${RED}Authentication failed.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to upload a brain scan
upload_brain_scan() {
    local patient_id="$1"
    
    echo -e "\n${YELLOW}Uploading brain scan for patient ${patient_id}...${NC}"
    
    # Check if test image exists
    if [ ! -f "$TEST_IMAGE" ]; then
        echo -e "${RED}Test image not found. Skipping brain scan upload.${NC}"
        return 1
    fi
    
    local response=$(curl -s -X POST "${API_BASE}/brain-tumor/upload?patientId=${patient_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -F "file=@${TEST_IMAGE}")
    
    # Check if upload was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Brain scan uploaded successfully.${NC}"
        SCAN_ID=$(echo "$response" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
        echo -e "Scan ID: ${SCAN_ID}"
        
        # Display scan status
        local status=$(echo "$response" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
        echo -e "Initial status: ${status}"
        
        return 0
    else
        echo -e "${RED}Failed to upload brain scan.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to get brain scan by ID
get_brain_scan() {
    local scan_id="$1"
    
    echo -e "\n${YELLOW}Getting brain scan with ID ${scan_id}...${NC}"
    
    local response=$(curl -s -X GET "${API_BASE}/brain-tumor/${scan_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if request was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Successfully retrieved brain scan.${NC}"
        
        # Display scan details
        local status=$(echo "$response" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
        echo -e "Status: ${status}"
        
        # If status is completed, show detection results
        if [ "$status" = "completed" ]; then
            local tumor_detected=$(echo "$response" | grep -o '"tumorDetected":[^,]*' | sed 's/"tumorDetected"://')
            
            if [ "$tumor_detected" = "true" ]; then
                local tumor_type=$(echo "$response" | grep -o '"tumorType":"[^"]*' | sed 's/"tumorType":"//')
                local confidence=$(echo "$response" | grep -o '"confidence":[^,]*' | sed 's/"confidence"://')
                
                echo -e "${RED}Tumor detected!${NC}"
                echo -e "Type: ${tumor_type}"
                echo -e "Confidence: ${confidence}"
            else
                echo -e "${GREEN}No tumor detected.${NC}"
            fi
            
            # Show FHIR resource IDs
            local observation_id=$(echo "$response" | grep -o '"fhirObservationId":"[^"]*' | sed 's/"fhirObservationId":"//')
            local report_id=$(echo "$response" | grep -o '"fhirDiagnosticReportId":"[^"]*' | sed 's/"fhirDiagnosticReportId":"//')
            
            echo -e "FHIR Observation ID: ${observation_id}"
            echo -e "FHIR DiagnosticReport ID: ${report_id}"
        fi
        
        return 0
    else
        echo -e "${RED}Failed to retrieve brain scan.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to get brain scans for a patient
get_patient_brain_scans() {
    local patient_id="$1"
    
    echo -e "\n${YELLOW}Getting brain scans for patient ${patient_id}...${NC}"
    
    local response=$(curl -s -X GET "${API_BASE}/brain-tumor/patient/${patient_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if request was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Successfully retrieved patient brain scans.${NC}"
        
        # Count the number of scans
        local scan_count=$(echo "$response" | grep -o '"id":"[^"]*' | wc -l)
        echo -e "Number of scans: ${scan_count}"
        
        return 0
    else
        echo -e "${RED}Failed to retrieve patient brain scans.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to wait for scan processing
wait_for_scan_processing() {
    local scan_id="$1"
    local max_attempts=10
    local attempt=1
    local status="pending"
    
    echo -e "\n${YELLOW}Waiting for scan processing to complete...${NC}"
    
    while [ "$status" = "pending" ] && [ $attempt -le $max_attempts ]; do
        echo -e "Attempt $attempt/$max_attempts: Checking scan status..."
        
        local response=$(curl -s -X GET "${API_BASE}/brain-tumor/${scan_id}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "Content-Type: application/json")
        
        if echo "$response" | grep -q "\"success\":true"; then
            status=$(echo "$response" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
            
            if [ "$status" = "completed" ]; then
                echo -e "${GREEN}Scan processing completed!${NC}"
                return 0
            elif [ "$status" = "failed" ]; then
                echo -e "${RED}Scan processing failed.${NC}"
                local error_message=$(echo "$response" | grep -o '"errorMessage":"[^"]*' | sed 's/"errorMessage":"//')
                echo -e "Error: ${error_message}"
                return 1
            fi
        else
            echo -e "${RED}Failed to check scan status.${NC}"
            echo "Response: $response"
            return 1
        fi
        
        attempt=$((attempt + 1))
        
        if [ "$status" = "pending" ] && [ $attempt -le $max_attempts ]; then
            echo -e "${YELLOW}Status is still pending. Waiting 5 seconds before next check...${NC}"
            sleep 5
        fi
    done
    
    if [ "$status" = "pending" ]; then
        echo -e "${YELLOW}Maximum attempts reached. Scan processing is still pending.${NC}"
        return 2
    fi
    
    return 0
}

# Function to delete a brain scan
delete_brain_scan() {
    local scan_id="$1"
    
    echo -e "\n${YELLOW}Deleting brain scan with ID ${scan_id}...${NC}"
    
    local response=$(curl -s -X DELETE "${API_BASE}/brain-tumor/${scan_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if deletion was successful
    if echo "$response" | grep -q "\"success\":true"; then
        echo -e "${GREEN}Brain scan deleted successfully.${NC}"
        return 0
    else
        echo -e "${RED}Failed to delete brain scan.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Main test flow
main() {
    echo -e "\n${BLUE}Starting Brain Tumor Detection tests...${NC}"
    
    # Create test image
    create_test_image
    
    # Test 1: Patient uploads and views their own scan
    echo -e "\n${BLUE}Test 1: Patient uploads and views their own scan${NC}"
    if authenticate "patient@example.com" "Patient123!" "patient"; then
        # Upload brain scan
        if upload_brain_scan "$PATIENT_ID"; then
            # Get the scan details
            get_brain_scan "$SCAN_ID"
            
            # Wait for processing to complete
            wait_for_scan_processing "$SCAN_ID"
            
            # Get the scan details again after processing
            get_brain_scan "$SCAN_ID"
            
            # Get all scans for the patient
            get_patient_brain_scans "$PATIENT_ID"
        fi
    fi
    
    # Test 2: Practitioner views and deletes a scan
    echo -e "\n${BLUE}Test 2: Practitioner views and deletes a scan${NC}"
    if authenticate "practitioner@example.com" "Practitioner123!" "practitioner"; then
        # View the scan
        get_brain_scan "$SCAN_ID"
        
        # View all scans for the patient
        get_patient_brain_scans "$PATIENT_ID"
        
        # Delete the scan
        delete_brain_scan "$SCAN_ID"
    fi
    
    echo -e "\n${BLUE}All tests completed.${NC}"
}

# Run the main test flow
main 