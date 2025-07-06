#!/usr/bin/env node

/**
 * This script tests the "first user exception" where the first user to register
 * is automatically assigned the admin role.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'firstadmin4@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'First Admin User';

async function testFirstAdminException() {
    try {
        console.log('🔍 Testing first admin user exception...');

        // Step 1: Register the first user (should become admin)
        console.log('\n📝 Step 1: Registering first user...');

        const registerResponse = await axios.post(`${API_URL}/auth/register`, {
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            repeatPassword: ADMIN_PASSWORD
        });

        console.log('✅ Registration successful!');
        console.log('📊 Response data:', JSON.stringify(registerResponse.data, null, 2));

        // Extract token
        const token = registerResponse.data.data?.accessToken;
        if (!token) {
            throw new Error('No token received from registration');
        }

        // Save token to file for later use
        fs.writeFileSync(path.join(__dirname, 'admin-token.txt'), token);
        console.log('💾 Token saved to admin-token.txt');

        // Step 2: Get user profile to verify admin role
        console.log('\n📝 Step 2: Verifying admin role...');

        const profileResponse = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Profile retrieved!');
        console.log('📊 User profile:', JSON.stringify(profileResponse.data, null, 2));

        // Check if user has admin role
        const userRole = profileResponse.data.data?.role;
        if (userRole === 'ADMIN' || userRole === 'admin') {
            console.log('✅ Success! First user was assigned the admin role.');
        } else {
            console.log(`❌ Test failed! User has role "${userRole}" instead of "ADMIN".`);
        }

        // Step 3: Test admin functionality by listing users
        console.log('\n📝 Step 3: Testing admin functionality...');

        const usersResponse = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Users list retrieved!');
        console.log(`📊 Found ${usersResponse.data.data?.length || 0} users in the system.`);

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
testFirstAdminException(); 