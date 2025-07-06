const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login for patient@med.com...');
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'patient@med.com',
            password: 'Patient123!'
        });
        console.log('Login successful!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
    }
}

testLogin(); 