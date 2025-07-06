const axios = require('axios');

async function debugLogin(email, password) {
    console.log(`Attempting login for ${email} with password ${password}`);

    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email,
            password
        }, {
            validateStatus: function (status) {
                return status < 500; // Resolve only if the status code is less than 500
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 || response.status === 201) {
            console.log('✅ Login successful!');
            return true;
        } else {
            console.log('❌ Login failed with status code:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error during login request:');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
        }
        return false;
    }
}

async function testAllAccounts() {
    const accounts = [
        {
            type: 'Admin',
            email: 'admin@test.com',
            password: 'Admin123'
        },
        {
            type: 'Patient',
            email: 'patient@med.com',
            password: 'Patient123!'
        },
        {
            type: 'Practitioner',
            email: 'doctor@med.com',
            password: 'Doctor123!'
        }
    ];

    for (const account of accounts) {
        console.log(`\n===== Testing ${account.type} Login =====\n`);
        await debugLogin(account.email, account.password);
        console.log('\n=====================================\n');
    }
}

testAllAccounts(); 