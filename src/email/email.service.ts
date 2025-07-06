import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private emailEnabled = true;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private async initializeTransporter() {
        const emailConfig = this.configService.get('app.email') || {};

        // Check if required email configuration is available
        if (!emailConfig || !emailConfig.user || !emailConfig.password) {
            this.logger.warn('Email credentials not provided. Email sending will be disabled.');
            this.emailEnabled = false;
            return;
        }

        this.transporter = nodemailer.createTransport({
            service: emailConfig.service,
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.port === 465, // true for 465, false for other ports
            auth: {
                user: emailConfig.user,
                pass: emailConfig.password,
            },
        });

        // Verify connection configuration
        try {
            await this.transporter.verify();
            this.logger.log('SMTP connection established successfully');
            this.emailEnabled = true;
        } catch (error) {
            this.logger.error(`Failed to establish SMTP connection: ${error.message}`);

            // Provide more specific guidance for common Gmail errors
            if (error.message.includes('Application-specific password required')) {
                this.logger.error(`
                Gmail security requires an app-specific password for SMTP access.
                Please follow these steps:
                1. Enable 2-Step Verification on your Google account
                2. Generate an App Password at https://myaccount.google.com/apppasswords
                3. Use that App Password in your .env file instead of your regular password
                `);
            } else if (error.message.includes('Invalid login')) {
                this.logger.error('Email credentials are incorrect or not accepted by the provider');
            }

            this.logger.warn('Email sending will be disabled. Using console logging instead.');
            this.emailEnabled = false;
        }
    }

    /**
     * Generic method to send an email
     * 
     * @param to Recipient email address
     * @param subject Email subject
     * @param html Email HTML content
     * @returns Promise<boolean> Success status
     */
    async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            const emailConfig = this.configService.get('app.email') || {};

            const mailOptions = {
                from: emailConfig.from || 'noreply@medicare.com',
                to: to,
                subject: subject,
                html: html
            };

            // Always log the email to the console for development
            console.log(`========================================`);
            console.log(`EMAIL SENT TO: ${to}`);
            console.log(`SUBJECT: ${subject}`);
            console.log(`========================================`);

            // Only attempt to send email if enabled
            if (this.emailEnabled && this.transporter) {
                await this.transporter.sendMail(mailOptions);
                this.logger.log(`Email sent to ${to} with subject "${subject}"`);
            } else {
                this.logger.warn(`Email disabled. Email to ${to} logged to console only.`);
            }
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
            return false;
        }
    }

    async sendRegistrationCode(email: string, name: string, accessCode: string): Promise<boolean> {
        try {
            const emailConfig = this.configService.get('app.email') || {};

            const mailOptions = {
                from: emailConfig.from || 'noreply@medicare.com',
                to: email,
                subject: 'Complete Your MediCare Registration',
                html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="background-color: #0099cc; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">MediCare</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                        <h2>Welcome to MediCare, ${name}!</h2>
                        <p>Your account has been created. To complete your registration, please use the access code below:</p>
                        
                        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
                            <h3 style="margin: 0; font-size: 24px; letter-spacing: 2px;">${accessCode}</h3>
                        </div>
                        
                        <p>This code will expire in 24 hours.</p>
                        
                        <p>If you did not request this account, please disregard this email.</p>
                        
                        <p style="margin-top: 30px;">Best regards,<br>The MediCare Team</p>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                        © ${new Date().getFullYear()} MediCare. All rights reserved.
                    </div>
                </div>
                `
            };

            // Always log the access code to the console for development
            console.log(`========================================`);
            console.log(`EMAIL SENT: Registration code for ${email}`);
            console.log(`ACCESS CODE: ${accessCode}`);
            console.log(`========================================`);

            // Only attempt to send email if enabled
            if (this.emailEnabled && this.transporter) {
                await this.transporter.sendMail(mailOptions);
                this.logger.log(`Registration code sent to ${email}`);
            } else {
                this.logger.warn(`Email disabled. Registration code for ${email} logged to console only.`);
            }
            return true;
        } catch (error) {
            this.logger.error(`Failed to send registration code to ${email}: ${error.message}`);
            return false;
        }
    }

    async sendPasswordResetCode(email: string, name: string, resetCode: string): Promise<boolean> {
        const subject = 'Reset Your MediCare Password';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>We received a request to reset your password. Please use the following code to reset your password:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                    ${resetCode}
                </div>
                <p>This code will expire in 1 hour.</p>
                <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                <p>Best regards,<br>The MediCare Team</p>
            </div>
        `;

        // Always log the reset code to the console for development
        console.log(`========================================`);
        console.log(`EMAIL SENT: Password reset code for ${email}`);
        console.log(`RESET CODE: ${resetCode}`);
        console.log(`========================================`);

        try {
            const emailConfig = this.configService.get('app.email') || {};

            // Only attempt to send email if enabled
            if (this.emailEnabled && this.transporter) {
                await this.transporter.sendMail({
                    from: emailConfig.from || 'noreply@medicare.com',
                    to: email,
                    subject: subject,
                    html: html
                });
                this.logger.log(`Password reset code sent to ${email}`);
            } else {
                this.logger.warn(`Email disabled. Password reset code for ${email} logged to console only.`);
            }
            return true;
        } catch (error) {
            this.logger.error(`Failed to send password reset code to ${email}: ${error.message}`);
            return false;
        }
    }
} 