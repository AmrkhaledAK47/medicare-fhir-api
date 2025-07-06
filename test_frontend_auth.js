/**
 * MediCare FHIR API Authentication Test Script
 * 
 * This script demonstrates how to interact with the MediCare FHIR API authentication endpoints.
 * It can be run with Node.js to verify that the authentication flow is working correctly.
 * 
 * Usage: node test_frontend_auth.js
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
    email: 'admin@test.com',
    password: 'Admin123'
};
const TEST_PATIENT = {
    email: 'new.patient@example.com',
    password: 'Patient123!',
    name: 'New Test Patient'
};
const TEST_PRACTITIONER = {
    email: 'new.doctor@example.com',
    password: 'Doctor123!',
    name: 'New Test Doctor'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m'
};

// Helper function to log steps
const log = {
    step: (message) => console.log(`${colors.blue}[STEP]${colors.reset} ${message}`),
    success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
    error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
    info: (message) => console.log(`${colors.yellow}[INFO]${colors.reset} ${message}`),
    json: (data) => console.log(JSON.stringify(data, null, 2))
};

// Create API instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            log.error(`Request failed with status ${error.response.status}`);
            log.json(error.response.data);
        } else if (error.request) {
            log.error('No response received from server');
        } else {
            log.error(`Error setting up request: ${error.message}`);
        }
        return Promise.reject(error);
    }
);

// Test the authentication flow
async function testAuthFlow() {
    let adminToken, patientAccessCode, practitionerAccessCode, patientToken, practitionerToken;
    let patientResourceId, practitionerResourceId;

    try {
        // Step 1: Admin Login
        log.step('Admin Login');
        const adminLoginResponse = await api.post('/auth/login', ADMIN_CREDENTIALS);

        // Check if the response has the expected format
        if (adminLoginResponse.data && adminLoginResponse.data.data && adminLoginResponse.data.data.accessToken) {
            adminToken = adminLoginResponse.data.data.accessToken;
        } else if (adminLoginResponse.data && adminLoginResponse.data.accessToken) {
            adminToken = adminLoginResponse.data.accessToken;
        } else {
            throw new Error('Unexpected response format from login endpoint');
        }

        log.success('Admin login successful');
        log.info(`Token: ${adminToken.substring(0, 15)}...`);

        // Step 2: Create Patient resource with access code
        log.step('Creating Patient resource with access code');
        const patientData = {
            resourceType: 'Patient',
            active: true,
            name: [
                {
                    use: 'official',
                    family: TEST_PATIENT.name.split(' ')[1] || 'Doe',
                    given: [TEST_PATIENT.name.split(' ')[0]]
                }
            ],
            gender: 'male',
            birthDate: '1990-01-01'
        };

        const patientResponse = await api.post(
            `/fhir/Patient/with-access-code?email=${TEST_PATIENT.email}`,
            patientData,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        patientAccessCode = patientResponse.data.data.accessCode;
        patientResourceId = patientResponse.data.data.resource.id;
        log.success(`Patient resource created with ID: ${patientResourceId}`);
        log.info(`Access code for patient: ${patientAccessCode}`);

        // Step 3: Create Practitioner resource with access code
        log.step('Creating Practitioner resource with access code');
        const practitionerData = {
            resourceType: 'Practitioner',
            active: true,
            name: [
                {
                    use: 'official',
                    family: TEST_PRACTITIONER.name.split(' ')[1] || 'Smith',
                    given: [TEST_PRACTITIONER.name.split(' ')[0]]
                }
            ],
            qualification: [
                {
                    code: {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                                code: 'MD',
                                display: 'Doctor of Medicine'
                            }
                        ],
                        text: 'Doctor of Medicine'
                    }
                }
            ]
        };

        const practitionerResponse = await api.post(
            `/fhir/Practitioner/with-access-code?email=${TEST_PRACTITIONER.email}`,
            practitionerData,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        practitionerAccessCode = practitionerResponse.data.data.accessCode;
        practitionerResourceId = practitionerResponse.data.data.resource.id;
        log.success(`Practitioner resource created with ID: ${practitionerResourceId}`);
        log.info(`Access code for practitioner: ${practitionerAccessCode}`);

        // Step 4: Register patient with access code
        log.step('Registering patient with access code');
        const patientRegisterData = {
            name: TEST_PATIENT.name,
            email: TEST_PATIENT.email,
            password: TEST_PATIENT.password,
            repeatPassword: TEST_PATIENT.password,
            accessCode: patientAccessCode
        };

        const patientRegisterResponse = await api.post('/auth/register', patientRegisterData);

        // Check if the response has the expected format
        if (patientRegisterResponse.data && patientRegisterResponse.data.data && patientRegisterResponse.data.data.accessToken) {
            patientToken = patientRegisterResponse.data.data.accessToken;
        } else if (patientRegisterResponse.data && patientRegisterResponse.data.accessToken) {
            patientToken = patientRegisterResponse.data.accessToken;
        } else {
            throw new Error('Unexpected response format from register endpoint');
        }

        log.success('Patient registration successful');
        log.info(`Token: ${patientToken.substring(0, 15)}...`);

        // Step 5: Register practitioner with access code
        log.step('Registering practitioner with access code');
        const practitionerRegisterData = {
            name: TEST_PRACTITIONER.name,
            email: TEST_PRACTITIONER.email,
            password: TEST_PRACTITIONER.password,
            repeatPassword: TEST_PRACTITIONER.password,
            accessCode: practitionerAccessCode
        };

        const practitionerRegisterResponse = await api.post('/auth/register', practitionerRegisterData);

        // Check if the response has the expected format
        if (practitionerRegisterResponse.data && practitionerRegisterResponse.data.data && practitionerRegisterResponse.data.data.accessToken) {
            practitionerToken = practitionerRegisterResponse.data.data.accessToken;
        } else if (practitionerRegisterResponse.data && practitionerRegisterResponse.data.accessToken) {
            practitionerToken = practitionerRegisterResponse.data.accessToken;
        } else {
            throw new Error('Unexpected response format from register endpoint');
        }

        log.success('Practitioner registration successful');
        log.info(`Token: ${practitionerToken.substring(0, 15)}...`);

        // Step 6: Patient accesses their own profile
        log.step('Patient accessing their own profile');
        const patientProfileResponse = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        log.success('Patient profile access successful');
        log.json(patientProfileResponse.data);

        // Step 7: Patient accesses their FHIR resource
        log.step('Patient accessing their FHIR resource');
        const patientFhirResponse = await api.get(`/fhir/Patient/${patientResourceId}`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        log.success('Patient FHIR resource access successful');
        log.json(patientFhirResponse.data);

        // Step 8: Practitioner accesses their own profile
        log.step('Practitioner accessing their own profile');
        const practitionerProfileResponse = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${practitionerToken}` }
        });
        log.success('Practitioner profile access successful');
        log.json(practitionerProfileResponse.data);

        // Step 9: Practitioner accesses their FHIR resource
        log.step('Practitioner accessing their FHIR resource');
        const practitionerFhirResponse = await api.get(`/fhir/Practitioner/${practitionerResourceId}`, {
            headers: { Authorization: `Bearer ${practitionerToken}` }
        });
        log.success('Practitioner FHIR resource access successful');
        log.json(practitionerFhirResponse.data);

        // Step 10: Test error handling - Invalid login
        log.step('Testing invalid login credentials');
        try {
            await api.post('/auth/login', {
                email: 'invalid@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            log.success('Invalid login correctly rejected');
        }

        log.success('Authentication flow test completed successfully!');

    } catch (error) {
        log.error('Test failed');
        console.error(error);
    }
}

// Run the test
testAuthFlow(); 