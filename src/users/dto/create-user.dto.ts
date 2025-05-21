import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
    @ApiProperty({
        description: 'User full name',
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @ApiProperty({
        description: 'User email',
        example: 'user@example.com'
    })
    @IsEmail({}, { message: 'Please provide a valid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        description: 'User role',
        enum: UserRole,
        example: UserRole.PATIENT
    })
    @IsEnum(UserRole)
    @IsNotEmpty({ message: 'Role is required' })
    role: UserRole;

    @ApiProperty({
        description: 'Phone number',
        example: '+1234567890',
        required: false
    })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        description: 'FHIR resource ID',
        example: '123456',
        required: false
    })
    @IsString()
    @IsOptional()
    fhirResourceId?: string;

    @ApiProperty({
        description: 'FHIR resource type',
        example: 'Patient or Practitioner',
        required: false
    })
    @IsString()
    @IsOptional()
    fhirResourceType?: string;
} 