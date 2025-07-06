import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, UserStatus, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { EmailService } from '../email/email.service';
import { FhirService } from '../fhir/fhir.service';
import { CreateUserWithResourceDto } from './dto/create-user-with-resource.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import * as crypto from 'crypto';
import { Role } from '../auth/guards/roles.guard';
import { Logger } from '@nestjs/common';
import { AccessCodesService } from '../access-codes/access-codes.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly emailService: EmailService,
        private readonly fhirService: FhirService,
        private readonly accessCodesService: AccessCodesService
    ) { }

    async create(registerDto: RegisterDto, fhirResourceInfo?: { fhirResourceId: string, fhirResourceType: string, role: UserRole }): Promise<UserDocument> {
        const { email, password, name, phone, accessCode } = registerDto;

        // Check if user already exists (by email)
        const existingUser = await this.userModel.findOne({ email });

        // Handle existing user that is pending completion
        if (existingUser && existingUser.status === UserStatus.PENDING) {
            // Update the existing user with the provided password and name
            existingUser.password = password; // Let the pre-save hook handle hashing
            existingUser.name = name;

            if (phone) {
                existingUser.phone = phone;
            }

            // If we have FHIR resource info from an access code, use it
            if (fhirResourceInfo) {
                existingUser.fhirResourceId = fhirResourceInfo.fhirResourceId;
                existingUser.fhirResourceType = fhirResourceInfo.fhirResourceType;
                existingUser.role = fhirResourceInfo.role;
            }

            // Mark the user as active
            existingUser.status = UserStatus.ACTIVE;
            existingUser.accessCode = null; // Clear the access code

            await existingUser.save();
            return existingUser;
        }

        // Determine the role (first user is admin, else use what's provided)
        const userCount = await this.countUsers();
        let role = userCount === 0 ? UserRole.ADMIN : UserRole.PATIENT;

        // If we have FHIR resource info from the access code, use that role
        if (fhirResourceInfo) {
            role = fhirResourceInfo.role;
        }

        // Create the new user
        const user = new this.userModel({
            email,
            password, // Let the pre-save hook handle hashing
            name,
            phone,
            role,
            status: UserStatus.ACTIVE,
            // Set FHIR resource info if we have it
            ...(fhirResourceInfo && {
                fhirResourceId: fhirResourceInfo.fhirResourceId,
                fhirResourceType: fhirResourceInfo.fhirResourceType
            })
        });

        return user.save();
    }

    // Method for admins to create user profiles
    async createUserProfile(createUserDto: CreateUserDto): Promise<User> {
        const { name, email } = createUserDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Generate a random access code
        const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const accessCodeExpires = new Date();
        accessCodeExpires.setHours(accessCodeExpires.getHours() + 24); // Code expires in 24 hours

        // Create a new user with pending status
        const newUser = new this.userModel({
            ...createUserDto,
            status: UserStatus.PENDING,
            accessCode,
            accessCodeExpires,
            // Generate a temporary password that will be replaced during registration
            password: crypto.randomBytes(16).toString('hex')
        });

        await newUser.save();

        // Send email with access code
        await this.emailService.sendRegistrationCode(email, name, accessCode);

        return newUser;
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.userModel.findById(id).exec();
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async update(userId: string, userData: Partial<User>): Promise<User> {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: userData },
            { new: true },
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async remove(userId: string): Promise<boolean> {
        const result = await this.userModel.deleteOne({ _id: userId }).exec();
        return result.deletedCount > 0;
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    // Find users by role
    async findByRole(role: Role): Promise<User[]> {
        return this.userModel.find({ role }).exec();
    }

    // Find users by FHIR resource type and ID
    async findByFhirResource(resourceType: string, resourceId: string): Promise<User | null> {
        return this.userModel.findOne({
            fhirResourceType: resourceType,
            fhirResourceId: resourceId
        }).exec();
    }

    // Verify access code
    async verifyAccessCode(email: string, accessCode: string): Promise<UserDocument> {
        const user = await this.userModel.findOne({ email });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.status !== UserStatus.PENDING) {
            throw new ConflictException('User account is already activated');
        }

        if (!user.verifyAccessCode(accessCode)) {
            throw new BadRequestException('Invalid or expired access code');
        }

        return user;
    }

    // Regenerate and send access code
    async regenerateAccessCode(email: string): Promise<void> {
        const user = await this.userModel.findOne({ email }) as UserDocument;
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate a new access code
        const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const accessCodeExpires = new Date();
        accessCodeExpires.setHours(accessCodeExpires.getHours() + 24);

        user.accessCode = accessCode;
        user.accessCodeExpires = accessCodeExpires;

        await user.save();

        // Send email with new access code
        await this.emailService.sendRegistrationCode(email, user.name, accessCode);
    }

    // Count the total number of users in the system
    async countUsers(): Promise<number> {
        return this.userModel.countDocuments().exec();
    }

    // Create a user with a FHIR resource in one operation
    async createUserWithResource(createUserWithResourceDto: CreateUserWithResourceDto): Promise<{ user: User, resourceId: string, accessCode: string }> {
        const { name, email, role, phone, resourceData } = createUserWithResourceDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Determine the resource type based on the role
        const resourceType = role === UserRole.PATIENT ? 'Patient' : 'Practitioner';

        // Ensure the resourceData has the correct resourceType
        const resourceToCreate = {
            ...resourceData,
            resourceType: resourceType
        };

        try {
            // Create the FHIR resource
            const createdResource = await this.fhirService.createResource(resourceType, resourceToCreate);
            const resourceId = createdResource.id;

            // Generate a random access code
            const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            const accessCodeExpires = new Date();
            accessCodeExpires.setDate(accessCodeExpires.getDate() + 7); // Code expires in 7 days

            // Create a new user with pending status
            const newUser = new this.userModel({
                name,
                email,
                role,
                phone,
                status: UserStatus.PENDING,
                accessCode,
                accessCodeExpires,
                fhirResourceId: resourceId,
                fhirResourceType: resourceType,
                // Generate a temporary password that will be replaced during registration
                password: crypto.randomBytes(16).toString('hex')
            });

            await newUser.save();

            // Send email with access code
            await this.emailService.sendRegistrationCode(email, name, accessCode);

            return {
                user: newUser,
                resourceId,
                accessCode
            };
        } catch (error) {
            throw new BadRequestException(`Failed to create user with resource: ${error.message}`);
        }
    }

    async updateAvatar(userId: string, file: any): Promise<{ message: string; avatarUrl: string }> {
        const user = await this.findById(userId);

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // The file path based on our static file serving configuration
        const avatarUrl = `/uploads/${file.filename}`;

        // Update the user's profile image URL in MongoDB
        await this.userModel.findByIdAndUpdate(userId, {
            profileImageUrl: avatarUrl
        });

        // If the user has a FHIR resource, update it with the photo
        if (user.fhirResourceId && user.fhirResourceType) {
            try {
                // Get the current FHIR resource
                const resource = await this.fhirService.getResource(
                    user.fhirResourceType,
                    user.fhirResourceId
                );

                // Add or update the photo property
                if (!resource.photo) {
                    resource.photo = [];
                }

                // Create a photo entry with the URL
                const photoEntry = {
                    contentType: file.mimetype,
                    url: `${process.env.APP_EXTERNAL_URL || 'http://localhost:3000/api'}${avatarUrl}`,
                    title: `Profile photo for ${user.name}`
                };

                // Replace existing photo or add new one
                if (resource.photo.length > 0) {
                    resource.photo[0] = photoEntry;
                } else {
                    resource.photo.push(photoEntry);
                }

                // Update the FHIR resource
                await this.fhirService.updateResource(
                    user.fhirResourceType,
                    user.fhirResourceId,
                    resource
                );

                this.logger.log(`Updated FHIR resource ${user.fhirResourceType}/${user.fhirResourceId} with new photo`);
            } catch (error) {
                // Log error but don't fail the request
                this.logger.error(`Failed to update FHIR resource with photo: ${error.message}`);
            }
        }

        return {
            message: 'Avatar updated successfully',
            avatarUrl
        };
    }

    async getUserProfile(userId: string): Promise<any> {
        const user = await this.userModel.findById(userId).exec();

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const profile = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            phone: user.phone,
            profileImageUrl: user.profileImageUrl,
            isEmailVerified: user.isEmailVerified,
            fhirDetails: null
        };

        // If the user has a FHIR resource, fetch it
        if (user.fhirResourceId && user.fhirResourceType) {
            try {
                const fhirResource = await this.fhirService.getResource(
                    user.fhirResourceType,
                    user.fhirResourceId
                );

                profile.fhirDetails = {
                    resourceType: user.fhirResourceType,
                    id: user.fhirResourceId,
                    details: fhirResource
                };
            } catch (error) {
                // Log error but don't fail the request
                console.error(`Failed to fetch FHIR resource for user ${userId}:`, error);
                profile.fhirDetails = { error: 'Failed to fetch FHIR resource' };
            }
        }

        return profile;
    }

    /**
     * Create a patient with FHIR resource and send access code in one step
     * 
     * @param patientData The patient data to create
     * @param email The email to send the access code to
     * @returns The created patient resource and access code
     */
    async createPatientWithAccessCode(patientData: any, email: string): Promise<any> {
        this.logger.log(`Creating patient with access code for email: ${email}`);

        try {
            // 1. Create the FHIR patient resource
            const patientResource = await this.fhirService.createFhirResource('Patient', patientData);

            // 2. Generate an access code
            const accessCode = await this.accessCodesService.create({
                role: 'patient',
                recipientEmail: email,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            // 3. Store the relationship between the access code and the patient resource
            // This could be stored in a separate collection or as metadata on the patient

            this.logger.log(`Successfully created patient resource with ID ${patientResource.id} and sent access code to ${email}`);

            return {
                success: true,
                data: {
                    patient: patientResource,
                    accessCode: accessCode.code
                }
            };
        } catch (error) {
            this.logger.error(`Failed to create patient with access code: ${error.message}`);
            throw error;
        }
    }

    // Create an admin user directly (only callable by existing admins)
    async createAdminUser(createAdminDto: CreateAdminDto): Promise<User> {
        const { email, password, name } = createAdminDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Create a new admin user with active status
        const adminUser = new this.userModel({
            email,
            password, // Password will be hashed by the pre-save hook
            name,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        this.logger.log(`Creating new admin user with email: ${email}`);
        return adminUser.save();
    }
} 