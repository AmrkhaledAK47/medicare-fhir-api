import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserWithResourceDto {
    @ApiProperty({
        description: 'User full name',
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty({ message: 'Full name is required' })
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
        enum: [UserRole.PATIENT, UserRole.PRACTITIONER],
        example: 'patient'
    })
    @IsString()
    @IsIn([UserRole.PATIENT, UserRole.PRACTITIONER], {
        message: 'Role must be either patient or practitioner'
    })
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
        description: 'FHIR resource data',
        example: {
            resourceType: 'Patient',
            active: true,
            name: [{ family: 'Doe', given: ['John'] }],
            gender: 'male',
            birthDate: '1970-01-01'
        }
    })
    @IsObject()
    @IsNotEmpty({ message: 'Resource data is required' })
    resourceData: Record<string, any>;
} 