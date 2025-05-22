import { Controller, Get, Post, UseGuards, Req, Query, Param, Body, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('encounters')
@Controller('fhir/Encounter')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EncounterController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Encounter');
    }

    /**
     * Get all encounters for the authenticated practitioner
     */
    @Get('$my-encounters')
    @ApiOperation({ summary: 'Get all encounters for the authenticated practitioner' })
    @ApiResponse({ status: 200, description: 'Encounters retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getMyEncounters(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        const params = {
            ...query,
            'participant': `Practitioner/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('Encounter', params);
    }

    /**
     * Get all encounters for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all encounters for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Encounters retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientEncounters(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('Encounter', params);
    }

    /**
     * Get current/active encounters
     */
    @Get('$active')
    @ApiOperation({ summary: 'Get all active encounters' })
    @ApiResponse({ status: 200, description: 'Active encounters retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getActiveEncounters(@Query() query: Record<string, any>): Promise<any> {
        const params = {
            ...query,
            'status': 'in-progress,planned,arrived,triaged',
        };

        return this.hapiFhirAdapter.search('Encounter', params);
    }

    /**
     * Get all resources associated with an encounter
     */
    @Get(':id/$everything')
    @ApiOperation({ summary: 'Get all resources associated with an encounter' })
    @ApiParam({ name: 'id', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Associated resources retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getEncounterEverything(
        @Param('id') id: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // First make sure the encounter exists
        const encounter = await this.hapiFhirAdapter.getById('Encounter', id);

        // Get patient ID from the encounter
        const patientId = encounter.subject?.reference?.split('/')[1];
        if (!patientId) {
            throw new Error('Encounter does not have a valid patient reference');
        }

        // Get all resources associated with this encounter
        const encounterData = {
            encounter: encounter,
            observations: await this.hapiFhirAdapter.search('Observation', { 'encounter': `Encounter/${id}` }),
            conditions: await this.hapiFhirAdapter.search('Condition', { 'encounter': `Encounter/${id}` }),
            medicationRequests: await this.hapiFhirAdapter.search('MedicationRequest', { 'encounter': `Encounter/${id}` }),
            procedures: await this.hapiFhirAdapter.search('Procedure', { 'encounter': `Encounter/${id}` }),
            documentReferences: await this.hapiFhirAdapter.search('DocumentReference', { 'encounter': `Encounter/${id}` }),
            diagnosticReports: await this.hapiFhirAdapter.search('DiagnosticReport', { 'encounter': `Encounter/${id}` }),
        };

        return encounterData;
    }

    /**
     * Create a new encounter
     */
    @Post()
    @ApiOperation({ summary: 'Create a new encounter' })
    @ApiBody({ description: 'Encounter resource' })
    @ApiResponse({ status: 201, description: 'Encounter created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid encounter data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createEncounter(@Body() data: any): Promise<any> {
        // Ensure we have a valid Encounter resource
        if (!data.resourceType || data.resourceType !== 'Encounter') {
            throw new Error('Invalid encounter data. Expected Encounter resource.');
        }

        return this.hapiFhirAdapter.create('Encounter', data);
    }

    /**
     * Update encounter status
     */
    @Put(':id/status')
    @ApiOperation({ summary: 'Update encounter status' })
    @ApiParam({ name: 'id', description: 'Encounter ID' })
    @ApiBody({ description: 'Status update data' })
    @ApiResponse({ status: 200, description: 'Encounter status updated successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: string },
    ): Promise<any> {
        // Get the current encounter
        const encounter = await this.hapiFhirAdapter.getById('Encounter', id);

        // Validate the status
        const validStatuses = ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled'];
        if (!validStatuses.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Update the status
        encounter.status = data.status;

        // If the status is 'finished', set the end date
        if (data.status === 'finished' && !encounter.period?.end) {
            if (!encounter.period) {
                encounter.period = {};
            }
            encounter.period.end = new Date().toISOString();
        }

        // Update the encounter
        return this.hapiFhirAdapter.update('Encounter', id, encounter);
    }

    /**
     * Override transformQueryParams to add encounter-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches for Encounter.period
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

        // Handle status filter - can be comma-separated list
        if (params.status && Array.isArray(params.status)) {
            searchParams.status = params.status.join(',');
        }

        // Handle specialty filtering
        if (params.specialty) {
            searchParams['service-type'] = params.specialty;
            delete searchParams.specialty;
        }

        // Handle location filtering
        if (params.location) {
            searchParams['location'] = params.location;
        }

        return searchParams;
    }
} 