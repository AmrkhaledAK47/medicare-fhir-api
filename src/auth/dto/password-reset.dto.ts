import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetRequestDto {
    @ApiProperty({
        description: 'User email',
        example: 'user@example.com'
    })
    @IsEmail({}, { message: 'Please provide a valid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
}

export class PasswordResetConfirmDto {
    @ApiProperty({
        description: 'User email',
        example: 'user@example.com'
    })
    @IsEmail({}, { message: 'Please provide a valid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        description: 'Reset code received via email',
        example: 'ABC123XYZ'
    })
    @IsString()
    @IsNotEmpty({ message: 'Reset code is required' })
    resetCode: string;

    @ApiProperty({
        description: 'New password',
        example: 'NewPassword123!'
    })
    @IsString()
    @IsNotEmpty({ message: 'New password is required' })
    newPassword: string;
} 