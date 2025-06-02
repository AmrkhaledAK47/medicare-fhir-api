import { PatientExamples } from './patient-examples.dto';
import { ObservationExamples } from './observation-examples.dto';

/**
 * Collection of FHIR resource examples for Swagger documentation
 */
export const FhirExamples = {
    Patient: PatientExamples,
    Observation: ObservationExamples
};

/**
 * Utility function to create Swagger example schemas
 * @param examples Object containing example data
 * @returns Swagger schema examples
 */
export function createExampleSchemas(examples: Record<string, any>) {
    const schemas: Record<string, any> = {};

    for (const [key, value] of Object.entries(examples)) {
        schemas[key] = {
            value: value
        };
    }

    return schemas;
}

/**
 * Get resource example for a specific type and scenario
 * @param resourceType FHIR resource type
 * @param exampleType Example scenario
 * @returns Example data
 */
export function getResourceExample(resourceType: string, exampleType: string): any {
    if (!FhirExamples[resourceType] || !FhirExamples[resourceType][exampleType]) {
        return {
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'not-found',
                diagnostics: `Example ${exampleType} for ${resourceType} not found`
            }]
        };
    }

    return FhirExamples[resourceType][exampleType];
}

/**
 * Creates Swagger response examples for a FHIR resource
 * @param resourceType FHIR resource type
 * @param exampleType Example scenario
 * @returns Swagger example schema
 */
export function createFhirResponseExample(resourceType: string, exampleType: string) {
    const example = getResourceExample(resourceType, exampleType);

    // Return a schema object compatible with NestJS Swagger v7.x
    return {
        type: 'object',
        example: example,
        examples: {
            [exampleType]: {
                value: example
            }
        }
    };
}

/**
 * Get common error responses with examples for FHIR API endpoints
 */
export function getCommonFhirErrorResponses() {
    return {
        401: {
            description: 'Unauthorized - Authentication required',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' },
                    error: { type: 'string', example: 'Unauthorized' }
                }
            }
        },
        403: {
            description: 'Forbidden - Insufficient permissions to access resource',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 403 },
                    message: { type: 'string', example: 'Forbidden' },
                    error: { type: 'string', example: 'Insufficient permissions to access this resource' }
                }
            }
        },
        404: {
            description: 'Not Found - Resource does not exist',
            schema: {
                type: 'object',
                properties: {
                    resourceType: { type: 'string', example: 'OperationOutcome' },
                    issue: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                severity: { type: 'string', example: 'error' },
                                code: { type: 'string', example: 'not-found' },
                                diagnostics: { type: 'string', example: 'Resource Patient/123 not found' }
                            }
                        }
                    }
                }
            }
        },
        422: {
            description: 'Unprocessable Entity - Validation error',
            schema: {
                type: 'object',
                properties: {
                    resourceType: { type: 'string', example: 'OperationOutcome' },
                    issue: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                severity: { type: 'string', example: 'error' },
                                code: { type: 'string', example: 'invalid' },
                                diagnostics: { type: 'string', example: 'Invalid input' },
                                location: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    example: ['Patient.gender']
                                }
                            }
                        }
                    }
                }
            }
        }
    };
} 