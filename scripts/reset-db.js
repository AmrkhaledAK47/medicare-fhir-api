const { MongoClient } = require('mongodb');

async function resetDatabase() {
    const client = new MongoClient('mongodb://medicare-mongodb:27017/medicare');
    
    try {
        console.log('Connecting to database...');
        await client.connect();
        const db = client.db();
        
        // Delete all users except admin
        const usersResult = await db.collection('users').deleteMany({
            email: { $ne: 'admin@test.com' }
        });
        console.log(`Deleted ${usersResult.deletedCount} users`);
        
        // Delete all access codes
        const accessCodesResult = await db.collection('accesscodes').deleteMany({});
        console.log(`Deleted ${accessCodesResult.deletedCount} access codes`);
        
        console.log('Database reset complete');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await client.close();
    }
}

resetDatabase(); 