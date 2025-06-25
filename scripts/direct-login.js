#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

// Common credentials to try
const credentials = [
    { email: 'admin@example.com', password: 'Admin123!' },
    { email: 'admin@medicare.com', password: 'admin' },
    { email: 'admin@medicare.com', password: 'Admin123!' },
    { email: 'admin', password: 'admin' },
    { email: 'user@example.com', password: 'password' }
];

async function tryLogin(creds) {
    try {
        console.log(`Attempting to login with ${creds.email}...`);
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: creds.email,
            password: creds.password
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
        console.error(`Login failed for ${creds.email}:`, error.response?.data || error.message);
        return null;
    }
}

// Run the script
async function main() {
    console.log('=== Direct Login Attempts ===');

    // Create postman directory if it doesn't exist
    const postmanDir = path.join(__dirname, '..', 'postman');
    if (!fs.existsSync(postmanDir)) {
        fs.mkdirSync(postmanDir);
    }

    // Try each set of credentials
    for (const creds of credentials) {
        const token = await tryLogin(creds);
        if (token) {
            console.log('\nAuthentication successful!');
            console.log('Use this token for API requests:');
            console.log(`Authorization: Bearer ${token.substring(0, 15)}...`);
            return;
        }
    }

    console.error('\nAll login attempts failed. You may need to manually create a user.');
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 