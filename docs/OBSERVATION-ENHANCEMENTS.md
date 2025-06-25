# Observation Controller Enhancements

This document outlines the enhancements made to the Observation controller in the MediCare FHIR API.

## Overview

The Observation controller has been enhanced with advanced filtering capabilities to support more complex queries, including:

1. Component code searches
2. Value range searches
3. Chained parameters
4. Custom endpoints for specific use cases
5. Composite search parameters
6. Reference range searches
7. Reverse chaining with _has parameter

## Key Enhancements

### 1. Advanced Query Parameter Handling

The `transformQueryParams` method in the Observation controller has been enhanced to support:

- **Component Code Searches**: Filter observations by component code (e.g., systolic blood pressure component in a blood pressure panel)
- **Value Range Searches**: Filter observations by value range (e.g., observations with values between 100 and 200)
- **Data Absent Reason Searches**: Filter observations by data absent reason
- **Reference Range Searches**: Filter observations by reference range
- **Derived-From Searches**: Filter observations derived from other observations
- **Has-Member Searches**: Filter panel observations
- **Composite Search Parameters**: Combine multiple search criteria (e.g., component code and value)
- **Reverse Chaining**: Find resources that reference specific observations

### 2. Chained Parameter Support

Added support for chained parameters to enable more complex queries:

- **Patient Chained Parameters**: Filter observations by patient attributes (e.g., `patient.identifier=12345`)
- **Performer Chained Parameters**: Filter observations by performer attributes (e.g., `performer.identifier=67890`)
- **Reverse Chained Parameters**: Find observations referenced by other resources (using `_has` parameter)

### 3. Custom Endpoints

Added custom endpoints for specific use cases:

- **$by-code**: Search observations by code with optional system parameter
- **$by-component**: Search observations by component code
- **$by-value-range**: Search observations by value range with specified code
- **$by-component-value**: Search observations by component code and value (composite search)
- **$by-reference-range**: Search observations by reference range values
- **patient/:patientId**: Get observations for a specific patient
- **patient/:patientId/vitals**: Get vital signs for a specific patient
- **patient/:patientId/labs**: Get lab results for a specific patient
- **patient/:patientId/latest**: Get the latest observation of a specific type for a patient

### 4. Improved Documentation

Added Swagger documentation for all endpoints and parameters:

- **@ApiQuery** decorators for all query parameters
- **@ApiParam** decorators for all path parameters
- **@ApiResponse** decorators for all response types
- **@ApiOperation** decorators with detailed summaries

## Usage Examples

### Basic Search

```bash
# Get all observations
curl -s "http://localhost:3000/api/fhir/Observation" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations for a specific patient
curl -s "http://localhost:3000/api/fhir/Observation?subject=Patient/1" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations by category
curl -s "http://localhost:3000/api/fhir/Observation?category=vital-signs" -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Advanced Search

```bash
# Search by component code
curl -s "http://localhost:3000/api/fhir/Observation?component-code=8480-6" -H "Authorization: Bearer $TOKEN" | jq '.'

# Search by value range
curl -s "http://localhost:3000/api/fhir/Observation?value-min=100&value-max=200" -H "Authorization: Bearer $TOKEN" | jq '.'

# Search with chained parameters
curl -s "http://localhost:3000/api/fhir/Observation?patient.identifier=12345" -H "Authorization: Bearer $TOKEN" | jq '.'

# Search with composite parameters
curl -s "http://localhost:3000/api/fhir/Observation?component-code-value-quantity=8480-6$ge120" -H "Authorization: Bearer $TOKEN" | jq '.'

# Search with reference range
curl -s "http://localhost:3000/api/fhir/Observation?reference-range-high=200" -H "Authorization: Bearer $TOKEN" | jq '.'

# Search with reverse chaining
curl -s "http://localhost:3000/api/fhir/Observation?_has:DiagnosticReport:result:code=2093-3" -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Custom Endpoints

```bash
# Get observations by code
curl -s "http://localhost:3000/api/fhir/Observation/$by-code?code=85354-9&system=http://loinc.org" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations by component
curl -s "http://localhost:3000/api/fhir/Observation/$by-component?component-code=8480-6" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations by value range
curl -s "http://localhost:3000/api/fhir/Observation/$by-value-range?code=2093-3&value-min=150&value-max=200" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations by component code and value (composite search)
curl -s "http://localhost:3000/api/fhir/Observation/$by-component-value?component-code=8480-6&value-operator=ge&value=120" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get observations by reference range
curl -s "http://localhost:3000/api/fhir/Observation/$by-reference-range?code=2093-3&range-low=0&range-high=200" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get patient vital signs
curl -s "http://localhost:3000/api/fhir/Observation/patient/1/vitals" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get patient lab results
curl -s "http://localhost:3000/api/fhir/Observation/patient/1/labs" -H "Authorization: Bearer $TOKEN" | jq '.'

# Get latest observation of a specific type
curl -s "http://localhost:3000/api/fhir/Observation/patient/1/latest?code=85354-9" -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Implementation Details

The enhancements were implemented by:

1. Adding new methods to the Observation controller for custom endpoints
2. Enhancing the `transformQueryParams` method to handle advanced search parameters
3. Adding Swagger documentation for all endpoints and parameters
4. Creating test scripts to verify the functionality

### Composite Search Parameters

Composite search parameters allow searching for observations that match multiple criteria simultaneously. For example, finding all observations with a specific component code and value:

```
component-code-value-quantity=8480-6$ge120
```

This searches for observations with component code 8480-6 (systolic blood pressure) and a value greater than or equal to 120.

The format for composite search parameters is:
```
[parameter1]$[operator][value]
```

Where:
- `parameter1` is the first parameter (e.g., component-code)
- `operator` is one of: eq, ne, gt, lt, ge, le
- `value` is the value to compare against

### Reference Range Searches

Reference range searches allow finding observations with specific reference ranges. This is useful for identifying observations that are within or outside normal ranges:

```
reference-range-low=0&reference-range-high=200
```

This searches for observations with a reference range between 0 and 200.

### Reverse Chaining with _has

The `_has` parameter allows for reverse chaining, finding observations that are referenced by other resources. For example:

```
_has:DiagnosticReport:result:code=2093-3
```

This finds observations that are referenced by DiagnosticReports with code 2093-3.

## Testing

A comprehensive test script (`test/observation-api-test.sh`) has been created to test all the enhanced functionality of the Observation controller.

## Next Steps

1. Add support for more complex chained parameters (e.g., `subject:Patient.name.given=John`)
2. Implement support for additional composite search parameters
3. Add support for `_revinclude` to include resources that reference the observation
4. Implement support for `_elements` to return only specific elements
5. Add support for `_contained` and `_containedType` parameters
6. Enhance error handling for invalid search parameters
7. Add caching for frequently used search queries 