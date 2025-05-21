import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateToken(user);
    }

    async register(registerDto: RegisterDto) {
        const { email } = registerDto;
        const existingUser = await this.usersService.findByEmail(email);

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        try {
            const user = await this.usersService.create(registerDto);
            return this.generateToken(user);
        } catch (error) {
            throw new InternalServerErrorException('Failed to create user account');
        }
    }

    private generateToken(user: any) {
        const payload = { sub: user._id.toString(), email: user.email };

        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
        };
    }

    async validateUser(userId: string) {
        return this.usersService.findById(userId);
    }
} 