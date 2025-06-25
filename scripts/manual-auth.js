#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

// User data for registration
const userData = {
    name: 'Test Admin',
    email: 'admin@example.com',
    password: 'Admin123!',
    repeatPassword: 'Admin123!',
    accessCode: 'TEST-ACCESS-CODE'
};

async function registerUser() {
    try {
        console.log('Attempting to register user...');
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        console.log('Registration successful:', response.data);
        return true;
    } catch (error) {
        console.error('Registration failed:', error.response?.data || error.message);
        // If user already exists, we can still try to login
        if (error.response?.status === 409) {
            console.log('User already exists, proceeding to login...');
            return true;
        }
        return false;
    }
}

async function loginUser() {
    try {
        console.log('Attempting to login...');
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: userData.email,
            password: userData.password
        });
        console.log('Login successful!');
        const token = response.data.accessToken;

        // Save token to file
        const outputFile = path.join(__dirname, '..', 'postman', 'auth-token.txt');
        fs.writeFileSync(outputFile, token);
        console.log(`Token saved to ${outputFile}`);

        // Also save as JSON for compatibility with other scripts
        const jsonOutputFile = path.join(__dirname, '..', 'postman', 'auth-tokens.json');
        fs.writeFileSync(jsonOutputFile, JSON.stringify({ admin: token }, null, 2));
        console.log(`Token also saved as JSON to ${jsonOutputFile}`);

        return token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        return null;
    }
}

// Run the script
async function main() {
    console.log('=== Manual Authentication ===');

    // Create postman directory if it doesn't exist
    const postmanDir = path.join(__dirname, '..', 'postman');
    if (!fs.existsSync(postmanDir)) {
        fs.mkdirSync(postmanDir);
    }

    // Try to register
    const registered = await registerUser();

    if (registered) {
        // Try to login
        const token = await loginUser();

        if (token) {
            console.log('\nAuthentication successful!');
            console.log('Use this token for API requests:');
            console.log(`Authorization: Bearer ${token.substring(0, 15)}...`);
        } else {
            console.error('\nFailed to authenticate. Please check your credentials.');
        }
    } else {
        console.error('\nRegistration failed. Cannot proceed to login.');
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 