// This script creates sample patient data in the database
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

async function seedPatientData() {
    // Connection URL
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);

    try {
        // Connect to the MongoDB server
        await client.connect();
        console.log('Connected to MongoDB server');

        // Get the database
        const db = client.db('medicare');

        // Check if we already have patients
        const patientCount = await db.collection('patients').countDocuments();

        if (patientCount > 0) {
            console.log(`${patientCount} patients already exist, skipping patient creation`);
            return;
        }

        // Sample patients data
        const patients = [
            {
                _id: new ObjectId(),
                resourceType: 'Patient',
                id: new ObjectId().toString(),
                active: true,
                name: [
                    {
                        use: 'official',
                        family: 'Smith',
                        given: ['John']
                    }
                ],
                gender: 'male',
                birthDate: '1980-06-15',
                address: [
                    {
                        use: 'home',
                        type: 'physical',
                        line: ['123 Main St'],
                        city: 'Springfield',
                        state: 'IL',
                        postalCode: '62701'
                    }
                ],
                telecom: [
                    {
                        system: 'phone',
                        value: '555-123-4567',
                        use: 'home'
                    },
                    {
                        system: 'email',
                        value: 'john.smith@example.com',
                        use: 'work'
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                _id: new ObjectId(),
                resourceType: 'Patient',
                id: new ObjectId().toString(),
                active: true,
                name: [
                    {
                        use: 'official',
                        family: 'Johnson',
                        given: ['Sarah']
                    }
                ],
                gender: 'female',
                birthDate: '1992-09-21',
                address: [
                    {
                        use: 'home',
                        type: 'physical',
                        line: ['456 Oak Avenue'],
                        city: 'Riverdale',
                        state: 'NY',
                        postalCode: '10471'
                    }
                ],
                telecom: [
                    {
                        system: 'phone',
                        value: '555-987-6543',
                        use: 'mobile'
                    },
                    {
                        system: 'email',
                        value: 'sarah.johnson@example.com',
                        use: 'work'
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                _id: new ObjectId(),
                resourceType: 'Patient',
                id: new ObjectId().toString(),
                active: true,
                name: [
                    {
                        use: 'official',
                        family: 'Rodriguez',
                        given: ['Carlos']
                    }
                ],
                gender: 'male',
                birthDate: '1975-03-12',
                address: [
                    {
                        use: 'home',
                        type: 'physical',
                        line: ['789 Pine Street'],
                        city: 'Los Angeles',
                        state: 'CA',
                        postalCode: '90001'
                    }
                ],
                telecom: [
                    {
                        system: 'phone',
                        value: '555-678-9012',
                        use: 'home'
                    },
                    {
                        system: 'email',
                        value: 'carlos.rodriguez@example.com',
                        use: 'work'
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        // Insert patients data
        const result = await db.collection('patients').insertMany(patients);
        console.log(`${result.insertedCount} patients created`);

        // Also insert into fhir_resources collection for general queries
        const fhirResources = patients.map(patient => ({
            ...patient,
            resourceType: 'Patient',
            resourceId: patient.id
        }));

        await db.collection('fhir_resources').deleteMany({ resourceType: 'Patient' });
        console.log('Cleared existing Patient resources from fhir_resources collection');

        await db.collection('fhir_resources').insertMany(fhirResources);
        console.log(`${fhirResources.length} FHIR resources created`);

        console.log('Patient data seeding completed successfully');
    } catch (error) {
        console.error('An error occurred while seeding the database:', error);
    } finally {
        // Close the connection
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Run the seeding function
seedPatientData().catch(console.error); 