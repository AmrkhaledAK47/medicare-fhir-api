#!/usr/bin/env node
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api';
const users = {
    admin: {
        email: 'admin@medicare.com',
        password: 'AdminPass123!'
    },
    practitioner: {
        email: 'doctor@medicare.com',
        password: 'DoctorPass123!'
    },
    patient: {
        email: 'patient@medicare.com',
        password: 'PatientPass123!'
    }
};

// FHIR resources to test
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

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper functions
const printSection = (title) => {
    console.log(`\n${colors.cyan}=== ${title} ===${colors.reset}`);
};

const printResult = (success, message) => {
    console.log(`${success ? colors.green : colors.red}${message}${colors.reset}`);
};

const login = async (role) => {
    printSection(`Logging in as ${role}`);

    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: users[role].email,
            password: users[role].password
        });

        printResult(true, `Successfully logged in as ${role}`);
        return response.data.access_token;
    } catch (error) {
        printResult(false, `Failed to login as ${role}: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
};

const testEndpoint = async (token, method, url, data = null) => {
    try {
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        let response;
        if (method === 'GET') {
            response = await axios.get(`${API_URL}/${url}`, config);
        } else if (method === 'POST') {
            response = await axios.post(`${API_URL}/${url}`, data, config);
        } else if (method === 'PUT') {
            response = await axios.put(`${API_URL}/${url}`, data, config);
        } else if (method === 'DELETE') {
            response = await axios.delete(`${API_URL}/${url}`, config);
        }

        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        };
    }
};

// Main test function
const testRoleSecurity = async () => {
    console.log(`${colors.magenta}==============================================`);
    console.log(`       ROLE-BASED ACCESS SECURITY TEST`);
    console.log(`==============================================${colors.reset}`);

    // Step 1: Test with Admin role
    const adminToken = await login('admin');
    if (!adminToken) return;

    printSection('Testing Admin Access');

    // Test FHIR resource access
    for (const resourceType of resourceTypes) {
        const result = await testEndpoint(adminToken, 'GET', `fhir/${resourceType}`);
        printResult(
            result.success,
            `Admin access to ${resourceType}: ${result.success ? 'ALLOWED' : 'DENIED'} (${result.status})`
        );
    }

    // Test admin-specific endpoint
    const adminEndpointResult = await testEndpoint(adminToken, 'GET', 'admin/users');
    printResult(
        adminEndpointResult.success,
        `Admin access to user management: ${adminEndpointResult.success ? 'ALLOWED' : 'DENIED'} (${adminEndpointResult.status})`
    );

    // Step 2: Test with Practitioner role
    const practitionerToken = await login('practitioner');
    if (!practitionerToken) return;

    printSection('Testing Practitioner Access');

    // Test FHIR resource access for practitioner
    for (const resourceType of resourceTypes) {
        const result = await testEndpoint(practitionerToken, 'GET', `fhir/${resourceType}`);
        printResult(
            result.success,
            `Practitioner access to ${resourceType}: ${result.success ? 'ALLOWED' : 'DENIED'} (${result.status})`
        );
    }

    // Test admin-only endpoint (should be denied)
    const practitionerAdminResult = await testEndpoint(practitionerToken, 'GET', 'admin/users');
    printResult(
        !practitionerAdminResult.success,
        `Practitioner access to user management: ${!practitionerAdminResult.success ? 'CORRECTLY DENIED' : 'INCORRECTLY ALLOWED'} (${practitionerAdminResult.status})`
    );

    // Step 3: Test with Patient role
    const patientToken = await login('patient');
    if (!patientToken) return;

    printSection('Testing Patient Access');

    // Test FHIR resource access for patient
    for (const resourceType of resourceTypes) {
        const result = await testEndpoint(patientToken, 'GET', `fhir/${resourceType}`);
        printResult(
            result.success,
            `Patient access to ${resourceType}: ${result.success ? 'ALLOWED' : 'DENIED'} (${result.status})`
        );
    }

    // Test write access to clinical data (should be denied)
    const patientWriteResult = await testEndpoint(patientToken, 'POST', 'fhir/DiagnosticReport', {
        resourceType: 'DiagnosticReport',
        status: 'final',
        code: {
            coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'Complete blood count panel' }]
        }
    });

    printResult(
        !patientWriteResult.success,
        `Patient write access to DiagnosticReport: ${!patientWriteResult.success ? 'CORRECTLY DENIED' : 'INCORRECTLY ALLOWED'} (${patientWriteResult.status})`
    );

    console.log(`\n${colors.magenta}==============================================`);
    console.log(`       SECURITY TEST COMPLETE`);
    console.log(`==============================================${colors.reset}`);
};

// Run the test
testRoleSecurity().catch(err => {
    console.error(`${colors.red}Error running tests: ${err.message}${colors.reset}`);
}); 