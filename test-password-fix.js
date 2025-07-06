const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Test user credentials
const TEST_USERS = [
    {
        email: 'admin@test.com',
        password: 'Admin123',
        role: 'admin'
    },
    {
        email: 'patient@med.com',
        password: 'Patient123!',
        role: 'patient'
    },
    {
        email: 'doctor@med.com',
        password: 'Doctor123!',
        role: 'practitioner'
    }
];

// Test user registration and login
async function testPasswordFix() {
    console.log('🔍 Testing password fix...');

    try {
        // Test login for each user
        for (const user of TEST_USERS) {
            console.log(`\n🔐 Testing login for ${user.role} (${user.email})...`);

            try {
                const loginResponse = await axios.post(`${API_URL}/auth/login`, {
                    email: user.email,
                    password: user.password
                });

                // Check if login was successful based on response structure
                if (loginResponse.data && loginResponse.data.success) {
                    console.log(`✅ Login successful for ${user.email}`);

                    // Get the data from the nested structure
                    const userData = loginResponse.data.data;

                    // Print user details if available
                    if (userData && userData.user) {
                        console.log(`👤 User details: ${userData.user.name || 'N/A'}, Role: ${userData.user.role || 'N/A'}`);
                    }

                    // Print the token (first 20 chars)
                    if (userData && userData.accessToken) {
                        const token = userData.accessToken;
                        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
                    }
                } else {
                    console.log(`❌ Login failed for ${user.email} - Unexpected response format`);
                    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
                }
            } catch (error) {
                console.error(`❌ Login failed for ${user.email}:`, error.response?.data?.message || error.message);
            }
        }

        // Test registration with new user
        const newUser = {
            email: `test${Date.now()}@example.com`,
            password: 'Test123!',
            name: 'Test User'
        };

        console.log(`\n📝 Testing registration for new user (${newUser.email})...`);

        try {
            // Register the new user (without access code, this might fail depending on system requirements)
            const registerResponse = await axios.post(`${API_URL}/auth/register`, newUser);

            if (registerResponse.data && registerResponse.data.success) {
                console.log(`✅ Registration successful for ${newUser.email}`);

                // Try logging in with the new user
                console.log(`🔐 Testing login for newly registered user...`);
                try {
                    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
                        email: newUser.email,
                        password: newUser.password
                    });

                    if (loginResponse.data && loginResponse.data.success) {
                        console.log(`✅ Login successful for newly registered user`);
                    } else {
                        console.log(`❌ Login failed for newly registered user - Unexpected response format`);
                        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
                    }
                } catch (loginError) {
                    console.error(`❌ Login failed for newly registered user:`, loginError.response?.data?.message || loginError.message);
                }
            } else {
                console.log(`❌ Registration failed for ${newUser.email} - Unexpected response format`);
                console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
            }
        } catch (error) {
            console.error(`❌ Registration failed for ${newUser.email}:`, error.response?.data?.message || error.message);
            if (error.response?.data?.message) {
                console.log(`ℹ️ Error message: ${error.response.data.message}`);
            }
        }

        console.log('\n🎉 Password fix test completed!');
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testPasswordFix(); 