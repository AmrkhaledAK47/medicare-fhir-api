import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
    ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { PatientService } from '../services/patient.service';

import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { ResourceQueryDto } from '../dto/resource-query.dto';

@ApiTags('Patients')
@Controller('fhir/Patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientController {
    constructor(private readonly patientService: PatientService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new patient record' })
    @ApiResponse({ status: 201, description: 'Patient created successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ResourcePermission('Patient', Action.CREATE)
    create(@Body() createPatientDto: CreatePatientDto, @Request() req) {
        // Add creator information from JWT token
        const createdBy = req.user.sub;
        // Cast the DTO to be compatible with the service method
        return this.patientService.create(createPatientDto as any, createdBy);
    }

    @Get()
    @ApiOperation({ summary: 'Get all patients (filtered by permissions)' })
    @ApiResponse({ status: 200, description: 'List of patients according to user permissions.' })
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
    @ResourcePermission('Patient', Action.SEARCH)
    findAll(@Query() query: ResourceQueryDto, @Request() req) {
        // Different behavior based on role
        const { role, sub: userId } = req.user;

        // Role-specific filters will be applied in the guard and service
        return this.patientService.findAll(query, role, userId);
    }

    @Get('demographics')
    @ApiOperation({ summary: 'Get patient demographics - Admin only' })
    @ApiResponse({ status: 200, description: 'Patient demographics statistics.' })
    @ApiResponse({ status: 403, description: 'Forbidden - admin access required.' })
    @Roles(Role.ADMIN)
    getPatientDemographics() {
        return this.patientService.getPatientDemographics();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific patient by ID' })
    @ApiResponse({ status: 200, description: 'Patient record found.' })
    @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Patient not found.' })
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
    @ResourcePermission('Patient', Action.READ)
    findOne(@Param('id') id: string, @Request() req) {
        // Patient can only view their own record
        const { role, sub: userId } = req.user;

        if (role === Role.PATIENT && id !== userId) {
            throw new Error('Patients can only access their own records');
        }

        return this.patientService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a patient record' })
    @ApiResponse({ status: 200, description: 'Patient updated successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Patient not found.' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ResourcePermission('Patient', Action.UPDATE)
    update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto, @Request() req) {
        const { role } = req.user;

        // Additional practitioner permission checks could be implemented here
        // For example, verifying that the practitioner is assigned to this patient

        return this.patientService.update(id, updatePatientDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a patient record - Admin only' })
    @ApiResponse({ status: 200, description: 'Patient deleted successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden - admin access required.' })
    @ApiResponse({ status: 404, description: 'Patient not found.' })
    @Roles(Role.ADMIN)
    @ResourcePermission('Patient', Action.DELETE)
    remove(@Param('id') id: string) {
        return this.patientService.remove(id);
    }

    @Get(':id/activity')
    @ApiOperation({ summary: 'Get recent patient activity' })
    @ApiParam({ name: 'id', description: 'Patient ID' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items to return' })
    @ApiResponse({ status: 200, description: 'Recent patient activities' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async getActivity(
        @Param('id') id: string,
        @Query('limit') limit = 5,
        @Request() req: any,
    ) {
        const patient = await this.patientService.findById(id);

        // Check if the user has access to this patient's activity
        const isOwnRecord = patient.userId === req.user.id;
        const hasAccess =
            req.user.role === Role.ADMIN ||
            req.user.role === Role.PRACTITIONER ||
            isOwnRecord;

        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this patient record');
        }

        return this.patientService.getRecentActivity(id, +limit);
    }
} 