import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'User email',
        example: 'user@example.com'
    })
    @IsEmail({}, { message: 'Please provide a valid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'password123',
        minLength: 8
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
} 