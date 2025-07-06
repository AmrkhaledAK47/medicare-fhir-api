import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyAccessCodeDto } from './dto/verify-access-code.dto';
import { PasswordResetRequestDto, PasswordResetConfirmDto } from './dto/password-reset.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data'
    })
    @ApiResponse({
        status: 409,
        description: 'User with this email already exists'
    })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({
        status: 200,
        description: 'Login successful'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials'
    })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('verify-access-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify a registration access code' })
    @ApiResponse({
        status: 200,
        description: 'Access code is valid'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired access code'
    })
    async verifyAccessCode(@Body() verifyAccessCodeDto: VerifyAccessCodeDto) {
        return this.authService.verifyAccessCode(
            verifyAccessCodeDto.email,
            verifyAccessCodeDto.accessCode
        );
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({
        status: 200,
        description: 'Password reset requested successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'User not found'
    })
    async forgotPassword(@Body() passwordResetRequestDto: PasswordResetRequestDto) {
        return this.authService.requestPasswordReset(passwordResetRequestDto.email);
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with code' })
    @ApiResponse({
        status: 200,
        description: 'Password reset successful'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired reset code'
    })
    @ApiResponse({
        status: 404,
        description: 'User not found'
    })
    async resetPassword(@Body() passwordResetConfirmDto: PasswordResetConfirmDto) {
        return this.authService.resetPassword(
            passwordResetConfirmDto.email,
            passwordResetConfirmDto.resetCode,
            passwordResetConfirmDto.newPassword
        );
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async getProfile(@Req() req) {
        return this.authService.getUserProfile(req.user);
    }
} 