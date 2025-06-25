#!/usr/bin/env node

/**
 * Script to test API endpoints from API-DOCUMENTATION.md
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const colors = require('colors/safe');

// Load environment variables
dotenv.config();

// Load auth tokens
let tokens = {};
try {
    const tokensPath = path.join(__dirname, '..', 'postman', 'auth-tokens.json');
    if (fs.existsSync(tokensPath)) {
        tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    } else {
        console.log(colors.yellow('⚠️ No auth tokens found. Please run scripts/generate-auth-token.js first.'));
        process.exit(1);
    }
} catch (error) {
    console.error(colors.red('❌ Failed to load auth tokens:'), error.message);
    process.exit(1);
}

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const FHIR_URL = process.env.FHIR_SERVER_URL || 'http://localhost:9090/fhir';

// Results tracking
const results = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
};

// Create HTTP clients with default configs
const apiClient = axios.create({
    baseURL: API_URL,
    validateStatus: () => true, // Don't throw on any status code
});

const fhirClient = axios.create({
    baseURL: FHIR_URL,
    validateStatus: () => true,
});

// Helper to log results
function logResult(endpoint, method, status, responseData, error = null) {
    const statusText = status >= 200 && status < 300
        ? colors.green(`✅ ${status}`)
        : colors.red(`❌ ${status}`);

    console.log(`${method.toUpperCase().padEnd(7)} ${endpoint.padEnd(50)} ${statusText}`);

    if (status >= 400) {
        if (responseData) {
            console.log(colors.yellow('  Response:'), typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
        }
        if (error) {
            console.log(colors.red('  Error:'), error.message);
        }
    }

    // Update results
    results.total++;
    if (status >= 200 && status < 300) {
        results.success++;
    } else {
        results.failed++;
    }

    return status >= 200 && status < 300;
}

// Helper for making requests with proper auth
async function makeRequest(endpoint, method, data = null, role = 'admin', isRaw = false) {
    const token = tokens[role];
    if (!token) {
        console.log(colors.yellow(`⚠️ Skipping ${method.toUpperCase()} ${endpoint} - No token for ${role} role`));
        results.skipped++;
        return null;
    }

    const client = isRaw ? axios.create({
        validateStatus: () => true,
    }) : apiClient;

    try {
        const url = isRaw ? endpoint : endpoint;
        const response = await client({
            method,
            url,
            data,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        return {
            status: response.status,
            data: response.data,
            headers: response.headers,
        };
    } catch (error) {
        return {
            status: error.response?.status || 500,
            data: error.response?.data || null,
            error,
        };
    }
}

// Test cases based on API-DOCUMENTATION.md
async function runTests() {
    console.log(colors.blue('=== Testing API Endpoints ==='));
    console.log(`Base URL: ${API_URL}\n`);

    // Auth endpoints
    console.log(colors.cyan('Auth Endpoints:'));

    // Test login (we've already done this to get tokens, but test again)
    const loginResp = await makeRequest('/auth/login', 'post', {
        email: 'admin@example.com',
        password: 'Admin123!'
    }, null, false);
    if (loginResp) {
        logResult('/auth/login', 'post', loginResp.status, loginResp.data, loginResp.error);
    }

    // Test verify-access-code
    const verifyResp = await makeRequest('/auth/verify-access-code', 'post', {
        email: 'test@example.com',
        accessCode: 'TEST-ACCESS-CODE'
    }, null, false);
    if (verifyResp) {
        logResult('/auth/verify-access-code', 'post', verifyResp.status, verifyResp.data, verifyResp.error);
    }

    // Test forgot-password
    const forgotResp = await makeRequest('/auth/forgot-password', 'post', {
        email: 'admin@example.com'
    }, null, false);
    if (forgotResp) {
        logResult('/auth/forgot-password', 'post', forgotResp.status, forgotResp.data, forgotResp.error);
    }

    // User endpoints
    console.log(colors.cyan('\nUser Endpoints:'));

    // Get all users (admin only)
    const usersResp = await makeRequest('/users', 'get', null, 'admin');
    if (usersResp) {
        logResult('/users', 'get', usersResp.status, usersResp.data, usersResp.error);
    }

    // Get user by ID
    if (usersResp && usersResp.status === 200 && usersResp.data.length > 0) {
        const userId = usersResp.data[0].id;
        const userResp = await makeRequest(`/users/${userId}`, 'get', null, 'admin');
        if (userResp) {
            logResult(`/users/${userId}`, 'get', userResp.status, userResp.data, userResp.error);
        }
    }

    // FHIR Resource endpoints
    console.log(colors.cyan('\nFHIR Resource Endpoints:'));

    // Test resource types
    const resourceTypes = [
        'Patient',
        'Practitioner',
        'Organization',
        'Encounter',
        'Observation',
        'DiagnosticReport',
        'Medication',
        'Questionnaire',
        'Payment'
    ];

    // Get resources by type
    for (const resourceType of resourceTypes) {
        const resourcesResp = await makeRequest(`/fhir/${resourceType}`, 'get', null, 'admin');
        if (resourcesResp) {
            logResult(`/fhir/${resourceType}`, 'get', resourcesResp.status, resourcesResp.data, resourcesResp.error);
        }
    }

    // Create a test patient
    const patientData = {
        resourceType: 'Patient',
        name: [{ family: 'TestPatient', given: ['API', 'Test'] }],
        gender: 'male',
        birthDate: '1980-01-01',
        active: true
    };

    const createPatientResp = await makeRequest('/fhir/Patient', 'post', patientData, 'admin');
    if (createPatientResp) {
        logResult('/fhir/Patient', 'post', createPatientResp.status, createPatientResp.data, createPatientResp.error);

        // If patient created successfully, update and then delete
        if (createPatientResp.status === 201 && createPatientResp.data.id) {
            const patientId = createPatientResp.data.id;

            // Update patient
            const updatePatientResp = await makeRequest(`/fhir/Patient/${patientId}`, 'put', {
                ...patientData,
                id: patientId,
                name: [{ family: 'TestPatient', given: ['Updated', 'API', 'Test'] }]
            }, 'admin');

            if (updatePatientResp) {
                logResult(`/fhir/Patient/${patientId}`, 'put', updatePatientResp.status, updatePatientResp.data, updatePatientResp.error);
            }

            // Delete patient
            const deletePatientResp = await makeRequest(`/fhir/Patient/${patientId}`, 'delete', null, 'admin');
            if (deletePatientResp) {
                logResult(`/fhir/Patient/${patientId}`, 'delete', deletePatientResp.status, deletePatientResp.data, deletePatientResp.error);
            }
        }
    }

    // Test role-specific endpoints
    console.log(colors.cyan('\nRole-Specific Endpoints:'));

    // Patient demographics (Admin, Practitioner)
    const demographicsResp = await makeRequest('/fhir/Patient/demographics', 'get', null, 'admin');
    if (demographicsResp) {
        logResult('/fhir/Patient/demographics', 'get', demographicsResp.status, demographicsResp.data, demographicsResp.error);
    }

    // Health check
    console.log(colors.cyan('\nHealth Check Endpoints:'));

    const healthResp = await makeRequest('/health', 'get', null, 'admin');
    if (healthResp) {
        logResult('/health', 'get', healthResp.status, healthResp.data, healthResp.error);
    }

    const fhirHealthResp = await makeRequest('/health/fhir-server', 'get', null, 'admin');
    if (fhirHealthResp) {
        logResult('/health/fhir-server', 'get', fhirHealthResp.status, fhirHealthResp.data, fhirHealthResp.error);
    }

    // Print summary
    console.log(colors.blue('\n=== Test Summary ==='));
    console.log(colors.cyan(`Total endpoints tested: ${results.total}`));
    console.log(colors.green(`✅ Success: ${results.success}`));
    console.log(colors.red(`❌ Failed: ${results.failed}`));
    console.log(colors.yellow(`⚠️ Skipped: ${results.skipped}`));

    // Return whether all tests succeeded
    return results.failed === 0;
}

// Run the tests
runTests()
    .then(success => {
        if (success) {
            console.log(colors.green('\n✅ All tests passed successfully!'));
            process.exit(0);
        } else {
            console.log(colors.yellow('\n⚠️ Some tests failed. Review the output above for details.'));
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(colors.red('\n❌ Test execution failed:'), error);
        process.exit(1);
    }); 