const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login for doctor@med.com...');
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'doctor@med.com',
            password: 'Doctor123!'
        });
        console.log('Login successful!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
    }
}

testLogin(); 