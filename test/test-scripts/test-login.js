// This script tests the login API
const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login with admin credentials...');

        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@medicare.com',
            password: 'AdminPass123!'
        });

        console.log('Login successful!');
        console.log('Full response:', JSON.stringify(response.data, null, 2));

        const accessToken = response.data.accessToken;

        if (!accessToken) {
            console.error('No access token found in response!');
            return;
        }

        // Save the token for later use
        console.log('\nExample API call with token:');
        console.log('curl -X GET -H "Authorization: Bearer ' + accessToken + '" http://localhost:3000/api/health');

        // Test an authenticated endpoint
        try {
            const healthResponse = await axios.get('http://localhost:3000/api/health', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            console.log('\nHealth check result:', healthResponse.data);
        } catch (healthError) {
            console.error('Health check failed:', healthError.response?.data || healthError.message);
        }

        // Test patients endpoint
        try {
            const patientsResponse = await axios.get('http://localhost:3000/api/fhir/Patient', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            console.log('\nPatient count:', patientsResponse.data.meta?.totalItems || 'Unknown');
            if (patientsResponse.data.data && patientsResponse.data.data.length > 0) {
                console.log('First patient name:', patientsResponse.data.data[0].name[0].family);
            }
        } catch (patientsError) {
            console.error('Patient request failed:', patientsError.response?.data || patientsError.message);
        }

    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
    }
}

// Run the test
testLogin().catch(console.error); 