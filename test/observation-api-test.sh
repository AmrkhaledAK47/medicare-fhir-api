#!/bin/bash

# Test script for Observation API endpoints
# This script tests the enhanced Observation controller functionality

echo "=== Testing Observation API ==="
echo ""

# Set base URL
BASE_URL="http://localhost:3000/api/fhir"

# Get token for authentication
TOKEN=$(cat token.txt)

if [ -z "$TOKEN" ]; then
  echo "Error: No authentication token found. Please create a token.txt file with a valid JWT token."
  exit 1
fi

# Function to make API calls
call_api() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-""}
  
  echo "Calling $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "$BASE_URL/$endpoint" | jq '.'
  else
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL/$endpoint" | jq '.'
  fi
  
  echo ""
}

# 1. Create a test blood pressure observation
echo "Creating a test blood pressure observation..."
BP_OBSERVATION=$(cat <<EOF
{
  "resourceType": "Observation",
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
        "code": "85354-9",
        "display": "Blood pressure panel with all children optional"
      }
    ],
    "text": "Blood pressure panel"
  },
  "subject": {
    "reference": "Patient/1"
  },
  "effectiveDateTime": "2023-10-10T09:30:00Z",
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8480-6",
            "display": "Systolic blood pressure"
          }
        ],
        "text": "Systolic blood pressure"
      },
      "valueQuantity": {
        "value": 120,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Diastolic blood pressure"
          }
        ],
        "text": "Diastolic blood pressure"
      },
      "valueQuantity": {
        "value": 80,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    }
  ]
}
EOF
)

call_api "Observation" "POST" "$BP_OBSERVATION"

# 2. Create a test lab result
echo "Creating a test lab result observation..."
LAB_OBSERVATION=$(cat <<EOF
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "2093-3",
        "display": "Cholesterol [Mass/volume] in Serum or Plasma"
      }
    ],
    "text": "Total Cholesterol"
  },
  "subject": {
    "reference": "Patient/1"
  },
  "effectiveDateTime": "2023-10-10T10:00:00Z",
  "valueQuantity": {
    "value": 185,
    "unit": "mg/dL",
    "system": "http://unitsofmeasure.org",
    "code": "mg/dL"
  },
  "referenceRange": [
    {
      "low": {
        "value": 0,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "high": {
        "value": 200,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "type": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/referencerange-meaning",
            "code": "normal",
            "display": "Normal Range"
          }
        ]
      }
    }
  ]
}
EOF
)

call_api "Observation" "POST" "$LAB_OBSERVATION"

# 3. Test basic search
echo "Testing basic Observation search..."
call_api "Observation"

# 4. Test search by patient
echo "Testing search by patient..."
call_api "Observation?subject=Patient/1"

# 5. Test search by category
echo "Testing search by category..."
call_api "Observation?category=vital-signs"

# 6. Test search by code
echo "Testing search by code..."
call_api "Observation?code=http://loinc.org|85354-9"

# 7. Test search by component code
echo "Testing search by component code..."
call_api "Observation?component-code=8480-6"

# 8. Test search by value range
echo "Testing search by value range..."
call_api "Observation?value-min=100&value-max=200"

# 9. Test custom endpoint for getting observations by code
echo "Testing custom endpoint for getting observations by code..."
call_api "Observation/\$by-code?code=85354-9&system=http://loinc.org"

# 10. Test custom endpoint for getting observations by component
echo "Testing custom endpoint for getting observations by component..."
call_api "Observation/\$by-component?component-code=8480-6"

# 11. Test custom endpoint for getting observations by value range
echo "Testing custom endpoint for getting observations by value range..."
call_api "Observation/\$by-value-range?code=2093-3&value-min=150&value-max=200"

# 12. Test patient observations endpoint
echo "Testing patient observations endpoint..."
call_api "Observation/patient/1"

# 13. Test patient vital signs endpoint
echo "Testing patient vital signs endpoint..."
call_api "Observation/patient/1/vitals"

# 14. Test patient lab results endpoint
echo "Testing patient lab results endpoint..."
call_api "Observation/patient/1/labs"

# 15. Test latest observation endpoint
echo "Testing latest observation endpoint..."
call_api "Observation/patient/1/latest?code=85354-9"

# 16. Test search with _include parameter to include Patient
echo "Testing search with _include parameter..."
call_api "Observation?subject=Patient/1&_include=Observation:subject"

# 17. Test search with chained parameters
echo "Testing search with chained parameters..."
call_api "Observation?patient.identifier=12345"

# 18. Test composite search parameters - component code and value
echo "Testing composite search parameters - component code and value..."
call_api "Observation/\$by-component-value?component-code=8480-6&value-operator=ge&value=120"

# 19. Test composite search parameters - direct FHIR parameter
echo "Testing composite search parameters - direct FHIR parameter..."
call_api "Observation?component-code-value-quantity=8480-6\$ge120"

# 20. Test reference range search
echo "Testing reference range search..."
call_api "Observation/\$by-reference-range?code=2093-3&range-low=0&range-high=200"

# 21. Test _has parameter for reverse chaining
echo "Testing _has parameter for reverse chaining..."
call_api "Observation?_has:Observation:subject:code=85354-9"

echo "=== Observation API Testing Complete ===" 