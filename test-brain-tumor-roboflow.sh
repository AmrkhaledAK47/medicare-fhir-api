#!/bin/bash

# Colors for better output readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# API configuration
API_BASE="http://localhost:3000/api"
FHIR_SERVER="http://localhost:9090/fhir"
ROBOFLOW_API_KEY="ZCZWVDLP3buD8Ba2fg5S"
ROBOFLOW_MODEL="https://serverless.roboflow.com/brain-tumour-detection-g4iyq/2"
ACCESS_TOKEN=""
PATIENT_ID=""
SCAN_ID=""

# User credentials
PATIENT_EMAIL="patient@example.com"
PATIENT_PASSWORD="Patient123!"
DOCTOR_EMAIL="doctor@med.com"
DOCTOR_PASSWORD="Doctor123!"

# Test image
TEST_IMAGE="test-brain-scan.jpg"
# Using a more standard JPEG image that's more likely to be compatible
TEST_IMAGE_URL="https://www.med.upenn.edu/cbica/assets/user-content/images/BraTS/brats-tumor-subregions.jpg"

# Debug mode
DEBUG=true

echo -e "${BLUE}=== MediCare Brain Tumor Detection Test Script ===${NC}"
echo -e "${BLUE}============================================${NC}"

# Function to print debug information
debug() {
    if [ "$DEBUG" = true ]; then
        echo -e "${YELLOW}[DEBUG] $1${NC}"
    fi
}

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl and try again.${NC}"
    exit 1
fi

# Function to create a test patient in FHIR server
create_test_patient() {
    echo -e "${YELLOW}Creating test patient in FHIR server...${NC}"
    
    # Generate a random ID for the patient
    local random_id="test-$(date +%s)"
    
    # Create a simple Patient resource
    local patient_json='{
        "resourceType": "Patient",
        "id": "'$random_id'",
        "active": true,
        "name": [
            {
                "use": "official",
                "family": "TestPatient",
                "given": ["Brain", "Tumor"]
            }
        ],
        "gender": "male",
        "birthDate": "1990-01-01"
    }'
    
    # Post the patient to the FHIR server
    local response=$(curl -s -X POST "${FHIR_SERVER}/Patient" \
        -H "Content-Type: application/json" \
        -d "$patient_json")
    
    # Check if the patient was created successfully
    if echo "$response" | grep -q "resourceType"; then
        local patient_id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
        echo -e "${GREEN}Test patient created successfully. Patient ID: ${patient_id}${NC}"
        PATIENT_ID=$patient_id
        return 0
    else
        echo -e "${RED}Failed to create test patient.${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to download a test image
download_test_image() {
    echo -e "${YELLOW}Downloading test brain scan image...${NC}"
    
    # Use curl to download a sample brain MRI image
    curl -s "$TEST_IMAGE_URL" -o "$TEST_IMAGE"
    
    if [ $? -eq 0 ] && [ -s "$TEST_IMAGE" ]; then
        echo -e "${GREEN}Test image downloaded successfully.${NC}"
        file "$TEST_IMAGE"  # Show file type information
        return 0
    else
        echo -e "${RED}Failed to download test image.${NC}"
        return 1
    fi
}

# Function to test direct Roboflow API
test_roboflow_api() {
    echo -e "\n${YELLOW}Testing Roboflow API directly...${NC}"
    
    # Check if test image exists and has content
    if [ ! -f "$TEST_IMAGE" ] || [ ! -s "$TEST_IMAGE" ]; then
        echo -e "${RED}Valid test image not found. Skipping Roboflow API test.${NC}"
        return 1
    fi
    
    # Test using base64 encoding method
    echo -e "${YELLOW}Method 1: Testing with base64 encoding...${NC}"
    local response=$(base64 "$TEST_IMAGE" | curl -s -X POST -d @- \
        "${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}")
    
    echo -e "Response from Roboflow API (base64 method):"
    echo "$response" | jq . || echo "$response"
    
    # Test using image URL method - using a different approach with a public URL
    echo -e "\n${YELLOW}Method 2: Testing with image URL...${NC}"
    local public_url="https://source.unsplash.com/featured/?brain,mri"
    local encoded_url=$(echo "$public_url" | jq -s -R -r @uri)
    local response2=$(curl -s -X POST \
        "${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}&image=${encoded_url}")
    
    echo -e "Response from Roboflow API (URL method):"
    echo "$response2" | jq . || echo "$response2"
    
    return 0
}

