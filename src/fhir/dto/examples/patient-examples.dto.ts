/**
 * Example Patient resource responses for Swagger documentation
 */

export const PatientExamples = {
    // Basic patient example
    basicPatient: {
        resourceType: 'Patient',
        id: 'example-patient-id',
        meta: {
            versionId: '1',
            lastUpdated: '2023-06-15T08:30:00.000Z'
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
        active: true,
        name: [
            {
                use: 'official',
                family: 'Doe',
                given: ['John']
            }
        ],
        telecom: [
            {
                system: 'phone',
                value: '555-123-4567',
                use: 'home'
            },
            {
                system: 'email',
                value: 'john.doe@example.com'
            }
        ],
        gender: 'male',
        birthDate: '1970-01-01',
        address: [
            {
                use: 'home',
                type: 'physical',
                line: ['123 Main St'],
                city: 'Anytown',
                state: 'CA',
                postalCode: '12345',
                country: 'USA'
            }
        ],
        contact: [
            {
                relationship: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                                code: 'N',
                                display: 'Next of Kin'
                            }
                        ]
                    }
                ],
                name: {
                    family: 'Doe',
                    given: ['Jane']
                },
                telecom: [
                    {
                        system: 'phone',
                        value: '555-987-6543'
                    }
                ]
            }
        ]
    },

    // Patient list example
    patientList: {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 2,
        link: [
            {
                relation: 'self',
                url: 'https://api.example.com/fhir/Patient?_count=2'
            },
            {
                relation: 'next',
                url: 'https://api.example.com/fhir/Patient?_count=2&_getpagesoffset=2'
            }
        ],
        entry: [
            {
                fullUrl: 'https://api.example.com/fhir/Patient/example-patient-id1',
                resource: {
                    resourceType: 'Patient',
                    id: 'example-patient-id1',
                    meta: {
                        versionId: '1',
                        lastUpdated: '2023-06-15T08:30:00.000Z'
                    },
                    name: [
                        {
                            family: 'Doe',
                            given: ['John']
                        }
                    ],
                    gender: 'male',
                    birthDate: '1970-01-01'
                }
            },
            {
                fullUrl: 'https://api.example.com/fhir/Patient/example-patient-id2',
                resource: {
                    resourceType: 'Patient',
                    id: 'example-patient-id2',
                    meta: {
                        versionId: '1',
                        lastUpdated: '2023-06-15T09:15:00.000Z'
                    },
                    name: [
                        {
                            family: 'Smith',
                            given: ['Jane']
                        }
                    ],
                    gender: 'female',
                    birthDate: '1985-03-22'
                }
            }
        ]
    },

    // Validation error example
    validationError: {
        resourceType: 'OperationOutcome',
        issue: [
            {
                severity: 'error',
                code: 'structure',
                diagnostics: 'Missing required field: gender',
                location: ['Patient.gender']
            },
            {
                severity: 'error',
                code: 'value',
                diagnostics: 'Invalid date format in birthDate',
                location: ['Patient.birthDate']
            }
        ]
    }
}; 