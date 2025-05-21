import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserStatus, UserRole, User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService
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

        // Check if user already exists and is active
        const existingUser = await this.usersService.findByEmail(email);

        if (existingUser && existingUser.status === UserStatus.ACTIVE) {
            throw new ConflictException('User with this email already exists');
        }

        try {
            // If access code is provided, we're completing registration for a pre-created account
            if (accessCode) {
                // This will validate the access code and update the user
                await this.usersService.verifyAccessCode(email, accessCode);
            }

            const user = await this.usersService.create(registerDto);
            return this.generateToken(user);
        } catch (error) {
            if (error instanceof ConflictException || error instanceof BadRequestException) {
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
} 