/**
 * Example Observation resource responses for Swagger documentation
 */

export const ObservationExamples = {
    // Basic observation example (vital sign)
    vitalSign: {
        resourceType: 'Observation',
        id: 'example-observation-id',
        meta: {
            versionId: '1',
            lastUpdated: '2023-06-15T10:30:00.000Z'
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
            reference: 'Patient/example-patient-id',
            display: 'John Doe'
        },
        encounter: {
            reference: 'Encounter/example-encounter-id'
        },
        effectiveDateTime: '2023-06-15T10:15:00.000Z',
        issued: '2023-06-15T10:30:00.000Z',
        performer: [
            {
                reference: 'Practitioner/example-practitioner-id',
                display: 'Dr. Jane Smith'
            }
        ],
        valueQuantity: {
            value: 80,
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
                ]
            }
        ],
        note: [
            {
                text: 'Patient was at rest for 5 minutes prior to measurement'
            }
        ]
    },

    // Laboratory result example
    labResult: {
        resourceType: 'Observation',
        id: 'example-lab-id',
        meta: {
            versionId: '1',
            lastUpdated: '2023-06-16T14:30:00.000Z'
        },
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
                    code: '2339-0',
                    display: 'Glucose [Mass/volume] in Blood'
                }
            ],
            text: 'Blood Glucose'
        },
        subject: {
            reference: 'Patient/example-patient-id',
            display: 'John Doe'
        },
        encounter: {
            reference: 'Encounter/example-encounter-id'
        },
        effectiveDateTime: '2023-06-16T14:00:00.000Z',
        issued: '2023-06-16T14:30:00.000Z',
        performer: [
            {
                reference: 'Practitioner/example-practitioner-id',
                display: 'Dr. Jane Smith'
            },
            {
                reference: 'Organization/example-lab-id',
                display: 'MediCare Laboratory'
            }
        ],
        valueQuantity: {
            value: 95,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
        },
        interpretation: [
            {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                        code: 'N',
                        display: 'Normal'
                    }
                ]
            }
        ],
        referenceRange: [
            {
                low: {
                    value: 70,
                    unit: 'mg/dL',
                    system: 'http://unitsofmeasure.org',
                    code: 'mg/dL'
                },
                high: {
                    value: 110,
                    unit: 'mg/dL',
                    system: 'http://unitsofmeasure.org',
                    code: 'mg/dL'
                },
                type: {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/referencerange-meaning',
                            code: 'normal',
                            display: 'Normal Range'
                        }
                    ]
                }
            }
        ]
    },

    // Observation list example
    observationList: {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 2,
        link: [
            {
                relation: 'self',
                url: 'https://api.example.com/fhir/Observation?subject=Patient/example-patient-id&_count=2'
            },
            {
                relation: 'next',
                url: 'https://api.example.com/fhir/Observation?subject=Patient/example-patient-id&_count=2&_getpagesoffset=2'
            }
        ],
        entry: [
            {
                fullUrl: 'https://api.example.com/fhir/Observation/example-observation-id1',
                resource: {
                    resourceType: 'Observation',
                    id: 'example-observation-id1',
                    meta: {
                        versionId: '1',
                        lastUpdated: '2023-06-15T10:30:00.000Z'
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
                        ]
                    },
                    subject: {
                        reference: 'Patient/example-patient-id'
                    },
                    effectiveDateTime: '2023-06-15T10:15:00.000Z',
                    valueQuantity: {
                        value: 80,
                        unit: 'beats/minute',
                        system: 'http://unitsofmeasure.org',
                        code: '/min'
                    }
                }
            },
            {
                fullUrl: 'https://api.example.com/fhir/Observation/example-observation-id2',
                resource: {
                    resourceType: 'Observation',
                    id: 'example-observation-id2',
                    meta: {
                        versionId: '1',
                        lastUpdated: '2023-06-15T10:45:00.000Z'
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
                                code: '85354-9',
                                display: 'Blood pressure panel'
                            }
                        ]
                    },
                    subject: {
                        reference: 'Patient/example-patient-id'
                    },
                    effectiveDateTime: '2023-06-15T10:15:00.000Z',
                    component: [
                        {
                            code: {
                                coding: [
                                    {
                                        system: 'http://loinc.org',
                                        code: '8480-6',
                                        display: 'Systolic blood pressure'
                                    }
                                ]
                            },
                            valueQuantity: {
                                value: 120,
                                unit: 'mmHg',
                                system: 'http://unitsofmeasure.org',
                                code: 'mm[Hg]'
                            }
                        },
                        {
                            code: {
                                coding: [
                                    {
                                        system: 'http://loinc.org',
                                        code: '8462-4',
                                        display: 'Diastolic blood pressure'
                                    }
                                ]
                            },
                            valueQuantity: {
                                value: 80,
                                unit: 'mmHg',
                                system: 'http://unitsofmeasure.org',
                                code: 'mm[Hg]'
                            }
                        }
                    ]
                }
            }
        ]
    }
}; 