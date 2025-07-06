# MediCare Scripts

This directory contains utility scripts for the MediCare backend application.

## Available Scripts

### FHIR Resource Seeding Script

The `seed-fhir-resources.js` script creates sample FHIR resources in the HAPI FHIR server. It creates a transaction bundle with multiple resources and sends it to the server.

#### Resources Created

The script creates the following resources:
- 2 Patients
- 2 Practitioners
- 1 Organization
- 1 Encounter
- 2 Observations (Lab Test and Vital Sign)
- 1 Diagnostic Report
- 1 Questionnaire

#### Prerequisites

- Node.js installed
- Access to a running HAPI FHIR server
- Required npm packages: `axios`, `fs`, and `path`

#### Usage

```bash
# Basic usage with default settings (localhost:9090/fhir)
node seed-fhir-resources.js

# Specify a custom FHIR server URL
FHIR_SERVER_URL=http://custom-server:8080/fhir node seed-fhir-resources.js

# Use with authentication token
ADMIN_TOKEN=your-auth-token node seed-fhir-resources.js

# Combine custom URL and token
FHIR_SERVER_URL=http://custom-server:8080/fhir ADMIN_TOKEN=your-auth-token node seed-fhir-resources.js
```

#### Output

The script will:
1. Log progress to the console
2. Save the server response to `seed-response.json` in the same directory
3. List all created resources with their IDs

#### Troubleshooting

If you encounter errors:
- Ensure the HAPI FHIR server is running and accessible
- Check that the server URL is correct
- Verify that your authentication token is valid (if using one)
- Review the error messages in the console for specific issues

### FHIR Resource Verification Script

The `verify-fhir-resources.js` script verifies that the FHIR resources created by the seeding script exist in the HAPI FHIR server. It retrieves each resource and checks its basic properties.

#### Resources Verified

The script verifies all resources created by the seeding script:
- 2 Patients
- 2 Practitioners
- 1 Organization
- 1 Encounter
- 2 Observations
- 1 Diagnostic Report
- 1 Questionnaire

#### Prerequisites

- Node.js installed
- Access to a running HAPI FHIR server with seeded resources
- Required npm packages: `axios`, `fs`, and `path`

#### Usage

```bash
# Basic usage with default settings (localhost:9090/fhir)
node verify-fhir-resources.js

# Specify a custom FHIR server URL
FHIR_SERVER_URL=http://custom-server:8080/fhir node verify-fhir-resources.js

# Use with authentication token
ADMIN_TOKEN=your-auth-token node verify-fhir-resources.js

# Combine custom URL and token
FHIR_SERVER_URL=http://custom-server:8080/fhir ADMIN_TOKEN=your-auth-token node verify-fhir-resources.js
```

#### Output

The script will:
1. Log the verification status of each resource
2. Display basic properties of each resource (name, status, etc.)
3. Report the total number of successfully verified resources
4. Exit with code 0 if all resources are verified successfully, or code 1 if any verification fails

#### Troubleshooting

If verification fails:
- Ensure the HAPI FHIR server is running and accessible
- Check that the server URL is correct
- Verify that your authentication token is valid (if using one)
- Run the seeding script first to create the resources
- Review the error messages in the console for specific issues

### FHIR Resource Search Script

The `search-fhir-resources.js` script demonstrates how to search for FHIR resources using various search parameters. It provides examples for searching patients, practitioners, observations, and more.

#### Features

- Search for any FHIR resource type
- Apply multiple search parameters
- Display detailed information about found resources
- Save search results to a JSON file

#### Prerequisites

- Node.js installed
- Access to a running HAPI FHIR server
- Required npm packages: `axios`, `fs`, and `path`

#### Usage

```bash
# Display help information
node search-fhir-resources.js

# Search for patients with a specific family name
node search-fhir-resources.js Patient family=Smith

# Search for a specific patient by ID
node search-fhir-resources.js Patient _id=patient-1

# Search for observations related to a specific patient
node search-fhir-resources.js Observation subject=Patient/patient-1

# Search for encounters on a specific date
node search-fhir-resources.js Encounter date=2023-06-15

# Search for female patients
node search-fhir-resources.js Patient gender=female
```

#### Output

The script will:
1. Display the search parameters and request URL
2. Show the total number of resources found
3. Display detailed information about each resource
4. Save the complete search response to `search-response.json` in the same directory

#### Troubleshooting

If search fails or returns unexpected results:
- Ensure the HAPI FHIR server is running and accessible
- Check that the server URL is correct
- Verify that your authentication token is valid (if using one)
- Check that the search parameters are correctly formatted
- Review the error messages in the console for specific issues
- Examine the saved `search-response.json` file for more details

### Other Scripts

[Documentation for other scripts will be added here] 