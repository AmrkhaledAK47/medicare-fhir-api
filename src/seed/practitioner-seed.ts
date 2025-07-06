import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, UserStatus, UserDocument } from '../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PractitionerSeedService {
    private readonly logger = new Logger(PractitionerSeedService.name);

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async seed() {
        this.logger.log('Starting practitioner seed...');

        // Create test practitioner account
        await this.createPractitioner();

        // Create test patient accounts
        await this.createPatients();

        this.logger.log('Practitioner seed completed successfully');
    }

    private async createPractitioner() {
        const email = 'doctor@med.com';

        // Check if practitioner already exists
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            this.logger.log(`Practitioner with email ${email} already exists, skipping creation`);
            return;
        }

        // Create practitioner user
        const hashedPassword = await bcrypt.hash('Doctor123!', 10);
        const practitioner = new this.userModel({
            email,
            password: hashedPassword,
            name: 'Dr. Jane Smith',
            role: UserRole.PRACTITIONER,
            status: UserStatus.ACTIVE,
            fhirResourceId: `practitioner-${uuidv4()}`,
            fhirResourceType: 'Practitioner',
            phone: '+1-555-123-4567',
            profileImageUrl: 'https://example.com/profiles/jane-smith.jpg',
            isEmailVerified: true
        });

        await practitioner.save();
        this.logger.log(`Created practitioner: ${practitioner.email} (${practitioner._id})`);
    }

    private async createPatients() {
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
            // Check if patient already exists
            const existingUser = await this.userModel.findOne({ email: patient.email });
            if (existingUser) {
                this.logger.log(`Patient with email ${patient.email} already exists, skipping creation`);
                continue;
            }

            // Create patient user
            const hashedPassword = await bcrypt.hash(patient.password, 10);
            const newPatient = new this.userModel({
                email: patient.email,
                password: hashedPassword,
                name: patient.name,
                role: UserRole.PATIENT,
                status: UserStatus.ACTIVE,
                fhirResourceId: patient.fhirResourceId,
                fhirResourceType: 'Patient',
                phone: patient.phone,
                isEmailVerified: true
            });

            await newPatient.save();
            this.logger.log(`Created patient: ${newPatient.email} (${newPatient._id})`);
        }
    }
} 