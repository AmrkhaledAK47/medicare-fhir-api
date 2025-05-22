import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('observations')
@Controller('fhir/Observation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObservationController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Observation');
    }

    /**
     * Get observations by code (e.g., vital signs, lab results)
     */
    @Get('$by-code')
    @ApiOperation({ summary: 'Search observations by code' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getObservationsByCode(
        @Query('code') code: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        const params = {
            ...query,
            code,
        };

        return this.hapiFhirAdapter.search('Observation', params);
    }

    /**
     * Get observations for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get observations for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientObservations(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('Observation', params);
    }

    /**
     * Get the latest observation of a specific type for a patient
     */
    @Get('patient/:patientId/latest')
    @ApiOperation({ summary: 'Get latest observation of a specific type for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Latest observation retrieved successfully' })
    @ApiResponse({ status: 404, description: 'No observations found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getLatestObservation(
        @Param('patientId') patientId: string,
        @Query('code') code: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'code': code,
            '_sort': '-date', // Sort by date descending
            '_count': '1', // Limit to 1 result
        };

        const result = await this.hapiFhirAdapter.search('Observation', params);

        if (!result.entry || result.entry.length === 0) {
            throw new Error('No observations found for the specified criteria');
        }

        return result.entry[0].resource;
    }

    /**
     * Get vital signs for a patient
     */
    @Get('patient/:patientId/vitals')
    @ApiOperation({ summary: 'Get vital signs for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Vital signs retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getVitalSigns(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'category': 'vital-signs',
        };

        return this.hapiFhirAdapter.search('Observation', params);
    }

    /**
     * Get lab results for a patient
     */
    @Get('patient/:patientId/labs')
    @ApiOperation({ summary: 'Get lab results for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Lab results retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getLabResults(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'category': 'laboratory',
        };

        return this.hapiFhirAdapter.search('Observation', params);
    }

    /**
     * Create a new observation
     */
    @Post()
    @ApiOperation({ summary: 'Create a new observation' })
    @ApiBody({ description: 'Observation resource' })
    @ApiResponse({ status: 201, description: 'Observation created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid observation data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createObservation(@Body() data: any): Promise<any> {
        // Ensure we have a valid Observation resource
        if (!data.resourceType || data.resourceType !== 'Observation') {
            throw new Error('Invalid observation data. Expected Observation resource.');
        }

        // Validate the observation according to FHIR rules
        // You might want to add additional validation here

        return this.hapiFhirAdapter.create('Observation', data);
    }

    /**
     * Override transformQueryParams to add observation-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches
        if (params.date) {
            searchParams.date = params.date;
        } else {
            if (params.date_start) {
                searchParams['date'] = `ge${params.date_start}`;
            }
            if (params.date_end) {
                if (searchParams['date']) {
                    searchParams['date'] += `,le${params.date_end}`;
                } else {
                    searchParams['date'] = `le${params.date_end}`;
                }
            }
        }

        // Handle value range searches
        if (params.value_min || params.value_max) {
            let valueRange = '';
            if (params.value_min) {
                valueRange += `ge${params.value_min}`;
            }
            if (params.value_max) {
                if (valueRange) {
                    valueRange += `,le${params.value_max}`;
                } else {
                    valueRange = `le${params.value_max}`;
                }
            }
            if (valueRange) {
                searchParams['value-quantity'] = valueRange;
            }
        }

        // Handle status filter
        if (params.status && Array.isArray(params.status)) {
            searchParams.status = params.status.join(',');
        }

        return searchParams;
    }
} 