# Function to authenticate and get token
authenticate() {
    local email="$1"
    local password="$2"
    local role="$3"
    
    echo -e "${YELLOW}Authenticating as ${role} (${email})...${NC}"
    
    # Create the JSON payload
    local json_payload="{\"email\":\"${email}\",\"password\":\"${password}\"}"
    debug "Auth payload: $json_payload"
    
    # Make the request and save full response to a file for debugging
    local auth_response_file="auth_response_${role}.json"
    curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "$json_payload" > "$auth_response_file"
    
    debug "Auth response saved to $auth_response_file"
    
    # Display the response for debugging
    debug "Auth response content:"
    debug "$(cat "$auth_response_file")"
    
    # Check if authentication was successful
    if grep -q "\"success\":true" "$auth_response_file"; then
        ACCESS_TOKEN=$(grep -o '"accessToken":"[^"]*' "$auth_response_file" | sed 's/"accessToken":"//')
        
        # Extract FHIR resource ID if user is a patient
        if [ "$role" = "patient" ]; then
            PATIENT_ID=$(grep -o '"fhirResourceId":"[^"]*' "$auth_response_file" | sed 's/"fhirResourceId":"//')
            echo -e "${GREEN}Patient FHIR ID: ${PATIENT_ID}${NC}"
        fi
        
        echo -e "${GREEN}Authentication successful.${NC}"
        echo "Token: ${ACCESS_TOKEN:0:20}..."
        return 0
    else
        echo -e "${RED}Authentication failed.${NC}"
        echo "Response saved in $auth_response_file"
        return 1
    fi
}

# Function to fix the brain tumor service
fix_brain_tumor_service() {
    echo -e "\n${YELLOW}Fixing brain tumor service...${NC}"
    
    # Create a temporary file with the fix
    cat > brain-tumor-service-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Path to the brain-tumor.service.ts file
const filePath = path.join('/app/src/brain-tumor/brain-tumor.service.ts');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    process.exit(1);
  }
  
  // Replace valueDecimal with valueQuantity
  const result = data.replace(/valueDecimal: brainScan\.confidence/g, 'valueQuantity: { value: brainScan.confidence }');
  
  // Write the file back
  fs.writeFile(filePath, result, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      process.exit(1);
    }
    console.log('Successfully updated brain-tumor.service.ts');
  });
});
EOF
    
    # Copy the fix script to the container
    docker cp brain-tumor-service-fix.js medicare-api:/app/
    
    # Execute the fix script
    echo -e "${YELLOW}Applying fix to brain-tumor.service.ts...${NC}"
    docker-compose exec -T nest-api node /app/brain-tumor-service-fix.js
    
    # Restart the API service
    echo -e "${YELLOW}Restarting API service...${NC}"
    docker-compose restart nest-api
    
    # Wait for the service to restart
    echo -e "${YELLOW}Waiting for API service to restart...${NC}"
    sleep 15
    
    # Check if the API is up
    echo -e "${YELLOW}Checking if API is up...${NC}"
    local health_response=$(curl -s "http://localhost:3000/api/health")
    echo "Health check response: $health_response"
    
    # Clean up
    rm brain-tumor-service-fix.js
    
    return 0
}

