#!/usr/bin/env node

/**
 * This script tests the login functionality
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const EMAIL = process.env.EMAIL || 'admin@test.com';
const PASSWORD = process.env.PASSWORD || 'Admin123';

async function testLogin() {
    try {
        console.log(`🔍 Testing login with email: ${EMAIL}`);

        // Try to login
        console.log('\n📝 Attempting login...');

        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        console.log('✅ Login successful!');
        console.log('📊 Response data:', JSON.stringify(loginResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        // Log more detailed error information
        if (error.response) {
            console.error('Status code:', error.response.status);
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        }
    }
}

// Run the test
testLogin(); 