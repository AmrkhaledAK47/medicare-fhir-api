import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
} 