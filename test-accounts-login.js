const axios = require('axios');

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

async function testLogin(account) {
    try {
        console.log(`Testing login for ${account.type} (${account.email})...`);
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: account.email,
            password: account.password
        });
        console.log(`✅ ${account.type} login successful!`);
        console.log(JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ ${account.type} login failed:`, error.response ? error.response.data : error.message);
        return false;
    }
}

async function testAllAccounts() {
    console.log('Testing all accounts...\n');

    for (const account of accounts) {
        await testLogin(account);
        console.log('\n-----------------------------------\n');
    }
}

testAllAccounts(); 