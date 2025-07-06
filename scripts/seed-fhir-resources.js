#!/usr/bin/env node

/**
 * Seed FHIR Resources Script
 * 
 * This script creates sample FHIR resources in the HAPI FHIR server.
 * It creates a transaction bundle with multiple resources and sends it to the server.
 * 
 * Usage:
 * node seed-fhir-resources.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:9090/fhir';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function seedFhirResources() {
    console.log('Starting FHIR resource seeding...');
    console.log(`FHIR Server URL: ${FHIR_SERVER_URL}`);

    try {
        // Create a transaction bundle with multiple resources
        const bundle = {
            resourceType: 'Bundle',
            type: 'transaction',
            entry: [
                // 1. Patient 1
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'patient-1',
                        active: true,
                        name: [
                            {
                                use: 'official',
                                family: 'Smith',
                                given: ['John']
                            }
                        ],
                        gender: 'male',
                        birthDate: '1980-06-15',
                        address: [
                            {
                                use: 'home',
                                type: 'physical',
                                line: ['123 Main St'],
                                city: 'Springfield',
                                state: 'IL',
                                postalCode: '62701'
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
                                value: 'john.smith@example.com',
                                use: 'work'
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Patient/patient-1'
                    }
                },

                // 2. Patient 2
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'patient-2',
                        active: true,
                        name: [
                            {
                                use: 'official',
                                family: 'Johnson',
                                given: ['Sarah']
                            }
                        ],
                        gender: 'female',
                        birthDate: '1992-09-21',
                        address: [
                            {
                                use: 'home',
                                type: 'physical',
                                line: ['456 Oak Avenue'],
                                city: 'Riverdale',
                                state: 'NY',
                                postalCode: '10471'
                            }
                        ],
                        telecom: [
                            {
                                system: 'phone',
                                value: '555-987-6543',
                                use: 'mobile'
                            },
                            {
                                system: 'email',
                                value: 'sarah.johnson@example.com',
                                use: 'work'
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Patient/patient-2'
                    }
                },

                // 3. Practitioner 1
                {
                    resource: {
                        resourceType: 'Practitioner',
                        id: 'practitioner-1',
                        active: true,
                        name: [
                            {
                                use: 'official',
                                family: 'Miller',
                                given: ['Robert'],
                                prefix: ['Dr']
                            }
                        ],
                        gender: 'male',
                        birthDate: '1975-03-15',
                        telecom: [
                            {
                                system: 'phone',
                                value: '555-123-9876',
                                use: 'work'
                            },
                            {
                                system: 'email',
                                value: 'robert.miller@example.com',
                                use: 'work'
                            }
                        ],
                        qualification: [
                            {
                                code: {
                                    coding: [
                                        {
                                            system: 'http://terminology.hl7.org/CodeSystem/v2-0360/2.7',
                                            code: 'MD',
                                            display: 'Doctor of Medicine'
                                        }
                                    ],
                                    text: 'Doctor of Medicine'
                                },
                                period: {
                                    start: '2000-01-01'
                                }
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Practitioner/practitioner-1'
                    }
                },

                // 4. Practitioner 2
                {
                    resource: {
                        resourceType: 'Practitioner',
                        id: 'practitioner-2',
                        active: true,
                        name: [
                            {
                                use: 'official',
                                family: 'Wilson',
                                given: ['Jennifer'],
                                prefix: ['Dr']
                            }
                        ],
                        gender: 'female',
                        birthDate: '1982-07-24',
                        telecom: [
                            {
                                system: 'phone',
                                value: '555-555-1234',
                                use: 'work'
                            },
                            {
                                system: 'email',
                                value: 'jennifer.wilson@example.com',
                                use: 'work'
                            }
                        ],
                        qualification: [
                            {
                                code: {
                                    coding: [
                                        {
                                            system: 'http://terminology.hl7.org/CodeSystem/v2-0360/2.7',
                                            code: 'MD',
                                            display: 'Doctor of Medicine'
                                        }
                                    ],
                                    text: 'Doctor of Medicine'
                                },
                                period: {
                                    start: '2008-05-12'
                                }
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Practitioner/practitioner-2'
                    }
                },

                // 5. Organization
                {
                    resource: {
                        resourceType: 'Organization',
                        id: 'organization-1',
                        active: true,
                        name: 'General Hospital',
                        telecom: [
                            {
                                system: 'phone',
                                value: '555-333-4444',
                                use: 'work'
                            },
                            {
                                system: 'email',
                                value: 'info@generalhospital.example.com',
                                use: 'work'
                            }
                        ],
                        address: [
                            {
                                use: 'work',
                                type: 'both',
                                line: ['123 Hospital Drive'],
                                city: 'Springfield',
                                state: 'IL',
                                postalCode: '62701'
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Organization/organization-1'
                    }
                },

                // 6. Encounter
                {
                    resource: {
                        resourceType: 'Encounter',
                        id: 'encounter-1',
                        status: 'finished',
                        class: {
                            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                            code: 'AMB',
                            display: 'ambulatory'
                        },
                        subject: {
                            reference: 'Patient/patient-1',
                            display: 'John Smith'
                        },
                        participant: [
                            {
                                individual: {
                                    reference: 'Practitioner/practitioner-1',
                                    display: 'Dr. Robert Miller'
                                }
                            }
                        ],
                        period: {
                            start: '2023-06-15T09:00:00Z',
                            end: '2023-06-15T09:30:00Z'
                        },
                        reasonCode: [
                            {
                                coding: [
                                    {
                                        system: 'http://snomed.info/sct',
                                        code: '386661006',
                                        display: 'Fever'
                                    }
                                ],
                                text: 'Fever'
                            }
                        ],
                        serviceProvider: {
                            reference: 'Organization/organization-1',
                            display: 'General Hospital'
                        }
                    },
                    request: {
                        method: 'PUT',
                        url: 'Encounter/encounter-1'
                    }
                },

                // 7. Observation - Lab Test
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'observation-1',
                        status: 'final',
                        category: [
                            {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                        code: 'laboratory',
                                        display: 'Laboratory'
                                    }
                                ]
                            }
                        ],
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '718-7',
                                    display: 'Hemoglobin [Mass/volume] in Blood'
                                }
                            ],
                            text: 'Hemoglobin'
                        },
                        subject: {
                            reference: 'Patient/patient-1',
                            display: 'John Smith'
                        },
                        encounter: {
                            reference: 'Encounter/encounter-1'
                        },
                        effectiveDateTime: '2023-06-15T10:00:00Z',
                        issued: '2023-06-15T10:30:00Z',
                        performer: [
                            {
                                reference: 'Practitioner/practitioner-1',
                                display: 'Dr. Robert Miller'
                            }
                        ],
                        valueQuantity: {
                            value: 14.5,
                            unit: 'g/dL',
                            system: 'http://unitsofmeasure.org',
                            code: 'g/dL'
                        },
                        interpretation: [
                            {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                                        code: 'N',
                                        display: 'Normal'
                                    }
                                ],
                                text: 'Normal'
                            }
                        ],
                        referenceRange: [
                            {
                                low: {
                                    value: 13.0,
                                    unit: 'g/dL',
                                    system: 'http://unitsofmeasure.org',
                                    code: 'g/dL'
                                },
                                high: {
                                    value: 17.0,
                                    unit: 'g/dL',
                                    system: 'http://unitsofmeasure.org',
                                    code: 'g/dL'
                                },
                                type: {
                                    coding: [
                                        {
                                            system: 'http://terminology.hl7.org/CodeSystem/referencerange-meaning',
                                            code: 'normal',
                                            display: 'Normal Range'
                                        }
                                    ],
                                    text: 'Normal Range'
                                }
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Observation/observation-1'
                    }
                },

                // 8. Observation - Vital Sign
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'observation-2',
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
                            reference: 'Patient/patient-1',
                            display: 'John Smith'
                        },
                        encounter: {
                            reference: 'Encounter/encounter-1'
                        },
                        effectiveDateTime: '2023-06-15T09:05:00Z',
                        issued: '2023-06-15T09:10:00Z',
                        performer: [
                            {
                                reference: 'Practitioner/practitioner-1',
                                display: 'Dr. Robert Miller'
                            }
                        ],
                        valueQuantity: {
                            value: 72,
                            unit: 'beats/minute',
                            system: 'http://unitsofmeasure.org',
                            code: '/min'
                        },
                        interpretation: [
                            {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                                        code: 'N',
                                        display: 'Normal'
                                    }
                                ],
                                text: 'Normal'
                            }
                        ],
                        referenceRange: [
                            {
                                low: {
                                    value: 60,
                                    unit: 'beats/minute',
                                    system: 'http://unitsofmeasure.org',
                                    code: '/min'
                                },
                                high: {
                                    value: 100,
                                    unit: 'beats/minute',
                                    system: 'http://unitsofmeasure.org',
                                    code: '/min'
                                }
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Observation/observation-2'
                    }
                },

                // 9. Diagnostic Report
                {
                    resource: {
                        resourceType: 'DiagnosticReport',
                        id: 'diagnostic-report-1',
                        status: 'final',
                        category: [
                            {
                                coding: [
                                    {
                                        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                                        code: 'LAB',
                                        display: 'Laboratory'
                                    }
                                ]
                            }
                        ],
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '58410-2',
                                    display: 'Complete blood count (hemogram) panel - Blood by Automated count'
                                }
                            ],
                            text: 'CBC'
                        },
                        subject: {
                            reference: 'Patient/patient-1',
                            display: 'John Smith'
                        },
                        encounter: {
                            reference: 'Encounter/encounter-1'
                        },
                        effectiveDateTime: '2023-06-15T10:00:00Z',
                        issued: '2023-06-15T11:00:00Z',
                        performer: [
                            {
                                reference: 'Practitioner/practitioner-1',
                                display: 'Dr. Robert Miller'
                            }
                        ],
                        result: [
                            {
                                reference: 'Observation/observation-1'
                            }
                        ],
                        conclusion: 'All values within normal range.'
                    },
                    request: {
                        method: 'PUT',
                        url: 'DiagnosticReport/diagnostic-report-1'
                    }
                },

                // 10. Questionnaire
                {
                    resource: {
                        resourceType: 'Questionnaire',
                        id: 'questionnaire-1',
                        title: 'Patient Health Questionnaire',
                        status: 'active',
                        date: '2023-06-15',
                        publisher: 'MediCare',
                        description: 'General health questionnaire for new patients',
                        item: [
                            {
                                linkId: '1',
                                text: 'Do you have any allergies?',
                                type: 'boolean'
                            },
                            {
                                linkId: '2',
                                text: 'If yes, please list your allergies',
                                type: 'text',
                                enableWhen: [
                                    {
                                        question: '1',
                                        operator: '=',
                                        answerBoolean: true
                                    }
                                ]
                            },
                            {
                                linkId: '3',
                                text: 'How would you rate your overall health?',
                                type: 'choice',
                                answerOption: [
                                    {
                                        valueCoding: {
                                            code: 'excellent',
                                            display: 'Excellent'
                                        }
                                    },
                                    {
                                        valueCoding: {
                                            code: 'good',
                                            display: 'Good'
                                        }
                                    },
                                    {
                                        valueCoding: {
                                            code: 'fair',
                                            display: 'Fair'
                                        }
                                    },
                                    {
                                        valueCoding: {
                                            code: 'poor',
                                            display: 'Poor'
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    request: {
                        method: 'PUT',
                        url: 'Questionnaire/questionnaire-1'
                    }
                }
            ]
        };

        // Send the bundle to the FHIR server
        console.log('Sending resources to FHIR server...');

        const headers = {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
        };

        // Add authorization header if token is provided
        if (ADMIN_TOKEN) {
            headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
        }

        const response = await axios.post(FHIR_SERVER_URL, bundle, { headers });

        // Check if the response is successful
        if (response.status === 200) {
            console.log('Resources created successfully!');
            console.log(`Created ${bundle.entry.length} resources.`);

            // Save the response to a file for reference
            const responseFile = path.join(__dirname, 'seed-response.json');
            fs.writeFileSync(responseFile, JSON.stringify(response.data, null, 2));
            console.log(`Response saved to ${responseFile}`);

            // Print the created resources
            console.log('\nCreated Resources:');
            bundle.entry.forEach(entry => {
                console.log(`- ${entry.resource.resourceType}/${entry.resource.id}`);
            });
        } else {
            console.error('Failed to create resources:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error seeding FHIR resources:');
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

// Run the seeding function
seedFhirResources().catch(console.error); 