#!/usr/bin/env node

/**
 * This script resets the database by removing all users and creates a new admin account
 * with predefined credentials. Use with caution as it will delete all existing user data.
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicare';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

// Check for --force flag
const forceMode = process.argv.includes('--force');

// Create readline interface for confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetAndCreateAdmin(skipConfirmation = false) {
    const performReset = async () => {
        const client = new MongoClient(MONGODB_URI);

        try {
            // Connect to MongoDB
            await client.connect();
            console.log('✅ Connected to MongoDB');

            const db = client.db();

            // Delete all users
            const deleteResult = await db.collection('users').deleteMany({});
            console.log(`🗑️  Deleted ${deleteResult.deletedCount} user(s) from the database`);

            // Generate hashed password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

            // Create new admin user
            const adminUser = {
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Insert admin user
            const result = await db.collection('users').insertOne(adminUser);
            console.log(`✅ Admin user created with ID: ${result.insertedId}`);
            console.log(`📧 Email: ${ADMIN_EMAIL}`);
            console.log(`🔑 Password: ${ADMIN_PASSWORD}`);

            console.log('\n✅ Database reset completed successfully');
        } catch (error) {
            console.error('❌ An error occurred:', error);
        } finally {
            await client.close();
            console.log('📡 MongoDB connection closed');
            if (rl.close) rl.close();
        }
    };

    if (skipConfirmation) {
        await performReset();
    } else {
        // Ask for confirmation
        rl.question('⚠️  WARNING: This will delete ALL users from the database. Are you sure? (yes/no): ', async (answer) => {
            if (answer.toLowerCase() !== 'yes') {
                console.log('Operation cancelled.');
                rl.close();
                return;
            }

            await performReset();
        });
    }
}

// Run the script
resetAndCreateAdmin(forceMode); 