# MediCare FHIR Integration

This repository contains the backend services for the MediCare healthcare application, which integrates with FHIR (Fast Healthcare Interoperability Resources) for standardized healthcare data exchange.

## FHIR Integration

The application integrates with a HAPI FHIR server to store and retrieve healthcare data in a standardized format. This allows for interoperability with other healthcare systems and applications.

### Available FHIR Resources

The application works with the following FHIR resources:

- **Patient**: Demographic information about individuals receiving healthcare services
- **Practitioner**: Healthcare professionals involved in patient care
- **Organization**: Healthcare organizations providing services
- **Encounter**: Interactions between patients and healthcare providers
- **Observation**: Measurements and simple assertions about patients
- **DiagnosticReport**: Results and interpretation of diagnostic tests or procedures
- **Questionnaire**: Structured sets of questions for data collection

## Utility Scripts

The repository includes several utility scripts for working with FHIR resources:

### FHIR Resource Seeding

The `scripts/seed-fhir-resources.js` script creates sample FHIR resources in the HAPI FHIR server, including patients, practitioners, observations, and more. This is useful for testing and development purposes.

```bash
# Run the seeding script
node scripts/seed-fhir-resources.js
```

### FHIR Resource Verification

The `scripts/verify-fhir-resources.js` script verifies that the FHIR resources exist in the server by retrieving each resource and checking its basic properties.

```bash
# Run the verification script
node scripts/verify-fhir-resources.js
```

### FHIR Resource Search

The `scripts/search-fhir-resources.js` script demonstrates how to search for FHIR resources using various search parameters.

```bash
# Search for patients with a specific family name
node scripts/search-fhir-resources.js Patient family=Smith

# Search for observations related to a specific patient
node scripts/search-fhir-resources.js Observation subject=Patient/patient-1
```

For detailed documentation on each script, see the [scripts/README.md](scripts/README.md) file.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Access to a running HAPI FHIR server
- Required npm packages: `axios`, `fs`, and `path`

### Configuration

The scripts use the following environment variables:

- `FHIR_SERVER_URL`: The URL of the HAPI FHIR server (default: `http://localhost:9090/fhir`)
- `ADMIN_TOKEN`: An optional authentication token for the FHIR server

### Running the Application

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure the environment variables as needed
4. Run the desired scripts

## Additional Resources

- [FHIR Documentation](https://www.hl7.org/fhir/)
- [HAPI FHIR Documentation](https://hapifhir.io/hapi-fhir/docs/)
- [HL7 FHIR Resource Definitions](https://www.hl7.org/fhir/resourcelist.html)
