// This script tests that resource type capitalization is handled correctly
const axios = require('axios');

const resourceTypes = [
    // Correctly capitalized
    'Patient',
    'Practitioner',
    'Organization',
    // Lowercase (should be corrected)
    'patient',
    'practitioner',
    'observation',
    // Plurals (should be corrected)
    'patients',
    'practitioners',
    'observations'
];

async function testResourceCapitalization() {
    try {
        console.log('Testing login with admin credentials...');

        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@medicare.com',
            password: 'AdminPass123!'
        });

        console.log('Login successful!');
        const accessToken = response.data.accessToken;

        if (!accessToken) {
            console.error('No access token found in response!');
            return;
        }

        console.log('\nTesting resource type capitalization:');
        console.log('===================================');

        // Test each resource type
        for (const resourceType of resourceTypes) {
            try {
                console.log(`\nTesting resource type: "${resourceType}"`);

                const url = `http://localhost:3000/api/fhir/${resourceType}`;
                console.log(`URL: ${url}`);

                const result = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                console.log(`✅ SUCCESS! Status: ${result.status}`);

                // Show count of resources if available
                if (result.data.meta && result.data.meta.totalItems !== undefined) {
                    console.log(`   Found ${result.data.meta.totalItems} resources`);
                } else if (result.data && result.data.total !== undefined) {
                    console.log(`   Found ${result.data.total} resources`);
                }

            } catch (error) {
                console.log(`❌ FAILED! Status: ${error.response?.status || 'Unknown'}`);
                console.log(`   Error: ${error.response?.data?.message || error.message}`);
            }
        }

    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
    }
}

// Run the test
testResourceCapitalization().catch(console.error); 