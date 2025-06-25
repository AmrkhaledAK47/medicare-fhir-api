# MediCare FHIR API Testing Plan

This document outlines a comprehensive testing plan for the MediCare FHIR API endpoints. The plan is designed to systematically test each endpoint, verify query parameter functionality, and ensure pagination works correctly.

## Table of Contents

1. [Testing Environment Setup](#testing-environment-setup)
2. [Authentication Testing](#authentication-testing)
3. [Resource-Specific Testing](#resource-specific-testing)
4. [Common Query Parameters Testing](#common-query-parameters-testing)
5. [Pagination Testing](#pagination-testing)
6. [Error Handling Testing](#error-handling-testing)
7. [Performance Testing](#performance-testing)
8. [Issues Fixed](#issues-fixed)
9. [Testing Results](#testing-results)

## Testing Environment Setup

Before beginning the tests, ensure the following:

1. The Docker environment is running with all containers healthy:
   ```bash
   docker-compose ps
   ```

2. Generate and save an authentication token for testing:
   ```bash
   curl -X POST "http://localhost:3000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "Admin123!"
     }' | jq -r '.accessToken' > token.txt
   ```

3. Verify the HAPI FHIR server is accessible:
   ```bash
   curl -s "http://localhost:3000/api/health/fhir-server" -H "Authorization: Bearer $(cat token.txt)"
   ```

## Authentication Testing

1. Test login endpoint:
   ```bash
   curl -X POST "http://localhost:3000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "Admin123!"
     }'
   ```

2. Test unauthorized access:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient"
   ```

3. Test authorized access:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient" -H "Authorization: Bearer $(cat token.txt)"
   ```

## Resource-Specific Testing

### Patient Resource

1. Get all patients:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get patient by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search patients by gender:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?gender=male" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search patients by name:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?name=John" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Practitioner Resource

1. Get all practitioners:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Practitioner" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get practitioner by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Practitioner/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search practitioners by specialty:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Practitioner?specialty=cardiology" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Encounter Resource

1. Get all encounters:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Encounter" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get encounter by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Encounter/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search encounters by status:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Encounter?status=finished" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search encounters by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Encounter?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Observation Resource

1. Get all observations:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get observation by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search observations by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search observations by category:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?category=vital-signs" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

5. Search observations by code:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?code=http://loinc.org|85354-9" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

6. Search observations by component code:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?component-code=8480-6" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

7. Search observations by value range:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?value-min=100&value-max=200" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

8. Use custom endpoint for getting observations by code:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation/$by-code?code=85354-9&system=http://loinc.org" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

9. Use custom endpoint for getting observations by component:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation/$by-component?component-code=8480-6" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

10. Use custom endpoint for getting observations by value range:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/$by-value-range?code=2093-3&value-min=150&value-max=200" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

11. Use patient observations endpoint:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

12. Use patient vital signs endpoint:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/patient/1/vitals" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

13. Use patient lab results endpoint:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/patient/1/labs" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

14. Use latest observation endpoint:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/patient/1/latest?code=85354-9" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

15. Test search with _include parameter to include Patient:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation?subject=Patient/1&_include=Observation:subject" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

16. Test search with chained parameters:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation?patient.identifier=12345" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

17. Create a blood pressure observation:
    ```bash
    curl -X POST "http://localhost:3000/api/fhir/Observation" \
      -H "Authorization: Bearer $(cat token.txt)" \
      -H "Content-Type: application/json" \
      -d '{
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
      }'
    ```

### Condition Resource

1. Get all conditions:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Condition" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get condition by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Condition/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search conditions by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Condition?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search conditions by clinical status:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Condition?clinical-status=active" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Medication Resource

1. Get all medications:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Medication" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get medication by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Medication/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search medications by code:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Medication?code=1191" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search medications by status:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Medication?status=active" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### MedicationRequest Resource

1. Get all medication requests:
   ```bash
   curl -s "http://localhost:3000/api/fhir/MedicationRequest" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get medication request by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/MedicationRequest/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search medication requests by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/MedicationRequest?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search medication requests by status:
   ```bash
   curl -s "http://localhost:3000/api/fhir/MedicationRequest?status=active" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

5. Search medication requests with multiple parameters:
   ```bash
   curl -s "http://localhost:3000/api/fhir/MedicationRequest?subject=Patient/1&status=active" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Procedure Resource

1. Get all procedures:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Procedure" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get procedure by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Procedure/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search procedures by status:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Procedure?status=completed" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search procedures by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Procedure?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### AllergyIntolerance Resource

1. Get all allergies:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get allergy by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search allergies by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance?patient=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search allergies by category:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance?category=food" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

5. Test patient-specific endpoint:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance/patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

6. Search allergies by criticality:
   ```bash
   curl -s "http://localhost:3000/api/fhir/AllergyIntolerance?criticality=high" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### DiagnosticReport Resource

1. Get all diagnostic reports:
   ```bash
   curl -s "http://localhost:3000/api/fhir/DiagnosticReport" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Get diagnostic report by ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/DiagnosticReport/12" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Search diagnostic reports by patient:
   ```bash
   curl -s "http://localhost:3000/api/fhir/DiagnosticReport?subject=Patient/1" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Search diagnostic reports by category:
   ```bash
   curl -s "http://localhost:3000/api/fhir/DiagnosticReport?category=LAB" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

5. Create a new diagnostic report:
   ```bash
   curl -X POST "http://localhost:3000/api/fhir/DiagnosticReport" \
     -H "Authorization: Bearer $(cat token.txt)" \
     -H "Content-Type: application/json" \
     -d '{
       "resourceType": "DiagnosticReport",
       "status": "final",
       "category": [
         {
           "coding": [
             {
               "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
               "code": "LAB",
               "display": "Laboratory"
             }
           ]
         }
       ],
       "code": {
         "coding": [
           {
             "system": "http://loinc.org",
             "code": "58410-2",
             "display": "Complete blood count (hemogram) panel - Blood by Automated count"
           }
         ],
         "text": "CBC"
       },
       "subject": {
         "reference": "Patient/1"
       },
       "issued": "2025-06-24T15:52:00Z",
       "conclusion": "Normal CBC results"
     }'
   ```

## Common Query Parameters Testing

For each resource type, test the following common query parameters:

### Pagination Parameters

1. Test _count parameter:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_count=2" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Test page parameter (if supported):
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_count=2&page=2" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Sorting Parameters

1. Test _sort parameter:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_sort=name" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Test _sort with direction:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_sort=name&_sort:desc" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

### Date Range Parameters

1. Test date range for applicable resources:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Observation?date=ge2023-01-01&date=le2023-12-31" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

## Pagination Testing

For each resource type, verify that pagination works correctly:

1. Get total count of resources:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_summary=count" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Test first page with small count:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?_count=2" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Verify next link is present and functional:
   ```bash
   # Extract next link from previous response and use it
   curl -s "[next-link-from-previous-response]" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Verify that different pages return different results:
   ```bash
   # Compare results from different pages
   ```

## Error Handling Testing

1. Test with invalid resource type:
   ```bash
   curl -s "http://localhost:3000/api/fhir/InvalidResource" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

2. Test with non-existent ID:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient/999999" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

3. Test with invalid query parameters:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient?invalid=parameter" -H "Authorization: Bearer $(cat token.txt)" | json_pp
   ```

4. Test with invalid token:
   ```bash
   curl -s "http://localhost:3000/api/fhir/Patient" -H "Authorization: Bearer invalid_token" | json_pp
   ```

## Performance Testing

1. Test response time for simple queries:
   ```bash
   time curl -s "http://localhost:3000/api/fhir/Patient/1" -H "Authorization: Bearer $(cat token.txt)" > /dev/null
   ```

2. Test response time for complex queries:
   ```bash
   time curl -s "http://localhost:3000/api/fhir/Observation?subject=Patient/1&code=8480-6&_count=10" -H "Authorization: Bearer $(cat token.txt)" > /dev/null
   ```

## Issues Fixed

The following issues have been fixed in the API:

1. **Query Parameter Handling**: Fixed the transformation of query parameters to properly handle FHIR-specific parameters like `_include`, `_revinclude`, `_summary`, etc.

2. **Filtering Issues**: Implemented proper filtering for resources like AllergyIntolerance (by criticality) and Observation (by component code, value range, etc.).

3. **Connection Issues**: Fixed connection to the HAPI FHIR server by updating URLs to use Docker network names instead of localhost.

4. **Enhanced Controllers**: Created FHIR-compliant controllers for DiagnosticReport and enhanced Observation with advanced filtering capabilities.

5. **Chained Parameters**: Added support for chained parameters in the Observation controller to enable more complex queries.

6. **Composite Search Parameters**: Implemented composite search parameters for Observation resources, allowing for more complex queries that combine multiple search criteria.

7. **Reference Range Searches**: Added support for searching observations by reference range values.

8. **Reverse Chaining**: Implemented support for the _has parameter to enable reverse chaining queries.

## Testing Results

The following features have been tested and confirmed working:

1. **Authentication**: JWT authentication is working correctly.

2. **Basic CRUD Operations**: Create, Read, Update, and Delete operations are working for all implemented resources.

3. **Search Parameters**: Common search parameters are working correctly, including patient/subject, code, category, date, status, etc.

4. **Custom Endpoints**: Custom endpoints for specific use cases (e.g., getting allergies by patient ID, latest observations, etc.) are working correctly.

5. **Pagination**: Pagination with `_count` and `page` parameters is working correctly.

6. **Sorting**: Sorting with `_sort` parameter is working correctly.

7. **Advanced Filtering**: Advanced filtering options like component code searches and value range searches are working for Observation resources.

8. **_include and _revinclude**: Parameters for including referenced resources are working correctly.

9. **Chained Parameters**: Chained parameters for more complex queries are working correctly.

10. **Composite Search Parameters**: Composite search parameters for Observation resources are working correctly.

11. **Reference Range Searches**: Searching observations by reference range values is working correctly.

12. **Reverse Chaining**: The _has parameter for reverse chaining queries is working correctly.

| Resource | Endpoint | Query Parameters | Status | Notes |
|----------|----------|-----------------|--------|-------|
| Patient | GET /api/fhir/Patient | - | ✅ | Returns all patients |
| Patient | GET /api/fhir/Patient/1 | - | ✅ | Returns patient with ID 1 |
| Patient | GET /api/fhir/Patient?gender=male | gender=male | ✅ | Returns male patients only |
| Patient | GET /api/fhir/Patient?gender=female | gender=female | ✅ | Returns female patients only (none in test data) |
| Patient | GET /api/fhir/Patient?_count=1 | _count=1 | ✅ | Returns first page with 1 patient |
| AllergyIntolerance | GET /api/fhir/AllergyIntolerance | - | ✅ | Returns all allergies |
| AllergyIntolerance | GET /api/fhir/AllergyIntolerance/11 | - | ✅ | Returns allergy with ID 11 |
| AllergyIntolerance | GET /api/fhir/AllergyIntolerance?category=food | category=food | ✅ | Returns food allergies only |
| AllergyIntolerance | GET /api/fhir/AllergyIntolerance?criticality=high | criticality=high | ✅ | Returns high criticality allergies only |
| Procedure | GET /api/fhir/Procedure | - | ✅ | Returns all procedures |
| Procedure | GET /api/fhir/Procedure?subject=Patient/1 | subject=Patient/1 | ✅ | Returns procedures for Patient/1 only |
| Procedure | GET /api/fhir/Procedure?_count=1 | _count=1 | ✅ | Returns first page with 1 procedure |
| Condition | GET /api/fhir/Condition | - | ✅ | Returns all conditions |
| Condition | GET /api/fhir/Condition?clinical-status=active | clinical-status=active | ✅ | Returns active conditions only |
| MedicationRequest | GET /api/fhir/MedicationRequest | - | ✅ | Returns all medication requests |
| MedicationRequest | GET /api/fhir/MedicationRequest?subject=Patient/1 | subject=Patient/1 | ✅ | Returns medication requests for Patient/1 only |
| MedicationRequest | GET /api/fhir/MedicationRequest?status=active | status=active | ✅ | Returns active medication requests only |
| DiagnosticReport | GET /api/fhir/DiagnosticReport | - | ✅ | Returns all diagnostic reports |
| DiagnosticReport | GET /api/fhir/DiagnosticReport?subject=Patient/1 | subject=Patient/1 | ✅ | Returns diagnostic reports for Patient/1 only |
| DiagnosticReport | GET /api/fhir/DiagnosticReport?category=LAB | category=LAB | ✅ | Returns LAB diagnostic reports only |
| DiagnosticReport | POST /api/fhir/DiagnosticReport | - | ✅ | Creates a new diagnostic report |
18. Test composite search parameters - component code and value:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/$by-component-value?component-code=8480-6&value-operator=ge&value=120" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

19. Test composite search parameters - direct FHIR parameter:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation?component-code-value-quantity=8480-6$ge120" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

20. Test reference range search:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation/$by-reference-range?code=2093-3&range-low=0&range-high=200" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ```

21. Test _has parameter for reverse chaining:
    ```bash
    curl -s "http://localhost:3000/api/fhir/Observation?_has:DiagnosticReport:result:code=2093-3" -H "Authorization: Bearer $(cat token.txt)" | json_pp
    ``` 