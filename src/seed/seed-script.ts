import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase() {
    console.log('Starting database seed...');

    // Connect to MongoDB
    const uri = 'mongodb://localhost:27017/medicare';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Create practitioner
        const practitionerEmail = 'doctor@med.com';
        const existingPractitioner = await usersCollection.findOne({ email: practitionerEmail });

        if (!existingPractitioner) {
            const practitionerPassword = await bcrypt.hash('Doctor123!', 10);
            const practitioner = {
                email: practitionerEmail,
                password: practitionerPassword,
                name: 'Dr. Jane Smith',
                role: 'practitioner',
                status: 'active',
                fhirResourceId: `practitioner-${uuidv4()}`,
                fhirResourceType: 'Practitioner',
                phone: '+1-555-123-4567',
                profileImageUrl: 'https://example.com/profiles/jane-smith.jpg',
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await usersCollection.insertOne(practitioner);
            console.log(`Created practitioner: ${practitioner.email}`);
        } else {
            console.log(`Practitioner with email ${practitionerEmail} already exists, skipping creation`);
        }

        // Create patients
        const patients = [
            {
                email: 'patient@example.com',
                password: 'Patient123!',
                name: 'John Doe',
                fhirResourceId: `patient-${uuidv4()}`,
                phone: '+1-555-987-6543'
            },
            {
                email: 'alice@example.com',
                password: 'Patient123!',
                name: 'Alice Johnson',
                fhirResourceId: `patient-${uuidv4()}`,
                phone: '+1-555-456-7890'
            },
            {
                email: 'bob@example.com',
                password: 'Patient123!',
                name: 'Bob Williams',
                fhirResourceId: `patient-${uuidv4()}`,
                phone: '+1-555-234-5678'
            }
        ];

        for (const patient of patients) {
            const existingPatient = await usersCollection.findOne({ email: patient.email });

            if (!existingPatient) {
                const patientPassword = await bcrypt.hash(patient.password, 10);
                const newPatient = {
                    email: patient.email,
                    password: patientPassword,
                    name: patient.name,
                    role: 'patient',
                    status: 'active',
                    fhirResourceId: patient.fhirResourceId,
                    fhirResourceType: 'Patient',
                    phone: patient.phone,
                    isEmailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await usersCollection.insertOne(newPatient);
                console.log(`Created patient: ${newPatient.email}`);
            } else {
                console.log(`Patient with email ${patient.email} already exists, skipping creation`);
            }
        }

        console.log('Database seed completed successfully');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seed function
seedDatabase()
    .then(() => console.log('Seed script completed'))
    .catch(err => console.error('Seed script failed:', err))
    .finally(() => process.exit(0)); 