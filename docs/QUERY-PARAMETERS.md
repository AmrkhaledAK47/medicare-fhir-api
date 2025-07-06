# MediCare FHIR API Query Parameter System

This document provides detailed information about the query parameter system implemented in the MediCare FHIR API.

## Overview

The MediCare FHIR API implements a comprehensive query parameter transformation system that makes it easy to search for FHIR resources using a variety of parameter formats. The system automatically converts user-friendly parameter formats to FHIR-compliant formats behind the scenes, providing flexibility while maintaining FHIR compliance.

## Key Features

- **Flexible Parameter Naming**: Support for both hyphenated (`date-start`) and underscore (`date_start`) formats
- **Automatic Transformation**: Converts user parameters to FHIR-compliant search parameters
- **Smart Pagination**: Converts `page` and `_count` to HAPI FHIR's pagination system
- **Resource-Specific Parameters**: Specialized parameters for different resource types
- **URL Rewriting**: Rewrites pagination links to maintain API URL structure

## Parameter Types

### Common Parameters

| Parameter Type | Formats | Example |
|---------------|---------|---------|
| Pagination | `page`, `_count` | `?page=2&_count=20` |
| Sorting | `_sort`, `sort` + `sortDirection` | `?_sort=date` or `?sort=date&sortDirection=desc` |
| Date Filtering | Multiple formats supported | See Date Parameters section |

### Date Parameters

Date parameters can be specified in multiple formats:

1. **Standard FHIR format**: 
   - `?date=2023-01-01`
   - `?date=ge2023-01-01`
   - `?date=le2023-12-31`
   - `?date=ge2023-01-01,le2023-12-31`

2. **Range format using start/end**:
   - `?date-start=2023-01-01&date-end=2023-12-31`
   - `?date_start=2023-01-01&date_end=2023-12-31` (underscore version)

3. **Object format**:
   - `?dateRange[start]=2023-01-01&dateRange[end]=2023-12-31`

The system automatically converts all these formats to the appropriate FHIR search parameter format.

### Value Range Parameters

Value parameters can be specified in multiple formats:

1. **Standard FHIR format**:
   - `?value-quantity=ge100`
   - `?value-quantity=le200`
   - `?value-quantity=ge100,le200`

2. **Range format using min/max**:
   - `?value-min=100&value-max=200`
   - `?value_min=100&value_max=200` (underscore version)

3. **Operator format**:
   - `?value-operator=gt&value=100`
   - `?value_operator=lt&value=200`

Supported operators: `eq` (equals), `ne` (not equals), `gt` (greater than), `lt` (less than), `ge` (greater than or equal), `le` (less than or equal).

### Name Parameters

The system supports multiple formats for searching by name:

1. **Standard FHIR format**:
   - `?name=John` (searches all name parts)
   - `?given=John` (first/given name)
   - `?family=Smith` (last/family name)

2. **Alternative formats**:
   - `?firstName=John`
   - `?lastName=Smith`
   - `?first-name=John`
   - `?last-name=Smith`
   - `?fullName=John Smith`

## Resource-Specific Parameters

### Patient Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `gender` / `sex` | Patient gender | `?gender=male` |
| `birthdate` | Patient birthdate | `?birthdate=1970-01-01` |
| `address-city` | City in address | `?address-city=Boston` |
| `address-state` | State in address | `?address-state=MA` |
| `address-postalCode` | Postal code | `?address-postalCode=02108` |
| `mrn` | Medical Record Number | `?mrn=12345` |

### Observation Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `code` | Observation code | `?code=8480-6` |
| `category` | Observation category | `?category=vital-signs` |
| `component-code` | Code in component | `?component-code=8480-6` |
| `range-low` | Reference range lower bound | `?range-low=90` |
| `range-high` | Reference range upper bound | `?range-high=120` |

### Encounter Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `status` | Encounter status | `?status=in-progress` |
| `class` | Encounter class | `?class=ambulatory` |
| `length-min` | Minimum stay duration | `?length-min=2` |
| `length-max` | Maximum stay duration | `?length-max=5` |

### Medication Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `code` | Medication code | `?code=123456` |
| `system` | Code system | `?system=http://www.nlm.nih.gov/research/umls/rxnorm` |

## Pagination

The API supports two pagination methods:

1. **Page-based pagination**:
   - `?page=2&_count=20` (returns the second page with 20 items per page)

2. **Offset-based pagination** (HAPI FHIR native):
   - `?_getpagesoffset=20&_count=20` (skips first 20 results and returns 20 items)

The system automatically converts page-based parameters to offset-based parameters for HAPI FHIR compatibility, and converts back for pagination links.

## URL Rewriting

The system automatically rewrites URLs in FHIR Bundle links to ensure they point to the API endpoints rather than the internal HAPI FHIR server. For example:

- Original link: `http://hapi-fhir:8080/fhir/Patient?_getpagesoffset=20&_count=10`
- Rewritten link: `http://your-api.com/api/fhir/Patient?page=3&_count=10`

## Example Queries

### Patient Searches

```
# Find patients by name
GET /api/fhir/Patient?family=Smith

# Find male patients born after 1980
GET /api/fhir/Patient?gender=male&birthdate=gt1980-01-01

# Find patients in a specific city
GET /api/fhir/Patient?address-city=Boston

# Find patients with a specific medical record number
GET /api/fhir/Patient?mrn=12345
```

### Observation Searches

```
# Find vital sign observations for a patient in a date range
GET /api/fhir/Observation?subject=Patient/123&category=vital-signs&date-start=2023-01-01&date-end=2023-12-31

# Find blood pressure observations with systolic > 140
GET /api/fhir/Observation?code=85354-9&component-code=8480-6&value-operator=gt&value=140

# Find observations with abnormal values
GET /api/fhir/Observation?code=718-7&value-min=20&value-max=30
```

### Encounter Searches

```
# Find inpatient encounters
GET /api/fhir/Encounter?class=inpatient

# Find ongoing encounters
GET /api/fhir/Encounter?status=in-progress

# Find long-stay encounters
GET /api/fhir/Encounter?length-min=5
```

## Helper Endpoints

The API provides helpful endpoints for understanding and using the query parameter system:

### Query Parameter Guide

```
GET /api/fhir/help/query-guide
```

Returns detailed documentation about all supported query parameters and formats.

### Common Codes

```
GET /api/fhir/help/codes
```

Returns information about common FHIR codes used in the API, such as LOINC codes for observations and SNOMED CT codes for conditions.

## Best Practices

1. **Use the simplest format**: Use simple formats like `?date-start=2023-01-01` for better readability
2. **Be consistent**: Choose either hyphenated or underscore format and stick with it
3. **Include _count with page**: Always include `_count` when using `page` for consistent pagination
4. **Prefer standard formats**: Use standard FHIR parameter formats when possible

## Troubleshooting

If you're experiencing issues with query parameters, try these steps:

1. Check the parameter spelling and format
2. Use the `/api/fhir/help/query-guide` endpoint for reference
3. Start with simpler queries and add complexity gradually
4. Inspect the API logs for error messages related to parameter parsing

For additional help, please contact the API support team.

## References

- [FHIR Search](https://www.hl7.org/fhir/search.html) - Official FHIR search documentation
- [HAPI FHIR Search Parameters](https://hapifhir.io/hapi-fhir/docs/client/generic_client.html#search) - HAPI FHIR search parameter documentation 