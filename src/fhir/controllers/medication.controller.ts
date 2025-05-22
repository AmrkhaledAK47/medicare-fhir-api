import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('medications')
@Controller('fhir/Medication')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicationController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Medication');
    }

    /**
     * Search medications by code (e.g., RxNorm, SNOMED CT)
     */
    @Get('$by-code')
    @ApiOperation({ summary: 'Search medications by code' })
    @ApiResponse({ status: 200, description: 'Medications retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PHARMACIST)
    async getMedicationsByCode(
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

        return this.hapiFhirAdapter.search('Medication', params);
    }

    /**
     * Get common medications - a curated list of frequently prescribed medications
     */
    @Get('$common')
    @ApiOperation({ summary: 'Get a list of commonly prescribed medications' })
    @ApiResponse({ status: 200, description: 'Common medications retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PHARMACIST)
    async getCommonMedications(@Query() query: Record<string, any>): Promise<any> {
        // Using a tag to identify common medications is one approach
        const params = {
            ...query,
            '_tag': 'common-medication',
        };

        return this.hapiFhirAdapter.search('Medication', params);
    }

    /**
     * Create a new medication
     */
    @Post()
    @ApiOperation({ summary: 'Create a new medication' })
    @ApiBody({ description: 'Medication resource' })
    @ApiResponse({ status: 201, description: 'Medication created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid medication data' })
    @Roles(Role.ADMIN, Role.PHARMACIST)
    async createMedication(@Body() data: any): Promise<any> {
        // Ensure we have a valid Medication resource
        if (!data.resourceType || data.resourceType !== 'Medication') {
            throw new Error('Invalid medication data. Expected Medication resource.');
        }

        return this.hapiFhirAdapter.create('Medication', data);
    }
}

@ApiTags('medication-requests')
@Controller('fhir/MedicationRequest')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicationRequestController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'MedicationRequest');
    }

    /**
     * Get medication requests for the authenticated patient
     */
    @Get('$my-medications')
    @ApiOperation({ summary: 'Get medication requests for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Medication requests retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyMedications(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No patient record associated with this account');
        }

        const params = {
            ...query,
            'subject': `Patient/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('MedicationRequest', params);
    }

    /**
     * Get active/current medications for a patient
     */
    @Get('patient/:patientId/active')
    @ApiOperation({ summary: 'Get active medications for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Active medications retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PHARMACIST)
    async getActiveMedications(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'status': 'active',
        };

        return this.hapiFhirAdapter.search('MedicationRequest', params);
    }

    /**
     * Get medication requests for a specific encounter
     */
    @Get('encounter/:encounterId')
    @ApiOperation({ summary: 'Get medication requests for a specific encounter' })
    @ApiParam({ name: 'encounterId', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Medication requests retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PHARMACIST)
    async getMedicationsForEncounter(
        @Param('encounterId') encounterId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the encounter exists
        await this.hapiFhirAdapter.getById('Encounter', encounterId);

        const params = {
            ...query,
            'encounter': `Encounter/${encounterId}`,
        };

        return this.hapiFhirAdapter.search('MedicationRequest', params);
    }

    /**
     * Create a new medication request (prescription)
     */
    @Post()
    @ApiOperation({ summary: 'Create a new medication request (prescription)' })
    @ApiBody({ description: 'MedicationRequest resource' })
    @ApiResponse({ status: 201, description: 'Medication request created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid medication request data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createMedicationRequest(@Body() data: any): Promise<any> {
        // Ensure we have a valid MedicationRequest resource
        if (!data.resourceType || data.resourceType !== 'MedicationRequest') {
            throw new Error('Invalid medication request data. Expected MedicationRequest resource.');
        }

        // Validate that required fields are present
        if (!data.subject || !data.medication) {
            throw new Error('Subject and medication are required fields');
        }

        return this.hapiFhirAdapter.create('MedicationRequest', data);
    }

    /**
     * Override transformQueryParams to add medication-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches
        if (params.authoredon) {
            searchParams.authoredon = params.authoredon;
        } else {
            if (params.authoredon_start) {
                searchParams['authoredon'] = `ge${params.authoredon_start}`;
            }
            if (params.authoredon_end) {
                if (searchParams['authoredon']) {
                    searchParams['authoredon'] += `,le${params.authoredon_end}`;
                } else {
                    searchParams['authoredon'] = `le${params.authoredon_end}`;
                }
            }
        }

        // Handle status filter - can be comma-separated list
        if (params.status && Array.isArray(params.status)) {
            searchParams.status = params.status.join(',');
        }

        // Handle intent filter
        if (params.intent) {
            searchParams.intent = params.intent;
        }

        return searchParams;
    }
} 