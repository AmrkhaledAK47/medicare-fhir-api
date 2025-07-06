import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
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
        description: 'User password',
        example: 'Password123!',
        minLength: 8
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
    })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;

    @ApiProperty({
        description: 'Repeat password for confirmation',
        example: 'Password123!'
    })
    @IsString()
    @IsNotEmpty({ message: 'Password confirmation is required' })
    repeatPassword: string;

    @ApiProperty({
        description: 'Access code for registration (required for all accounts except first admin)',
        example: 'ABC123XYZ',
        required: false
    })
    @IsString()
    @IsOptional()
    accessCode?: string;

    @ApiProperty({
        description: 'Phone number',
        example: '+1234567890',
        required: false
    })
    @IsString()
    @IsOptional()
    phone?: string;
} 