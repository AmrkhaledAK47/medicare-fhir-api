import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('allergies')
@Controller('fhir/AllergyIntolerance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AllergyIntoleranceController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'AllergyIntolerance');
    }

    /**
     * Get allergies for the authenticated patient
     */
    @Get('$my-allergies')
    @ApiOperation({ summary: 'Get allergies for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Allergies retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyAllergies(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No patient record associated with this account');
        }

        const params = {
            ...query,
            'patient': `Patient/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('AllergyIntolerance', params);
    }

    /**
     * Get allergies for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get allergies for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Allergies retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientAllergies(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'patient': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('AllergyIntolerance', params);
    }

    /**
     * Create a new allergy record
     */
    @Post()
    @ApiOperation({ summary: 'Create a new allergy record' })
    @ApiBody({ description: 'AllergyIntolerance resource' })
    @ApiResponse({ status: 201, description: 'Allergy created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid allergy data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createAllergy(@Body() data: any): Promise<any> {
        // Ensure we have a valid AllergyIntolerance resource
        if (!data.resourceType || data.resourceType !== 'AllergyIntolerance') {
            throw new Error('Invalid allergy data. Expected AllergyIntolerance resource.');
        }

        return this.hapiFhirAdapter.create('AllergyIntolerance', data);
    }

    /**
     * Get allergies by code (e.g., food, medication, environment)
     */
    @Get('$by-code')
    @ApiOperation({ summary: 'Search allergies by code' })
    @ApiResponse({ status: 200, description: 'Allergies retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getAllergiesByCode(
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

        return this.hapiFhirAdapter.search('AllergyIntolerance', params);
    }

    /**
     * Override transformQueryParams to add allergy-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle category filter (food, medication, environment, biologic)
        if (params.category && Array.isArray(params.category)) {
            searchParams.category = params.category.join(',');
        } else if (params.category) {
            searchParams.category = params.category;
        }

        // Handle clinical status filter
        if (params.clinical_status) {
            searchParams['clinical-status'] = params.clinical_status;
            delete searchParams.clinical_status;
        }

        // Handle verification status filter
        if (params.verification_status) {
            searchParams['verification-status'] = params.verification_status;
            delete searchParams.verification_status;
        }

        // Handle type filter (allergy vs intolerance)
        if (params.type) {
            searchParams.type = params.type;
        }

        // Handle criticality filter
        if (params.criticality) {
            searchParams.criticality = params.criticality;
        }

        // Handle onset date range searches
        if (params.onset_date) {
            searchParams['onset-date'] = params.onset_date;
        } else {
            if (params.onset_date_start) {
                searchParams['onset-date'] = `ge${params.onset_date_start}`;
            }
            if (params.onset_date_end) {
                if (searchParams['onset-date']) {
                    searchParams['onset-date'] += `,le${params.onset_date_end}`;
                } else {
                    searchParams['onset-date'] = `le${params.onset_date_end}`;
                }
            }
        }

        return searchParams;
    }
} 