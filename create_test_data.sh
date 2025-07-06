#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Creating test data for FHIR server..."

# Get authentication token
echo -e "${GREEN}Getting authentication token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}')

# Extract token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d':' -f2 | tr -d '"')

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get authentication token${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully obtained authentication token${NC}"

# Create Observation with ID obs-1
echo -e "${GREEN}Creating Observation with ID obs-1...${NC}"
curl -s -X PUT "http://localhost:3000/api/fhir/Observation/obs-1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "resourceType": "Observation",
    "id": "obs-1",
    "status": "final",
    "category": [
      {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "vital-signs",
            "display": "Vital Signs"
          }
        ]
      }
    ],
    "code": {
      "coding": [
        {
          "system": "http://loinc.org",
          "code": "8867-4",
          "display": "Heart rate"
        }
      ],
      "text": "Heart rate"
    },
    "subject": {
      "reference": "Patient/1"
    },
    "effectiveDateTime": "2023-01-01T12:00:00Z",
    "valueQuantity": {
      "value": 80,
      "unit": "beats/minute",
      "system": "http://unitsofmeasure.org",
      "code": "/min"
    }
  }'

# Create Encounter with ID enc-1
echo -e "${GREEN}Creating Encounter with ID enc-1...${NC}"
curl -s -X PUT "http://localhost:3000/api/fhir/Encounter/enc-1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "resourceType": "Encounter",
    "id": "enc-1",
    "status": "finished",
    "class": {
      "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      "code": "AMB",
      "display": "ambulatory"
    },
    "subject": {
      "reference": "Patient/1"
    },
    "period": {
      "start": "2023-01-01T10:00:00Z",
      "end": "2023-01-01T11:00:00Z"
    },
    "reasonCode": [
      {
        "text": "Annual checkup"
      }
    ]
  }'

# Create custom search parameters for value-min and value-max
echo -e "${GREEN}Creating custom search parameters for value range...${NC}"
curl -s -X POST "http://localhost:9090/fhir/SearchParameter" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "SearchParameter",
    "url": "http://example.org/fhir/SearchParameter/observation-value-min",
    "version": "1.0.0",
    "name": "value-min",
    "status": "active",
    "description": "Minimum value for observations",
    "code": "value-min",
    "base": ["Observation"],
    "type": "number",
    "expression": "Observation.valueQuantity.value"
  }'

curl -s -X POST "http://localhost:9090/fhir/SearchParameter" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "SearchParameter",
    "url": "http://example.org/fhir/SearchParameter/observation-value-max",
    "version": "1.0.0",
    "name": "value-max",
    "status": "active",
    "description": "Maximum value for observations",
    "code": "value-max",
    "base": ["Observation"],
    "type": "number",
    "expression": "Observation.valueQuantity.value"
  }'

echo -e "${GREEN}Test data creation completed!${NC}" 