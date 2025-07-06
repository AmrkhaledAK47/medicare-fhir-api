const { MongoClient } = require('mongodb');

async function findUsers() {
    const client = new MongoClient('mongodb://medicare-mongodb:27017/medicare');

    try {
        await client.connect();
        const db = client.db();
        const users = await db.collection('users').find({}).toArray();

        console.log(`Found ${users.length} users in the database:`);
        console.log('--------------------------------------');

        users.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.name}`);
            console.log(`Role: ${user.role}`);
            console.log(`Status: ${user.status}`);
            console.log(`Password exists: ${!!user.password}`);
            console.log(`FHIR Resource ID: ${user.fhirResourceId || 'none'}`);
            console.log(`FHIR Resource Type: ${user.fhirResourceType || 'none'}`);
            console.log('--------------------------------------');
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

findUsers(); 