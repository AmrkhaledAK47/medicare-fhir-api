// This script creates an admin user in the database
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seedAdminUser() {
    // Connection URL
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);

    try {
        // Connect to the MongoDB server
        await client.connect();
        console.log('Connected to MongoDB server');

        // Get the database
        const db = client.db('medicare');

        // Check if admin user already exists
        const existingUser = await db.collection('users').findOne({ email: 'admin@medicare.com' });

        if (existingUser) {
            console.log('Admin user already exists');
            return;
        }

        // Generate hashed password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('AdminPass123!', saltRounds);

        // Create admin user
        const adminUser = {
            name: 'Admin User',
            email: 'admin@medicare.com',
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert admin user into the database
        const result = await db.collection('users').insertOne(adminUser);
        console.log(`Admin user created with ID: ${result.insertedId}`);

        console.log('Database seeding completed successfully');
    } catch (error) {
        console.error('An error occurred while seeding the database:', error);
    } finally {
        // Close the connection
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Run the seeding function
seedAdminUser().catch(console.error); 