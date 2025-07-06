const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// Test passwords to try
const TEST_PASSWORDS = {
    'admin@test.com': 'Admin123',
    'patient@med.com': 'Patient123!',
    'doctor@med.com': 'Doctor123!',
    'patient@example.com': 'Patient123!',
    'doctor@example.com': 'Doctor123!'
};

async function fixPasswords() {
    const client = new MongoClient('mongodb://medicare-mongodb:27017/medicare');

    try {
        await client.connect();
        const db = client.db();
        const users = await db.collection('users').find({}).toArray();

        console.log(`Found ${users.length} users in the database`);

        for (const user of users) {
            const email = user.email;
            const testPassword = TEST_PASSWORDS[email];

            if (testPassword) {
                console.log(`Fixing password for ${email}`);

                // Hash the test password directly (only once)
                const hashedPassword = await bcrypt.hash(testPassword, 10);

                // Update the user's password in the database
                const result = await db.collection('users').updateOne(
                    { email },
                    { $set: { password: hashedPassword } }
                );

                console.log(`Updated ${result.modifiedCount} user(s) with email ${email}`);
            } else {
                console.log(`No test password available for ${email}, skipping`);
            }
        }

        console.log('Password fix completed');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixPasswords(); 