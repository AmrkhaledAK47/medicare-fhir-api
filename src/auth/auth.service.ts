import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserStatus, UserRole, User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { AccessCodesService } from '../access-codes/access-codes.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private accessCodesService: AccessCodesService
    ) { }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.status === UserStatus.PENDING) {
            throw new BadRequestException('Account not activated. Please complete registration with your access code');
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new BadRequestException('Your account is inactive. Please contact an administrator');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateToken(user);
    }

    async register(registerDto: RegisterDto) {
        const { email, accessCode } = registerDto;
        console.log('Register called with email:', email, 'accessCode:', accessCode);

        try {
            // Check if user already exists and is active
            const existingUser = await this.usersService.findByEmail(email);
            console.log('Existing user check:', existingUser ? 'Found' : 'Not found');

            if (existingUser && existingUser.status === UserStatus.ACTIVE) {
                console.log('User exists and is active, throwing ConflictException');
                throw new ConflictException('User with this email already exists');
            }

            // Check if this is the first user being created (first admin exception)
            const userCount = await this.usersService.countUsers();
            console.log('Current user count:', userCount);

            // If access code is not provided and this isn't the first user, reject
            if (!accessCode && userCount > 0) {
                console.log('Access code required for non-first user');
                throw new BadRequestException('Access code is required for registration');
            }

            let verifiedAccessCode = null;

            // If access code is provided, verify it
            if (accessCode) {
                try {
                    console.log('Verifying access code:', accessCode);
                    // Verify the access code first
                    const accessCodeModel = await this.accessCodesService.verify(accessCode);
                    console.log('Access code verified successfully:', accessCodeModel);

                    // Store it for later use
                    verifiedAccessCode = accessCodeModel;

                    // Validate that the email matches the one the code was sent to
                    if (accessCodeModel.recipientEmail && accessCodeModel.recipientEmail !== email) {
                        console.log('Email mismatch:', accessCodeModel.recipientEmail, 'vs', email);
                        throw new BadRequestException('Access code is not valid for this email address');
                    }
                } catch (error) {
                    console.error('Access code verification failed:', error);
                    throw new BadRequestException(`Invalid access code: ${error.message}`);
                }
            }

            // Create the user with any FHIR resource information from the access code
            const fhirResourceInfo = verifiedAccessCode ? {
                fhirResourceId: verifiedAccessCode.resourceId,
                fhirResourceType: verifiedAccessCode.resourceType,
                role: verifiedAccessCode.role.toLowerCase() as UserRole
            } : null;

            console.log('Creating user with FHIR resource info:', fhirResourceInfo);
            const user = await this.usersService.create(registerDto, fhirResourceInfo);
            console.log('User created successfully:', user._id);

            // Mark the access code as used
            if (verifiedAccessCode) {
                console.log('Marking access code as used:', accessCode);
                await this.accessCodesService.markAsUsed(accessCode, user.id);
                console.log('Access code marked as used');
            }

            return this.generateToken(user);
        } catch (error) {
            console.error('Registration error:', error);
            if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error; // Re-throw validation errors
            }
            throw new InternalServerErrorException('Failed to create user account');
        }
    }

    private generateToken(user: any) {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            role: user.role
        };

        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phone: user.phone,
                profileImageUrl: user.profileImageUrl,
                fhirResourceId: user.fhirResourceId,
                fhirResourceType: user.fhirResourceType
            },
        };
    }

    async validateUser(userId: string) {
        return this.usersService.findById(userId);
    }

    // Verify an access code directly
    async verifyAccessCode(email: string, accessCode: string) {
        const user = await this.usersService.verifyAccessCode(email, accessCode);
        return { valid: true, user: { email: user.email, name: user.name } };
    }

    // Request a password reset
    async requestPasswordReset(email: string) {
        const user = await this.usersService.findByEmail(email) as UserDocument;

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate a reset code
        const resetCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const resetCodeExpires = new Date();
        resetCodeExpires.setHours(resetCodeExpires.getHours() + 1); // expires in 1 hour

        // Update user with reset code
        user.resetCode = resetCode;
        user.resetCodeExpires = resetCodeExpires;
        await user.save();

        // Send reset code email
        await this.emailService.sendPasswordResetCode(email, user.name, resetCode);

        return { message: 'Password reset code has been sent to your email' };
    }

    // Reset password with code
    async resetPassword(email: string, resetCode: string, newPassword: string) {
        const user = await this.usersService.findByEmail(email) as UserDocument;

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.resetCode || !user.resetCodeExpires) {
            throw new BadRequestException('No reset code was requested');
        }

        // Verify reset code
        if (!user.verifyResetCode(resetCode)) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        // Update password
        user.password = newPassword;
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        await user.save();

        return { message: 'Password has been reset successfully' };
    }

    // Get current user profile
    async getUserProfile(userInfo: any) {
        console.log('getUserProfile called with userInfo:', userInfo);

        // If userInfo is already the user object, use it directly
        if (userInfo._id) {
            const userObj = userInfo;

            return {
                success: true,
                data: {
                    id: userObj._id || userObj.id,
                    name: userObj.name,
                    email: userObj.email,
                    role: userObj.role,
                    status: userObj.status,
                    phone: userObj.phone,
                    profileImageUrl: userObj.profileImageUrl,
                    fhirResourceId: userObj.fhirResourceId,
                    fhirResourceType: userObj.fhirResourceType,
                    permissions: userObj.permissions || [],
                    createdAt: userObj.createdAt,
                    updatedAt: userObj.updatedAt
                }
            };
        }

        // Otherwise, try to find the user by ID
        const user = await this.usersService.findById(userInfo.sub);
        console.log('User found:', user);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Convert user to plain object safely
        const userObj = user as any;

        return {
            success: true,
            data: {
                id: userObj._id || userObj.id,
                name: userObj.name,
                email: userObj.email,
                role: userObj.role,
                status: userObj.status,
                phone: userObj.phone,
                profileImageUrl: userObj.profileImageUrl,
                fhirResourceId: userObj.fhirResourceId,
                fhirResourceType: userObj.fhirResourceType,
                permissions: userObj.permissions || [],
                createdAt: userObj.createdAt,
                updatedAt: userObj.updatedAt
            }
        };
    }
} 