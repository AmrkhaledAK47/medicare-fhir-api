import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    Query,
    Patch,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import * as multer from 'multer';

import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithResourceDto } from './dto/create-user-with-resource.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UserRole, UserDocument } from './schemas/user.schema';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new user profile (Admin only)' })
    @ApiResponse({ status: 201, description: 'User profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.usersService.createUserProfile(createUserDto);
    }

    @Post('create-with-resource')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new user with associated FHIR resource (Admin only)' })
    @ApiResponse({ status: 201, description: 'User and resource created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async createUserWithResource(@Body() createUserWithResourceDto: CreateUserWithResourceDto) {
        const result = await this.usersService.createUserWithResource(createUserWithResourceDto);

        // Cast the user to UserDocument to access Mongoose document properties
        const user = result.user as UserDocument;

        return {
            message: 'User and resource created successfully',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            },
            resourceId: result.resourceId,
            resourceType: user.fhirResourceType,
            accessCodeSent: true
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async findAll(@Query('role') role?: Role) {
        if (role) {
            return this.usersService.findByRole(role);
        }
        return this.usersService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async update(@Param('id') id: string, @Body() updateData: Partial<CreateUserDto>) {
        return this.usersService.update(id, updateData);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async remove(@Param('id') id: string) {
        await this.usersService.remove(id);
        return { message: 'User deleted successfully' };
    }

    @Post('regenerate-access-code')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Regenerate access code for a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'Access code regenerated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async regenerateAccessCode(@Body('email') email: string) {
        await this.usersService.regenerateAccessCode(email);
        return { message: 'Access code regenerated successfully' };
    }

    @Patch(':id/avatar')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user avatar' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                avatar: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file format' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseInterceptors(FileInterceptor('avatar'))
    async updateAvatar(
        @Param('id') id: string,
        @UploadedFile() file: any
    ) {
        return this.usersService.updateAvatar(id, file);
    }

    @Get(':id/profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile with details' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserProfile(@Param('id') id: string) {
        return this.usersService.getUserProfile(id);
    }

    @Post('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new admin user directly (Admin only)' })
    @ApiResponse({ status: 201, description: 'Admin user created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 409, description: 'User with this email already exists' })
    async createAdminUser(@Body() createAdminDto: CreateAdminDto) {
        const adminUser = await this.usersService.createAdminUser(createAdminDto);

        // Cast the user to UserDocument to access Mongoose document properties
        const userDoc = adminUser as UserDocument;

        return {
            success: true,
            message: 'Admin user created successfully',
            data: {
                id: userDoc._id.toString(),
                name: userDoc.name,
                email: userDoc.email,
                role: userDoc.role,
                status: userDoc.status
            }
        };
    }
} 