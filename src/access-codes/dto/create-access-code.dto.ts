import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsDate, IsOptional, IsEmail, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AccessCodeRole } from '../schemas/access-code.schema';

export class CreateAccessCodeDto {
    @ApiProperty({
        description: 'Role for the access code (patient, practitioner, admin)',
        example: 'patient'
    })
    @IsString()
    @IsNotEmpty()
    role: string;

    @ApiProperty({
        description: 'Email address to send the access code to (optional)',
        example: 'user@example.com',
        required: false
    })
    @IsEmail()
    @IsOptional()
    recipientEmail?: string;

    @ApiProperty({
        description: 'Expiration date for the access code',
        required: false
    })
    @IsOptional()
    expiresAt?: Date;

    @ApiProperty({
        description: 'ID of the associated FHIR resource',
        example: '123',
        required: false
    })
    @IsString()
    @IsOptional()
    resourceId?: string;

    @ApiProperty({
        description: 'Type of the associated FHIR resource',
        example: 'Patient',
        required: false
    })
    @IsString()
    @IsOptional()
    resourceType?: string;
}

export class CreateBatchAccessCodesDto {
    @ApiProperty({
        description: 'Role for the access codes',
        enum: AccessCodeRole,
        example: 'practitioner'
    })
    @IsEnum(AccessCodeRole)
    @IsNotEmpty()
    role: string;

    @ApiProperty({
        description: 'Number of access codes to generate',
        example: 5,
        minimum: 1,
        maximum: 100
    })
    @IsNotEmpty()
    @Type(() => Number)
    count: number;

    @ApiProperty({
        description: 'Expiration date for the access codes',
        example: '2030-12-31T23:59:59.999Z',
        required: false
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    expiresAt?: Date;

    @ApiProperty({
        description: 'Whether to send emails with the access codes',
        example: true,
        required: false,
        default: false
    })
    @IsOptional()
    @Type(() => Boolean)
    sendEmails?: boolean;

    @ApiProperty({
        description: 'Email addresses to send the access codes to',
        example: ['user1@example.com', 'user2@example.com'],
        required: false,
        type: [String]
    })
    @IsArray()
    @IsEmail({}, { each: true })
    @IsOptional()
    emails?: string[];
} 