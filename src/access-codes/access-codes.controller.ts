import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus, Query, Param, Delete, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AccessCodesService } from './access-codes.service';
import { CreateAccessCodeDto, CreateBatchAccessCodesDto } from './dto/create-access-code.dto';
import { VerifyAccessCodeDto } from './dto/verify-access-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '../auth/guards/roles.guard';

@ApiTags('access-codes')
@Controller('access-codes')
export class AccessCodesController {
    private readonly logger = new Logger(AccessCodesController.name);

    constructor(private readonly accessCodesService: AccessCodesService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new access code (Admin only)' })
    @ApiResponse({ status: 201, description: 'Access code created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async create(@Body() createAccessCodeDto: CreateAccessCodeDto) {
        this.logger.log(`Creating new access code for role: ${createAccessCodeDto.role}`);
        const accessCode = await this.accessCodesService.create(createAccessCodeDto);
        return {
            success: true,
            data: {
                code: accessCode.code,
                role: accessCode.role,
                expiresAt: accessCode.expiresAt
            }
        };
    }

    @Post('batch')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create multiple access codes at once (Admin only)' })
    @ApiResponse({ status: 201, description: 'Access codes created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async createBatch(@Body() createBatchDto: CreateBatchAccessCodesDto) {
        this.logger.log(`Creating batch of ${createBatchDto.count} access codes for role: ${createBatchDto.role}`);
        const accessCodes = await this.accessCodesService.createBatch(
            createBatchDto.role,
            createBatchDto.count,
            createBatchDto.expiresAt,
            createBatchDto.sendEmails || false,
            createBatchDto.emails
        );

        return {
            success: true,
            count: accessCodes.length,
            data: accessCodes.map(code => ({
                code: code.code,
                role: code.role,
                expiresAt: code.expiresAt
            }))
        };
    }

    @Post('resend/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Resend an access code email (Admin only)' })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
    @ApiResponse({ status: 404, description: 'Access code not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async resendEmail(
        @Param('id') id: string,
        @Body('email') email: string
    ) {
        this.logger.log(`Resending access code email for code ID: ${id} to ${email}`);
        await this.accessCodesService.resendAccessCodeEmail(id, email);
        return {
            success: true,
            message: 'Access code email sent successfully'
        };
    }

    @Post('verify')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify an access code' })
    @ApiResponse({ status: 200, description: 'Access code verification result' })
    @ApiResponse({ status: 400, description: 'Invalid or expired access code' })
    @ApiResponse({ status: 404, description: 'Access code not found' })
    async verify(@Body() verifyAccessCodeDto: VerifyAccessCodeDto) {
        const accessCode = await this.accessCodesService.verify(verifyAccessCodeDto.code);
        return {
            success: true,
            data: {
                role: accessCode.role,
                expiresAt: accessCode.expiresAt
            }
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all access codes (Admin only)' })
    @ApiQuery({ name: 'role', required: false, description: 'Filter by role (admin, practitioner, patient)' })
    @ApiQuery({ name: 'used', required: false, type: Boolean, description: 'Filter by used status' })
    @ApiQuery({ name: 'expired', required: false, type: Boolean, description: 'Filter by expiration status' })
    @ApiResponse({ status: 200, description: 'List of access codes' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async findAll(
        @Query('role') role?: string,
        @Query('used') used?: boolean,
        @Query('expired') expired?: boolean
    ) {
        const filters = { role, used, expired };
        const accessCodes = await this.accessCodesService.findAll(filters);
        return {
            success: true,
            count: accessCodes.length,
            data: accessCodes.map(code => ({
                id: (code as any)._id,
                code: code.code,
                role: code.role,
                expiresAt: code.expiresAt,
                used: code.used,
                createdAt: (code as any).createdAt,
            }))
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an access code (Admin only)' })
    @ApiResponse({ status: 204, description: 'Access code deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 404, description: 'Access code not found' })
    async delete(@Param('id') id: string) {
        // Implement delete functionality
        return { success: true };
    }
} 