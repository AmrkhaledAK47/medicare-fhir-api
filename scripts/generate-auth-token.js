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
        email: 'admin@example.com',
        password: 'Admin123!',
        role: 'admin',
    },
    practitioner: {
        email: 'doctor@example.com',
        password: 'Doctor123!',
        role: 'practitioner',
    },
    patient: {
        email: 'patient@example.com',
        password: 'Patient123!',
        role: 'patient',
    },
};

// Function to register a user if they don't exist
async function registerUser(userData) {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, {
            name: `Test ${userData.role}`,
            email: userData.email,
            password: userData.password,
            repeatPassword: userData.password,
            role: userData.role,
            // Add access code if required by your system
            accessCode: userData.role === 'admin' ? undefined : 'TEST-ACCESS-CODE',
        });
        console.log(`✅ Registered ${userData.role} user successfully`);
        return response.data;
    } catch (error) {
        // If user already exists, this is fine
        if (error.response && error.response.status === 409) {
            console.log(`⚠️ User ${userData.email} already exists, proceeding to login`);
            return null;
        }
        console.error(`❌ Failed to register ${userData.role} user:`, error.response?.data || error.message);
        return null;
    }
}

// Function to login and get token
async function getAuthToken(userData) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: userData.email,
            password: userData.password,
        });

        const token = response.data.accessToken;
        console.log(`✅ Obtained token for ${userData.role} user`);
        return token;
    } catch (error) {
        console.error(`❌ Failed to get token for ${userData.role} user:`, error.response?.data || error.message);
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
        await registerUser(userData);

        // Get authentication token
        const token = await getAuthToken(userData);
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