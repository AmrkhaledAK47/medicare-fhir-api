import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, UserStatus, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import { Role } from '../auth/guards/roles.guard';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly emailService: EmailService
    ) { }

    async create(registerDto: RegisterDto): Promise<UserDocument> {
        const { name, email, password, phone, accessCode } = registerDto;

        if (registerDto.password !== registerDto.repeatPassword) {
            throw new ConflictException('Passwords do not match');
        }

        // If access code provided, verify it
        if (accessCode) {
            const pendingUser = await this.verifyAccessCode(email, accessCode);

            // Update the existing user with the provided password
            pendingUser.password = password;
            pendingUser.status = UserStatus.ACTIVE;
            pendingUser.isEmailVerified = true;
            if (phone) pendingUser.phone = phone;

            await pendingUser.save();
            return pendingUser;
        }

        // Direct registration without access code (for admin users or if allowed)
        const newUser = new this.userModel({
            name,
            email,
            password,
            role: UserRole.ADMIN, // Only admins can register directly
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
            phone
        });

        return newUser.save();
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
} 