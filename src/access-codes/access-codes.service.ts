import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { AccessCode, AccessCodeDocument } from './schemas/access-code.schema';
import { CreateAccessCodeDto } from './dto/create-access-code.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccessCodesService {
    constructor(
        @InjectModel(AccessCode.name) private accessCodeModel: Model<AccessCodeDocument>,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService
    ) { }

    /**
     * Generate a random access code
     */
    private generateCode(): string {
        return randomBytes(5).toString('hex').toUpperCase();
    }

    /**
     * Create a new access code
     */
    async create(createAccessCodeDto: CreateAccessCodeDto): Promise<AccessCode> {
        const code = this.generateCode();

        // Default expiration to 7 days if not provided
        const expiresAt = createAccessCodeDto.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const accessCode = new this.accessCodeModel({
            code,
            role: createAccessCodeDto.role,
            expiresAt,
            used: false,
            resourceId: createAccessCodeDto.resourceId,
            resourceType: createAccessCodeDto.resourceType,
            recipientEmail: createAccessCodeDto.recipientEmail
        });

        const savedCode = await accessCode.save();

        // Send email if recipient email is provided
        if (createAccessCodeDto.recipientEmail) {
            await this.sendAccessCodeEmail(
                createAccessCodeDto.recipientEmail,
                code,
                createAccessCodeDto.role,
                expiresAt,
                createAccessCodeDto.resourceType,
                createAccessCodeDto.resourceId
            );
        }

        return savedCode;
    }

    /**
     * Send access code via email
     */
    private async sendAccessCodeEmail(
        email: string,
        code: string,
        role: string,
        expiresAt: Date,
        resourceType?: string,
        resourceId?: string
    ): Promise<void> {
        const appName = this.configService.get<string>('app.name') || 'MediCare FHIR API';
        const appUrl = this.configService.get<string>('app.url') || 'http://localhost:3000';

        const expirationDate = expiresAt.toLocaleDateString();

        let roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
        let resourceInfo = '';

        if (resourceType && resourceId) {
            resourceInfo = `<p>A ${resourceType} resource has been created for you with ID: ${resourceId}</p>`;
        }

        const subject = `Your ${appName} Access Code`;
        const html = `
            <h1>Welcome to ${appName}</h1>
            <p>You have been invited to join as a <strong>${roleDisplay}</strong>.</p>
            ${resourceInfo}
            <p>Your access code is: <strong>${code}</strong></p>
            <p>This code will expire on ${expirationDate}.</p>
            <p>To complete your registration, please visit <a href="${appUrl}/register">${appUrl}/register</a> and enter this code when prompted.</p>
            <p>If you did not request this code, please ignore this email.</p>
        `;

        await this.emailService.sendEmail(email, subject, html);
    }

    /**
     * Create multiple access codes at once and optionally send emails
     */
    async createBatch(
        role: string,
        count: number,
        expiresAt?: Date,
        sendEmails: boolean = false,
        emails?: string[]
    ): Promise<AccessCode[]> {
        const codes: AccessCode[] = [];

        // Validate emails if sendEmails is true
        if (sendEmails && emails) {
            if (emails.length !== count) {
                throw new BadRequestException('Number of emails must match the number of codes to create');
            }
        }

        for (let i = 0; i < count; i++) {
            const createDto = new CreateAccessCodeDto();
            createDto.role = role;
            createDto.expiresAt = expiresAt;

            // Add recipient email if sending emails
            if (sendEmails && emails && emails[i]) {
                createDto.recipientEmail = emails[i];
            }

            const code = await this.create(createDto);
            codes.push(code);
        }

        return codes;
    }

    /**
     * Verify an access code
     */
    async verify(code: string): Promise<AccessCode> {
        const accessCode = await this.accessCodeModel.findOne({ code }).exec();

        if (!accessCode) {
            throw new NotFoundException('Access code not found');
        }

        if (accessCode.used) {
            throw new BadRequestException('Access code has already been used');
        }

        if (accessCode.expiresAt < new Date()) {
            throw new BadRequestException('Access code has expired');
        }

        return accessCode;
    }

    /**
     * Mark an access code as used
     */
    async markAsUsed(code: string, userId?: string): Promise<void> {
        const result = await this.accessCodeModel.updateOne(
            { code },
            {
                used: true,
                usedAt: new Date(),
                usedBy: userId
            }
        ).exec();

        if (result.matchedCount === 0) {
            throw new NotFoundException('Access code not found');
        }
    }

    /**
     * Get all access codes (for admin purposes)
     */
    async findAll(filters?: any): Promise<AccessCode[]> {
        let query = {};

        if (filters) {
            if (filters.role) {
                query['role'] = filters.role;
            }

            if (filters.used !== undefined) {
                query['used'] = filters.used;
            }

            if (filters.expired !== undefined) {
                if (filters.expired) {
                    query['expiresAt'] = { $lt: new Date() };
                } else {
                    query['expiresAt'] = { $gte: new Date() };
                }
            }
        }

        return this.accessCodeModel.find(query).sort({ createdAt: -1 }).exec();
    }

    /**
     * Resend an access code email
     */
    async resendAccessCodeEmail(codeId: string, email: string): Promise<void> {
        const accessCode = await this.accessCodeModel.findById(codeId).exec();

        if (!accessCode) {
            throw new NotFoundException('Access code not found');
        }

        await this.sendAccessCodeEmail(
            email,
            accessCode.code,
            accessCode.role,
            accessCode.expiresAt,
            accessCode.resourceType,
            accessCode.resourceId
        );
    }
} 