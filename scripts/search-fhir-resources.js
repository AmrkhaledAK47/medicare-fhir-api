#!/usr/bin/env node

/**
 * Search FHIR Resources Script
 * 
 * This script demonstrates how to search for FHIR resources using various search parameters.
 * It provides examples for searching patients, practitioners, observations, and more.
 * 
 * Usage:
 * node search-fhir-resources.js [resourceType] [searchParam=value]
 * 
 * Examples:
 * node search-fhir-resources.js Patient family=Smith
 * node search-fhir-resources.js Observation code=718-7
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:9090/fhir';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// Parse command line arguments
const args = process.argv.slice(2);
const resourceType = args[0];
const searchParams = {};

// Parse search parameters
args.slice(1).forEach(param => {
    const [key, value] = param.split('=');
    if (key && value) {
        searchParams[key] = value;
    }
});

// Display help if no arguments provided
if (!resourceType) {
    console.log(`
Search FHIR Resources Script
----------------------------
This script demonstrates how to search for FHIR resources using various search parameters.

Usage:
  node search-fhir-resources.js [resourceType] [searchParam=value]

Examples:
  node search-fhir-resources.js Patient family=Smith
  node search-fhir-resources.js Observation code=718-7
  node search-fhir-resources.js DiagnosticReport subject=Patient/patient-1
  node search-fhir-resources.js Encounter date=2023-06-15
  node search-fhir-resources.js Patient gender=female

Available Resource Types:
  Patient, Practitioner, Organization, Encounter, Observation, DiagnosticReport, Questionnaire
  `);
    process.exit(0);
}

async function searchResources() {
    try {
        console.log(`Searching for ${resourceType} resources...`);
        console.log(`FHIR Server URL: ${FHIR_SERVER_URL}`);
        console.log(`Search Parameters: ${JSON.stringify(searchParams)}`);
        console.log('-----------------------------------');

        const headers = {
            'Accept': 'application/fhir+json'
        };

        // Add authorization header if token is provided
        if (ADMIN_TOKEN) {
            headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
        }

        // Construct the URL with search parameters
        let url = `${FHIR_SERVER_URL}/${resourceType}`;
        const queryParams = new URLSearchParams();

        // Add search parameters to the URL
        Object.entries(searchParams).forEach(([key, value]) => {
            queryParams.append(key, value);
        });

        // Add the query parameters to the URL if there are any
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }

        console.log(`Request URL: ${url}`);

        const response = await axios.get(url, { headers });

        if (response.status === 200) {
            const bundle = response.data;

            // Check if the response is a Bundle
            if (bundle.resourceType !== 'Bundle') {
                console.error('❌ Response is not a Bundle');
                console.log(JSON.stringify(bundle, null, 2));
                return;
            }

            // Display the total number of resources found
            console.log(`✅ Found ${bundle.total || 'unknown number of'} resources`);
            console.log(`✅ Bundle contains ${bundle.entry ? bundle.entry.length : 0} entries`);

            // Display each resource in the bundle
            if (bundle.entry && bundle.entry.length > 0) {
                console.log('\nResources:');
                bundle.entry.forEach((entry, index) => {
                    const resource = entry.resource;
                    console.log(`\n--- Resource ${index + 1} ---`);
                    console.log(`Resource Type: ${resource.resourceType}`);
                    console.log(`ID: ${resource.id}`);

                    // Display resource-specific information
                    switch (resource.resourceType) {
                        case 'Patient':
                            if (resource.name && resource.name.length > 0) {
                                const name = resource.name[0];
                                console.log(`Name: ${name.given ? name.given.join(' ') : ''} ${name.family || ''}`);
                            }
                            console.log(`Gender: ${resource.gender || 'Unknown'}`);
                            console.log(`Birth Date: ${resource.birthDate || 'Unknown'}`);
                            break;

                        case 'Practitioner':
                            if (resource.name && resource.name.length > 0) {
                                const name = resource.name[0];
                                console.log(`Name: ${name.prefix ? name.prefix.join(' ') + ' ' : ''}${name.given ? name.given.join(' ') : ''} ${name.family || ''}`);
                            }
                            if (resource.qualification && resource.qualification.length > 0) {
                                const qual = resource.qualification[0];
                                if (qual.code && qual.code.text) {
                                    console.log(`Qualification: ${qual.code.text}`);
                                }
                            }
                            break;

                        case 'Organization':
                            console.log(`Name: ${resource.name || 'Unknown'}`);
                            break;

                        case 'Encounter':
                            console.log(`Status: ${resource.status || 'Unknown'}`);
                            if (resource.subject) {
                                console.log(`Subject: ${resource.subject.reference || 'Unknown'}`);
                            }
                            if (resource.period) {
                                console.log(`Period: ${resource.period.start || 'Unknown'} to ${resource.period.end || 'Unknown'}`);
                            }
                            break;

                        case 'Observation':
                            console.log(`Status: ${resource.status || 'Unknown'}`);
                            if (resource.subject) {
                                console.log(`Subject: ${resource.subject.reference || 'Unknown'}`);
                            }
                            if (resource.code && resource.code.coding && resource.code.coding.length > 0) {
                                console.log(`Code: ${resource.code.coding[0].display || resource.code.coding[0].code || 'Unknown'}`);
                            }
                            if (resource.valueQuantity) {
                                console.log(`Value: ${resource.valueQuantity.value} ${resource.valueQuantity.unit || ''}`);
                            }
                            break;

                        case 'DiagnosticReport':
                            console.log(`Status: ${resource.status || 'Unknown'}`);
                            if (resource.subject) {
                                console.log(`Subject: ${resource.subject.reference || 'Unknown'}`);
                            }
                            if (resource.code && resource.code.coding && resource.code.coding.length > 0) {
                                console.log(`Code: ${resource.code.coding[0].display || resource.code.coding[0].code || 'Unknown'}`);
                            }
                            if (resource.conclusion) {
                                console.log(`Conclusion: ${resource.conclusion}`);
                            }
                            break;

                        case 'Questionnaire':
                            console.log(`Title: ${resource.title || 'Unknown'}`);
                            console.log(`Status: ${resource.status || 'Unknown'}`);
                            if (resource.item) {
                                console.log(`Items: ${resource.item.length}`);
                            }
                            break;

                        default:
                            console.log(`Resource details: ${JSON.stringify(resource, null, 2)}`);
                    }
                });
            } else {
                console.log('\nNo resources found matching the search criteria.');
            }

            // Save the response to a file for reference
            const responseFile = path.join(__dirname, 'search-response.json');
            fs.writeFileSync(responseFile, JSON.stringify(response.data, null, 2));
            console.log(`\nResponse saved to ${responseFile}`);
        } else {
            console.error(`❌ Failed to search resources: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error searching resources:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
    }
}

// Run the search function
searchResources().catch(console.error); 