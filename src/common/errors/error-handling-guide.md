# Error Handling Guidelines for MediCare API

This document outlines the error handling guidelines for the MediCare API, with a specific focus on the Dashboard API.

## General Principles

1. **Consistent Error Responses**: All API errors should follow a consistent format.
2. **Appropriate Status Codes**: Use the correct HTTP status codes for different types of errors.
3. **Correlation IDs**: Include correlation IDs in all error responses for traceability.
4. **Detailed Logging**: Log detailed error information for debugging, but return sanitized responses to clients.
5. **Graceful Degradation**: The Dashboard API should return partial results when possible, rather than failing completely.

## Error Response Format

All error responses should follow this JSON format:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "correlationId": "unique-correlation-id",
  "timestamp": "2023-08-01T12:34:56Z",
  "path": "/api/dashboard",
  "details": [] // Optional array of error details (omitted in production)
}
```

## HTTP Status Codes

| Status Code | Description | Example Scenario |
|-------------|-------------|-----------------|
| 400 | Bad Request | Invalid query parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User does not have required role or permissions |
| 404 | Not Found | Requested resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 502 | Bad Gateway | FHIR server is unavailable or returns an error |
| 500 | Internal Server Error | Unexpected server error |

## Error Types

### Authentication Errors

- Use 401 for missing or invalid tokens
- Use 403 for valid tokens with insufficient permissions
- Always include a clear message about what's missing

### Validation Errors

- Use 400 status code
- Include specific field errors when possible
- Provide clear guidance on how to fix the issue

### FHIR Service Errors

- Wrap in `DownstreamFhirException`
- Use 502 status code for FHIR service unavailability
- In production, use generic "Clinical service unavailable" message
- Log detailed FHIR error responses for debugging

### Partial Failures

The Dashboard API aggregates data from multiple sources. When one component fails:

1. Continue processing other components
2. Include successful components in the response
3. Add error information to the `errors` array in the response
4. Return HTTP 200 status code with partial results

Example of partial failure response:

```json
{
  "profile": { ... },
  "biomarkers": [ ... ],
  "appointments": null,
  "calendar": [ ... ],
  "quickActions": [ ... ],
  "errors": ["Failed to load appointments: Clinical service unavailable"]
}
```

## Correlation IDs

- Generate a unique correlation ID for each request if not provided
- Include the correlation ID in all logs and error responses
- Format: `dashboard-{timestamp}-{random-string}`
- Pass correlation IDs to downstream services via `X-Correlation-ID` header

## Logging Guidelines

- Log all errors with correlation IDs
- Include request path, method, and user information
- Log detailed error information for debugging
- Use structured logging (JSON format)
- Use appropriate log levels:
  - `error`: For exceptions and failures
  - `warn`: For partial failures and potential issues
  - `info`: For successful operations
  - `debug`: For detailed debugging information

## Metrics

- Record error counts by type and endpoint
- Track error rates over time
- Monitor downstream service failures
- Set up alerts for high error rates

## Implementation Examples

### Handling FHIR Service Errors

```typescript
try {
  const fhirData = await this.fhirService.getResource('Patient', id);
  // Process data
} catch (error) {
  this.logger.error(`Failed to fetch patient ${id}: ${error.message}`, {
    correlationId,
    error: error.stack
  });
  throw new DownstreamFhirException('Failed to fetch patient data', error);
}
```

### Handling Partial Failures

```typescript
const errors = [];
let biomarkers = null;

try {
  biomarkers = await this.biomarkerService.getBiomarkers(patientId);
} catch (error) {
  this.logger.error(`Failed to fetch biomarkers: ${error.message}`);
  errors.push('Failed to load biomarkers');
}

// Continue with other components...

return {
  biomarkers,
  // Other components...
  errors: errors.length > 0 ? errors : undefined
};
```

### Using Correlation IDs

```typescript
const correlationId = req.headers['x-correlation-id'] || 
  `dashboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

this.logger.log(`Processing request ${correlationId}`);

// Pass to downstream services
const options = {
  headers: { 'X-Correlation-ID': correlationId }
};
```

## Testing Error Handling

- Write unit tests for error handling logic
- Test partial failures with mocked service errors
- Verify error response format and status codes
- Test correlation ID propagation
- Simulate FHIR service failures 