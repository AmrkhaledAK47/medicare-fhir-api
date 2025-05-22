import { Controller, Get, Res, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('documentation')
@Controller('fhir/documentation')
export class DocumentationController {
    private examples: Record<string, any> = {};

    constructor(private readonly configService: ConfigService) {
        this.loadExamples();
    }

    /**
     * Load example FHIR resources
     */
    private loadExamples() {
        try {
            // Define the common FHIR resource types
            const resourceTypes = [
                'Patient',
                'Practitioner',
                'Encounter',
                'Observation',
                'Condition',
                'Procedure',
                'MedicationRequest',
                'DiagnosticReport'
            ];

            // Create example resources
            this.examples = {
                Patient: {
                    resourceType: 'Patient',
                    id: 'example',
                    meta: {
                        versionId: '1',
                        lastUpdated: new Date().toISOString()
                    },
                    text: {
                        status: 'generated',
                        div: '<div xmlns="http://www.w3.org/1999/xhtml">John Doe</div>'
                    },
                    identifier: [
                        {
                            system: 'urn:oid:1.2.36.146.595.217.0.1',
                            value: '12345'
                        }
                    ],
                    name: [
                        {
                            use: 'official',
                            family: 'Doe',
                            given: ['John']
                        }
                    ],
                    gender: 'male',
                    birthDate: '1970-01-01',
                    address: [
                        {
                            use: 'home',
                            line: ['123 Main St'],
                            city: 'Anytown',
                            state: 'CA',
                            postalCode: '12345',
                            country: 'USA'
                        }
                    ]
                },
                Practitioner: {
                    resourceType: 'Practitioner',
                    id: 'example',
                    meta: {
                        versionId: '1',
                        lastUpdated: new Date().toISOString()
                    },
                    identifier: [
                        {
                            system: 'http://hl7.org/fhir/sid/us-npi',
                            value: '9941339108'
                        }
                    ],
                    name: [
                        {
                            use: 'official',
                            family: 'Smith',
                            given: ['Jane'],
                            prefix: ['Dr']
                        }
                    ],
                    telecom: [
                        {
                            system: 'phone',
                            value: '555-123-4567',
                            use: 'work'
                        }
                    ],
                    gender: 'female',
                    birthDate: '1980-01-01',
                    qualification: [
                        {
                            code: {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                                        code: 'MD',
                                        display: 'Doctor of Medicine'
                                    }
                                ]
                            }
                        }
                    ]
                },
                Observation: {
                    resourceType: 'Observation',
                    id: 'example',
                    meta: {
                        versionId: '1',
                        lastUpdated: new Date().toISOString()
                    },
                    status: 'final',
                    category: [
                        {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                    code: 'vital-signs',
                                    display: 'Vital Signs'
                                }
                            ]
                        }
                    ],
                    code: {
                        coding: [
                            {
                                system: 'http://loinc.org',
                                code: '8867-4',
                                display: 'Heart rate'
                            }
                        ],
                        text: 'Heart rate'
                    },
                    subject: {
                        reference: 'Patient/example'
                    },
                    effectiveDateTime: new Date().toISOString(),
                    valueQuantity: {
                        value: 80,
                        unit: 'beats/minute',
                        system: 'http://unitsofmeasure.org',
                        code: '/min'
                    }
                }
            };

            // Add more examples for other resource types
            resourceTypes.forEach(type => {
                if (!this.examples[type]) {
                    this.examples[type] = {
                        resourceType: type,
                        id: 'example',
                        meta: {
                            versionId: '1',
                            lastUpdated: new Date().toISOString()
                        }
                    };
                }
            });

        } catch (error) {
            console.error('Error loading example resources:', error);
        }
    }

    /**
     * Get API overview documentation
     */
    @Get()
    @ApiOperation({ summary: 'Get API documentation overview' })
    @ApiResponse({ status: 200, description: 'Documentation retrieved successfully' })
    getDocumentation(): any {
        return {
            resourceType: 'CapabilityStatement',
            status: 'active',
            date: new Date().toISOString(),
            kind: 'instance',
            software: {
                name: 'MediCare FHIR API',
                version: '1.0.0'
            },
            implementation: {
                description: 'MediCare FHIR API Implementation',
                url: this.configService.get<string>('app.baseUrl') || 'http://localhost:3000/fhir'
            },
            fhirVersion: '4.0.1',
            format: ['json'],
            rest: [
                {
                    mode: 'server',
                    security: {
                        cors: true,
                        service: [
                            {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                                        code: 'OAuth',
                                        display: 'OAuth'
                                    }
                                ]
                            }
                        ]
                    },
                    resource: [
                        {
                            type: 'Patient',
                            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
                            interaction: [
                                { code: 'read' },
                                { code: 'vread' },
                                { code: 'update' },
                                { code: 'delete' },
                                { code: 'history-instance' },
                                { code: 'create' },
                                { code: 'search-type' }
                            ],
                            operation: [
                                {
                                    name: 'everything',
                                    definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything'
                                }
                            ]
                        },
                        {
                            type: 'Practitioner',
                            profile: 'http://hl7.org/fhir/StructureDefinition/Practitioner',
                            interaction: [
                                { code: 'read' },
                                { code: 'vread' },
                                { code: 'update' },
                                { code: 'delete' },
                                { code: 'history-instance' },
                                { code: 'create' },
                                { code: 'search-type' }
                            ]
                        },
                        {
                            type: 'Observation',
                            profile: 'http://hl7.org/fhir/StructureDefinition/Observation',
                            interaction: [
                                { code: 'read' },
                                { code: 'vread' },
                                { code: 'update' },
                                { code: 'delete' },
                                { code: 'history-instance' },
                                { code: 'create' },
                                { code: 'search-type' }
                            ]
                        }
                    ],
                    operation: [
                        {
                            name: 'validate',
                            definition: 'http://hl7.org/fhir/OperationDefinition/Resource-validate'
                        },
                        {
                            name: 'validate-code',
                            definition: 'http://hl7.org/fhir/OperationDefinition/ValueSet-validate-code'
                        },
                        {
                            name: 'expand',
                            definition: 'http://hl7.org/fhir/OperationDefinition/ValueSet-expand'
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Get example resource by type
     */
    @Get('examples/:resourceType')
    @ApiOperation({ summary: 'Get example FHIR resource by type' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiResponse({ status: 200, description: 'Example resource retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Example resource not found' })
    getExample(@Param('resourceType') resourceType: string, @Res() res: Response): any {
        if (this.examples[resourceType]) {
            return res.json(this.examples[resourceType]);
        }

        return res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [
                {
                    severity: 'error',
                    code: 'not-found',
                    diagnostics: `No example found for resource type: ${resourceType}`
                }
            ]
        });
    }

    /**
     * Get documentation for custom operations
     */
    @Get('operations')
    @ApiOperation({ summary: 'Get documentation for custom operations' })
    @ApiResponse({ status: 200, description: 'Operations documentation retrieved successfully' })
    getOperations(): any {
        return {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'OperationDefinition',
                        id: 'Patient-everything',
                        name: 'everything',
                        status: 'active',
                        kind: 'operation',
                        description: 'Get all data for a patient',
                        affectsState: false,
                        code: 'everything',
                        resource: ['Patient'],
                        system: false,
                        type: false,
                        instance: true,
                        parameter: [
                            {
                                name: 'id',
                                use: 'in',
                                min: 1,
                                max: '1',
                                type: 'string',
                                documentation: 'Patient ID'
                            }
                        ]
                    }
                },
                {
                    resource: {
                        resourceType: 'OperationDefinition',
                        id: 'validate',
                        name: 'validate',
                        status: 'active',
                        kind: 'operation',
                        description: 'Validate a resource against FHIR specifications',
                        affectsState: false,
                        code: 'validate',
                        resource: ['*'],
                        system: false,
                        type: true,
                        instance: true,
                        parameter: [
                            {
                                name: 'resource',
                                use: 'in',
                                min: 1,
                                max: '1',
                                type: 'Resource',
                                documentation: 'Resource to validate'
                            }
                        ]
                    }
                },
                {
                    resource: {
                        resourceType: 'OperationDefinition',
                        id: 'expand',
                        name: 'expand',
                        status: 'active',
                        kind: 'operation',
                        description: 'Expand a value set',
                        affectsState: false,
                        code: 'expand',
                        resource: ['ValueSet'],
                        system: false,
                        type: true,
                        instance: false,
                        parameter: [
                            {
                                name: 'url',
                                use: 'in',
                                min: 1,
                                max: '1',
                                type: 'uri',
                                documentation: 'The value set URL to expand'
                            },
                            {
                                name: 'filter',
                                use: 'in',
                                min: 0,
                                max: '1',
                                type: 'string',
                                documentation: 'Filter for expansion'
                            }
                        ]
                    }
                }
            ]
        };
    }

    /**
     * Get API usage examples
     */
    @Get('usage')
    @ApiOperation({ summary: 'Get API usage examples' })
    @ApiResponse({ status: 200, description: 'Usage examples retrieved successfully' })
    getUsageExamples(): any {
        return {
            basicUsage: {
                title: 'Basic API Usage',
                description: 'Examples of basic CRUD operations',
                examples: [
                    {
                        title: 'Create a new patient',
                        httpMethod: 'POST',
                        endpoint: '/fhir/Patient',
                        headers: {
                            'Content-Type': 'application/fhir+json',
                            'Authorization': 'Bearer {token}'
                        },
                        requestBody: {
                            resourceType: 'Patient',
                            name: [
                                {
                                    use: 'official',
                                    family: 'Doe',
                                    given: ['John']
                                }
                            ],
                            gender: 'male',
                            birthDate: '1970-01-01'
                        },
                        responseStatus: 201,
                        responseBody: {
                            resourceType: 'Patient',
                            id: 'example-id',
                            meta: {
                                versionId: '1',
                                lastUpdated: '2023-01-01T12:00:00Z'
                            },
                            name: [
                                {
                                    use: 'official',
                                    family: 'Doe',
                                    given: ['John']
                                }
                            ],
                            gender: 'male',
                            birthDate: '1970-01-01'
                        }
                    },
                    {
                        title: 'Retrieve a patient by ID',
                        httpMethod: 'GET',
                        endpoint: '/fhir/Patient/{id}',
                        headers: {
                            'Accept': 'application/fhir+json',
                            'Authorization': 'Bearer {token}'
                        },
                        responseStatus: 200,
                        responseBody: {
                            resourceType: 'Patient',
                            id: 'example-id',
                            meta: {
                                versionId: '1',
                                lastUpdated: '2023-01-01T12:00:00Z'
                            },
                            name: [
                                {
                                    use: 'official',
                                    family: 'Doe',
                                    given: ['John']
                                }
                            ],
                            gender: 'male',
                            birthDate: '1970-01-01'
                        }
                    }
                ]
            },
            advancedUsage: {
                title: 'Advanced API Usage',
                description: 'Examples of advanced operations',
                examples: [
                    {
                        title: 'Validate a resource',
                        httpMethod: 'POST',
                        endpoint: '/fhir/Patient/$validate',
                        headers: {
                            'Content-Type': 'application/fhir+json',
                            'Authorization': 'Bearer {token}'
                        },
                        requestBody: {
                            resourceType: 'Patient',
                            name: [
                                {
                                    use: 'official',
                                    family: 'Doe',
                                    given: ['John']
                                }
                            ],
                            gender: 'male',
                            birthDate: '1970-01-01'
                        },
                        responseStatus: 200,
                        responseBody: {
                            resourceType: 'OperationOutcome',
                            issue: [
                                {
                                    severity: 'information',
                                    code: 'informational',
                                    diagnostics: 'All OK'
                                }
                            ]
                        }
                    },
                    {
                        title: 'Expand a value set',
                        httpMethod: 'GET',
                        endpoint: '/fhir/terminology/expand?url=http://hl7.org/fhir/ValueSet/administrative-gender',
                        headers: {
                            'Accept': 'application/fhir+json',
                            'Authorization': 'Bearer {token}'
                        },
                        responseStatus: 200,
                        responseBody: {
                            resourceType: 'ValueSet',
                            expansion: {
                                timestamp: '2023-01-01T12:00:00Z',
                                contains: [
                                    {
                                        system: 'http://hl7.org/fhir/administrative-gender',
                                        code: 'male',
                                        display: 'Male'
                                    },
                                    {
                                        system: 'http://hl7.org/fhir/administrative-gender',
                                        code: 'female',
                                        display: 'Female'
                                    },
                                    {
                                        system: 'http://hl7.org/fhir/administrative-gender',
                                        code: 'other',
                                        display: 'Other'
                                    },
                                    {
                                        system: 'http://hl7.org/fhir/administrative-gender',
                                        code: 'unknown',
                                        display: 'Unknown'
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        };
    }
} 