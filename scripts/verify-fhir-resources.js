#!/usr/bin/env node

/**
 * Verify FHIR Resources Script
 * 
 * This script verifies that the FHIR resources created by the seed-fhir-resources.js script
 * exist in the HAPI FHIR server. It retrieves each resource and checks its basic properties.
 * 
 * Usage:
 * node verify-fhir-resources.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:9090/fhir';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// List of resources to verify
const resourcesToVerify = [
    { resourceType: 'Patient', id: 'patient-1' },
    { resourceType: 'Patient', id: 'patient-2' },
    { resourceType: 'Practitioner', id: 'practitioner-1' },
    { resourceType: 'Practitioner', id: 'practitioner-2' },
    { resourceType: 'Organization', id: 'organization-1' },
    { resourceType: 'Encounter', id: 'encounter-1' },
    { resourceType: 'Observation', id: 'observation-1' },
    { resourceType: 'Observation', id: 'observation-2' },
    { resourceType: 'DiagnosticReport', id: 'diagnostic-report-1' },
    { resourceType: 'Questionnaire', id: 'questionnaire-1' }
];

async function verifyResource(resourceType, id) {
    try {
        const headers = {
            'Accept': 'application/fhir+json'
        };

        // Add authorization header if token is provided
        if (ADMIN_TOKEN) {
            headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
        }

        const url = `${FHIR_SERVER_URL}/${resourceType}/${id}`;
        console.log(`Verifying ${resourceType}/${id}...`);

        const response = await axios.get(url, { headers });

        if (response.status === 200) {
            console.log(`✅ ${resourceType}/${id} exists`);

            // Basic verification of resource properties
            const resource = response.data;

            // Check resource type
            if (resource.resourceType !== resourceType) {
                console.error(`❌ Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`);
                return false;
            }

            // Check resource ID
            if (resource.id !== id) {
                console.error(`❌ Resource ID mismatch: expected ${id}, got ${resource.id}`);
                return false;
            }

            // Resource-specific checks
            switch (resourceType) {
                case 'Patient':
                    if (!resource.name || resource.name.length === 0) {
                        console.error(`❌ Patient ${id} has no name`);
                        return false;
                    }
                    console.log(`  Name: ${resource.name[0].given.join(' ')} ${resource.name[0].family}`);
                    break;

                case 'Practitioner':
                    if (!resource.name || resource.name.length === 0) {
                        console.error(`❌ Practitioner ${id} has no name`);
                        return false;
                    }
                    console.log(`  Name: ${resource.name[0].prefix ? resource.name[0].prefix.join(' ') + ' ' : ''}${resource.name[0].given.join(' ')} ${resource.name[0].family}`);
                    break;

                case 'Organization':
                    if (!resource.name) {
                        console.error(`❌ Organization ${id} has no name`);
                        return false;
                    }
                    console.log(`  Name: ${resource.name}`);
                    break;

                case 'Encounter':
                    if (!resource.subject || !resource.subject.reference) {
                        console.error(`❌ Encounter ${id} has no subject reference`);
                        return false;
                    }
                    console.log(`  Subject: ${resource.subject.reference}`);
                    console.log(`  Status: ${resource.status}`);
                    break;

                case 'Observation':
                    if (!resource.subject || !resource.subject.reference) {
                        console.error(`❌ Observation ${id} has no subject reference`);
                        return false;
                    }
                    console.log(`  Subject: ${resource.subject.reference}`);
                    if (resource.valueQuantity) {
                        console.log(`  Value: ${resource.valueQuantity.value} ${resource.valueQuantity.unit}`);
                    }
                    break;

                case 'DiagnosticReport':
                    if (!resource.subject || !resource.subject.reference) {
                        console.error(`❌ DiagnosticReport ${id} has no subject reference`);
                        return false;
                    }
                    console.log(`  Subject: ${resource.subject.reference}`);
                    console.log(`  Status: ${resource.status}`);
                    if (resource.conclusion) {
                        console.log(`  Conclusion: ${resource.conclusion}`);
                    }
                    break;

                case 'Questionnaire':
                    if (!resource.title) {
                        console.error(`❌ Questionnaire ${id} has no title`);
                        return false;
                    }
                    console.log(`  Title: ${resource.title}`);
                    console.log(`  Status: ${resource.status}`);
                    if (resource.item) {
                        console.log(`  Items: ${resource.item.length}`);
                    }
                    break;
            }

            return true;
        } else {
            console.error(`❌ Failed to retrieve ${resourceType}/${id}: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error verifying ${resourceType}/${id}:`);
        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Message: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`  ${error.message}`);
        }
        return false;
    }
}

async function verifyFhirResources() {
    console.log('Starting FHIR resource verification...');
    console.log(`FHIR Server URL: ${FHIR_SERVER_URL}`);
    console.log('-----------------------------------');

    let successCount = 0;
    let failureCount = 0;

    for (const resource of resourcesToVerify) {
        const success = await verifyResource(resource.resourceType, resource.id);
        if (success) {
            successCount++;
        } else {
            failureCount++;
        }
        console.log('-----------------------------------');
    }

    console.log(`Verification complete. ${successCount} resources verified successfully, ${failureCount} failures.`);

    return failureCount === 0;
}

// Run the verification function
verifyFhirResources()
    .then(success => {
        if (success) {
            console.log('✅ All resources verified successfully!');
            process.exit(0);
        } else {
            console.error('❌ Some resources failed verification.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Error during verification:', error);
        process.exit(1);
    }); 