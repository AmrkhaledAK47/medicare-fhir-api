# MediCare FHIR API - Comprehensive Testing Plan

This testing plan focuses on thoroughly testing all Swagger endpoints in the MediCare FHIR API, with special attention to query parameters, pagination, and fixing issues with filtering and pagination responses.

## 1. Prerequisites

1. Ensure the FHIR server environment is running:
   ```bash
   npm run fhir:start
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

## 2. Issues to Fix

### 2.1. Query Parameter Issues

The current API implementation has some issues with query parameters:

1. **Gender filtering issue**: Searching with different gender parameters returns the same results regardless of the gender value.
2. **Pagination issues**: Using different page limits returns the same response despite different limit values.

### 2.2. Root Causes

Based on our code analysis, potential root causes include:

1. Query parameters might not be properly transformed in the patient controller's `transformQueryParams` method
2. The HAPI FHIR adapter might not be properly passing parameters to the underlying FHIR server
3. In the `BaseResourceController`, pagination parameters might not be correctly passed to the HAPI FHIR adapter
4. Logging shows parameters are being transformed correctly, but they might not be applied in the query

## 3. Testing Approach

We'll adopt a systematic approach to test all endpoints and verify the issues:

### 3.1. Testing Gender Filter

1. Get all patients without a gender filter to establish a baseline
2. Get patients with gender=male and verify only male patients are returned
3. Get patients with gender=female and verify only female patients are returned
4. Compare results to ensure they're different (assuming there are both male and female patients)

### 3.2. Testing Pagination

1. Get patients with _count=1 and verify exactly 1 patient is returned
2. Get patients with _count=2 and verify exactly 2 patients are returned
3. Get patients with _count=1&page=1 and compare with _count=1&page=2 to ensure different results
4. Verify the total count remains consistent across pagination requests
5. Test using the next link from the bundle to navigate pages

## 4. Testing Scripts

We'll create a series of Bash scripts to automate the testing process.
