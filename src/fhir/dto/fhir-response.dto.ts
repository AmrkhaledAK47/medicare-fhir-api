import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

/**
 * Base class for all FHIR resources
 */
export class FhirResourceDto {
    @ApiProperty({
        description: 'Type of the FHIR resource',
        example: 'Patient',
        required: true
    })
    resourceType: string;

    @ApiProperty({
        description: 'Logical identifier for this resource',
        example: 'f001',
        required: false
    })
    id?: string;

    @ApiProperty({
        description: 'Metadata about this resource',
        required: false,
        type: 'object',
        example: {
            versionId: '1',
            lastUpdated: '2023-06-15T10:15:30.000Z'
        }
    })
    meta?: {
        versionId?: string;
        lastUpdated?: string;
        source?: string;
        profile?: string[];
        security?: {
            system: string;
            code: string;
            display?: string;
        }[];
        tag?: {
            system: string;
            code: string;
            display?: string;
        }[];
    };

    @ApiProperty({
        description: 'A human-readable narrative',
        required: false,
        type: 'object',
        example: {
            status: 'generated',
            div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative content</div>'
        }
    })
    text?: {
        status: 'generated' | 'extensions' | 'additional' | 'empty';
        div: string;
    };

    [key: string]: any;
}

/**
 * Patient resource DTO
 */
export class PatientDto extends FhirResourceDto {
    @ApiProperty({
        description: 'Type of the FHIR resource',
        example: 'Patient',
        required: true
    })
    resourceType: string = 'Patient';

    @ApiProperty({
        description: 'Whether this patient record is in active use',
        example: true,
        required: false
    })
    active?: boolean;

    @ApiProperty({
        description: 'A name associated with the patient',
        required: false,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                use: { type: 'string', example: 'official' },
                family: { type: 'string', example: 'Smith' },
                given: { type: 'array', items: { type: 'string' }, example: ['John'] }
            }
        }
    })
    name?: {
        use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
        text?: string;
        family?: string;
        given?: string[];
        prefix?: string[];
        suffix?: string[];
        period?: {
            start?: string;
            end?: string;
        };
    }[];

    @ApiProperty({
        description: 'A contact detail for the patient',
        required: false,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                system: { type: 'string', example: 'phone' },
                value: { type: 'string', example: '555-123-4567' },
                use: { type: 'string', example: 'home' }
            }
        }
    })
    telecom?: {
        system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
        value?: string;
        use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
        rank?: number;
        period?: {
            start?: string;
            end?: string;
        };
    }[];

    @ApiProperty({
        description: 'Administrative Gender',
        example: 'male',
        enum: ['male', 'female', 'other', 'unknown'],
        required: false
    })
    gender?: 'male' | 'female' | 'other' | 'unknown';

    @ApiProperty({
        description: 'The date of birth for the patient',
        example: '1974-12-25',
        required: false
    })
    birthDate?: string;
}

/**
 * Observation resource DTO
 */
export class ObservationDto extends FhirResourceDto {
    @ApiProperty({
        description: 'Type of the FHIR resource',
        example: 'Observation',
        required: true
    })
    resourceType: string = 'Observation';

    @ApiProperty({
        description: 'The status of the observation',
        example: 'final',
        enum: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'],
        required: true
    })
    status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';

    @ApiProperty({
        description: 'Classification of the observation',
        required: false,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                coding: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            system: { type: 'string' },
                            code: { type: 'string' },
                            display: { type: 'string' }
                        }
                    }
                }
            }
        },
        example: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs'
            }]
        }]
    })
    category?: {
        coding?: {
            system?: string;
            code?: string;
            display?: string;
        }[];
        text?: string;
    }[];

    @ApiProperty({
        description: 'Type of observation',
        required: true,
        type: 'object',
        example: {
            coding: [{
                system: 'http://loinc.org',
                code: '8867-4',
                display: 'Heart rate'
            }],
            text: 'Heart rate'
        }
    })
    code: {
        coding?: {
            system?: string;
            code?: string;
            display?: string;
        }[];
        text?: string;
    };

    @ApiProperty({
        description: 'Who or what the observation is about',
        required: true,
        type: 'object',
        example: {
            reference: 'Patient/f001',
            display: 'John Smith'
        }
    })
    subject: {
        reference: string;
        display?: string;
    };

    @ApiProperty({
        description: 'The healthcare event during which this observation was made',
        required: false,
        type: 'object',
        example: {
            reference: 'Encounter/e001'
        }
    })
    encounter?: {
        reference: string;
        display?: string;
    };

    @ApiProperty({
        description: 'The time or time-period the observed value was obtained',
        required: false,
        example: '2023-06-15T10:30:00Z'
    })
    effectiveDateTime?: string;

    @ApiProperty({
        description: 'The result value, if the value is a quantity',
        required: false,
        type: 'object',
        example: {
            value: 80,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min'
        }
    })
    valueQuantity?: {
        value?: number;
        unit?: string;
        system?: string;
        code?: string;
    };
}

/**
 * FHIR Bundle DTO
 */
export class FhirBundleDto {
    @ApiProperty({
        description: 'Type of the FHIR resource',
        example: 'Bundle',
        required: true
    })
    resourceType: string = 'Bundle';

    @ApiProperty({
        description: 'Type of bundle (document, message, transaction, etc.)',
        example: 'searchset',
        required: true
    })
    type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';

    @ApiProperty({
        description: 'Total number of matches',
        example: 15,
        required: false
    })
    total?: number;

    @ApiProperty({
        description: 'Links for pagination or related resources',
        required: false,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                relation: { type: 'string', example: 'self' },
                url: { type: 'string', example: 'http://example.org/fhir/Patient?_count=10' }
            }
        }
    })
    link?: {
        relation: string;
        url: string;
    }[];

    @ApiProperty({
        description: 'Entries in the bundle',
        required: false,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                fullUrl: { type: 'string' },
                resource: { type: 'object' },
                search: {
                    type: 'object',
                    properties: {
                        mode: { type: 'string' },
                        score: { type: 'number' }
                    }
                }
            }
        }
    })
    entry?: {
        fullUrl?: string;
        resource?: FhirResourceDto;
        search?: {
            mode?: 'match' | 'include' | 'outcome';
            score?: number;
        };
        request?: {
            method: string;
            url: string;
        };
        response?: {
            status: string;
            location?: string;
            etag?: string;
            lastModified?: string;
        };
    }[];
}

/**
 * FHIR OperationOutcome DTO for errors and operation results
 */
export class OperationOutcomeDto {
    @ApiProperty({
        description: 'Type of the FHIR resource',
        example: 'OperationOutcome',
        required: true
    })
    resourceType: string = 'OperationOutcome';

    @ApiProperty({
        description: 'Issue details',
        required: true,
        type: 'array',
        items: {
            type: 'object',
            properties: {
                severity: {
                    type: 'string',
                    enum: ['fatal', 'error', 'warning', 'information'],
                    example: 'error'
                },
                code: { type: 'string', example: 'processing' },
                diagnostics: { type: 'string', example: 'The operation failed because of an internal server error' },
                location: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Patient.name[0].given[0]']
                }
            }
        }
    })
    issue: {
        severity: 'fatal' | 'error' | 'warning' | 'information';
        code: string;
        details?: {
            text?: string;
            coding?: {
                system?: string;
                code?: string;
                display?: string;
            }[];
        };
        diagnostics?: string;
        location?: string[];
        expression?: string[];
    }[];
} 