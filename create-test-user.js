const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function createTestUser() {
    try {
        console.log('Step 1: Logging in as admin');
        const adminLoginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@test.com',
            password: 'Admin123'
        });

        const adminToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
        console.log('Admin login successful, token:', adminToken.substring(0, 15) + '...');

        console.log('\nStep 2: Creating a new patient resource with access code');
        const patientData = {
            resourceType: 'Patient',
            active: true,
            name: [
                {
                    use: 'official',
                    family: 'TestUser',
                    given: ['New']
                }
            ],
            gender: 'male',
            birthDate: '1990-01-01'
        };

        const patientResponse = await axios.post(
            `${API_URL}/fhir/Patient/with-access-code?email=newpatient@example.com`,
            patientData,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        const accessCode = patientResponse.data.data.accessCode;
        const resourceId = patientResponse.data.data.resource.id;
        console.log(`Patient resource created with ID: ${resourceId}`);
        console.log(`Access code for patient: ${accessCode}`);

        console.log('\nStep 3: Registering the new patient user');
        const registerData = {
            name: 'New TestUser',
            email: 'newpatient@example.com',
            password: 'TestPassword123!',
            repeatPassword: 'TestPassword123!',
            accessCode: accessCode
        };

        const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
        console.log('Registration response:', JSON.stringify(registerResponse.data, null, 2));

        console.log('\nStep 4: Testing login with the new user');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'newpatient@example.com',
            password: 'TestPassword123!'
        });

        console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
        console.log('\nTest completed successfully!');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

createTestUser(); 