# Function to test the brain tumor API
test_brain_tumor_api() {
    local patient_id="$1"
    
    echo -e "\n${YELLOW}Testing brain tumor API with patient ID: ${patient_id}...${NC}"
    
    # Check if test image exists
    if [ ! -f "$TEST_IMAGE" ] || [ ! -s "$TEST_IMAGE" ]; then
        echo -e "${RED}Valid test image not found. Skipping brain tumor API test.${NC}"
        return 1
    fi
    
    # Upload brain scan
    echo -e "${YELLOW}Uploading brain scan...${NC}"
    debug "Using token: ${ACCESS_TOKEN:0:20}..."
    debug "Patient ID: $patient_id"
    
    local upload_response=$(curl -v -X POST "${API_BASE}/brain-tumor/upload?patientId=${patient_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -F "file=@${TEST_IMAGE}" 2>&1)
    
    echo -e "Upload response:"
    echo "$upload_response" | jq . 2>/dev/null || echo "$upload_response"
    
    # Save the response to a file for easier parsing
    echo "$upload_response" > upload_response.txt
    
    # Extract scan ID if upload was successful
    if grep -q "\"success\":true" upload_response.txt; then
        # Extract the scan ID from the data object
        SCAN_ID=$(grep -o '"_id":"[^"]*' upload_response.txt | sed 's/"_id":"//')
        echo -e "${GREEN}Brain scan uploaded successfully. Scan ID: ${SCAN_ID}${NC}"
        
        # Wait a bit for processing
        echo -e "${YELLOW}Waiting 10 seconds for processing...${NC}"
        sleep 10
        
        # Get scan details
        echo -e "${YELLOW}Getting scan details...${NC}"
        local scan_response=$(curl -s -X GET "${API_BASE}/brain-tumor/${SCAN_ID}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "Content-Type: application/json")
        
        echo -e "Scan details response:"
        echo "$scan_response" | jq . || echo "$scan_response"
        
        # Wait longer and check again
        echo -e "${YELLOW}Waiting 20 more seconds for processing to complete...${NC}"
        sleep 20
        
        echo -e "${YELLOW}Getting scan details again...${NC}"
        local scan_response2=$(curl -s -X GET "${API_BASE}/brain-tumor/${SCAN_ID}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "Content-Type: application/json")
        
        echo -e "Updated scan details response:"
        echo "$scan_response2" | jq . || echo "$scan_response2"
        
        return 0
    else
        echo -e "${RED}Failed to upload brain scan.${NC}"
        return 1
    fi
}

# Function to test getting all brain scans for a patient
get_patient_brain_scans() {
    local patient_id="$1"
    
    echo -e "\n${YELLOW}Getting all brain scans for patient ${patient_id}...${NC}"
    
    local response=$(curl -s -X GET "${API_BASE}/brain-tumor/patient/${patient_id}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json")
    
    echo -e "Patient brain scans response:"
    echo "$response" | jq . || echo "$response"
    
    return 0
}

# Main test flow
main() {
    echo -e "\n${BLUE}Starting Brain Tumor Detection tests...${NC}"
    
    # Download test image
    download_test_image
    
    # Test Roboflow API directly
    test_roboflow_api
    
    # Fix the brain tumor service
    fix_brain_tumor_service
    
    # Test as patient
    echo -e "\n${BLUE}Testing as patient user...${NC}"
    if authenticate "$PATIENT_EMAIL" "$PATIENT_PASSWORD" "patient"; then
        test_brain_tumor_api "$PATIENT_ID"
        get_patient_brain_scans "$PATIENT_ID"
    fi
    
    # Test as doctor
    echo -e "\n${BLUE}Testing as doctor user...${NC}"
    if authenticate "$DOCTOR_EMAIL" "$DOCTOR_PASSWORD" "doctor"; then
        # If we have a scan ID from the patient test, try to access it
        if [ -n "$SCAN_ID" ]; then
            echo -e "${YELLOW}Doctor accessing patient's scan: ${SCAN_ID}...${NC}"
            local scan_response=$(curl -s -X GET "${API_BASE}/brain-tumor/${SCAN_ID}" \
                -H "Authorization: Bearer ${ACCESS_TOKEN}" \
                -H "Content-Type: application/json")
            
            echo -e "Doctor's view of scan:"
            echo "$scan_response" | jq . || echo "$scan_response"
        fi
        
        # Also get all patient's scans
        if [ -n "$PATIENT_ID" ]; then
            get_patient_brain_scans "$PATIENT_ID"
        fi
    fi
    
    echo -e "\n${BLUE}All tests completed.${NC}"
}

# Run the main test flow
main 