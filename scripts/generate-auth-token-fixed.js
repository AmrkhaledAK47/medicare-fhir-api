#!/usr/bin/env node

/**
 * Script to generate JWT tokens for API testing
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Default user credentials for testing - DO NOT USE IN PRODUCTION
const TEST_USERS = {
    admin: {
        name: 'Test Admin',
        email: 'admin@example.com',
        password: 'Admin123!',
    },
    practitioner: {
        name: 'Test Doctor',
        email: 'doctor@example.com',
        password: 'Doctor123!',
    },
    patient: {
        name: 'Test Patient',
        email: 'patient@example.com',
        password: 'Patient123!',
    },
};

// Function to register a user if they don't exist
async function registerUser(userType, userData) {
    try {
        // For simplicity, use the same access code for all users
        const ACCESS_CODE = 'TEST-ACCESS-CODE';

        const response = await axios.post(`${API_URL}/auth/register`, {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            repeatPassword: userData.password,
            accessCode: userType === 'admin' ? undefined : ACCESS_CODE,
        });
        console.log(`✅ Registered ${userType} user successfully`);
        return response.data;
    } catch (error) {
        // If user already exists, this is fine
        if (error.response && error.response.status === 409) {
            console.log(`⚠️ User ${userData.email} already exists, proceeding to login`);
            return null;
        }
        console.error(`❌ Failed to register ${userType} user:`, error.response?.data || error.message);
        return null;
    }
}

// Function to login and get token
async function getAuthToken(userType, userData) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: userData.email,
            password: userData.password,
        });

        const token = response.data.accessToken;
        console.log(`✅ Obtained token for ${userType} user`);
        return token;
    } catch (error) {
        console.error(`❌ Failed to get token for ${userType} user:`, error.response?.data || error.message);
        return null;
    }
}

// Save tokens to a file
function saveTokens(tokens) {
    const outputFile = path.join(__dirname, '..', 'postman', 'auth-tokens.json');

    try {
        fs.writeFileSync(outputFile, JSON.stringify(tokens, null, 2));
        console.log(`✅ Saved tokens to ${outputFile}`);
    } catch (error) {
        console.error('❌ Failed to save tokens:', error.message);
    }
}

async function main() {
    console.log('=== Generating Authentication Tokens ===');

    // Create postman directory if it doesn't exist
    const postmanDir = path.join(__dirname, '..', 'postman');
    if (!fs.existsSync(postmanDir)) {
        fs.mkdirSync(postmanDir);
    }

    const tokens = {};

    // Process each test user
    for (const [userType, userData] of Object.entries(TEST_USERS)) {
        console.log(`\nProcessing ${userType} user...`);

        // Try to register the user (will be ignored if user already exists)
        await registerUser(userType, userData);

        // Get authentication token
        const token = await getAuthToken(userType, userData);
        if (token) {
            tokens[userType] = token;
        }
    }

    // Save tokens to file
    if (Object.keys(tokens).length > 0) {
        saveTokens(tokens);

        console.log('\n=== Token Usage ===');
        console.log('Add this header to your requests:');
        console.log(`Authorization: Bearer ${tokens.admin?.substring(0, 15)}...`);

        console.log('\nAvailable tokens:');
        Object.keys(tokens).forEach(role => {
            console.log(`- ${role}`);
        });
    } else {
        console.error('\n❌ Failed to generate any tokens. Check if the API server is running.');
    }
}

// Run the script
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 