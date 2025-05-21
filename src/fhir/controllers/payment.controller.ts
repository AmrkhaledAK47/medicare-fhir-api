import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';


@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Get()
    @ApiOperation({ summary: 'Get all payments with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID' })
    @ApiResponse({ status: 200, description: 'List of payments' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('patientId') patientId?: string,
    ) {
        // If patientId is provided, filter by patient
        if (patientId) {
            return this.paymentService.findByPatientId(patientId);
        }

        // Otherwise use standard pagination
        return this.paymentService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment by ID' })
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiResponse({ status: 200, description: 'The payment' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async findOne(@Param('id') id: string) {
        return this.paymentService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create new payment' })
    @ApiResponse({ status: 201, description: 'Payment created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async create(@Body() data: any) {
        return this.paymentService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update payment by ID' })
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiResponse({ status: 200, description: 'Payment updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.paymentService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete payment by ID' })
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async remove(@Param('id') id: string) {
        return this.paymentService.remove(id);
    }
} 