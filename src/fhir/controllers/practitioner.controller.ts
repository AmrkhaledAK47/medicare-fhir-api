import { Controller, Get, UseGuards, Req, Query, Param, Post, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('practitioners')
@Controller('fhir/Practitioner')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PractitionerController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Practitioner');
    }

    /**
     * Get the practitioner resource associated with the authenticated user
     */
    @Get('$my-profile')
    @ApiOperation({ summary: 'Get the practitioner profile for the authenticated user' })
    @ApiResponse({ status: 200, description: 'Practitioner record retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getMyProfile(@Req() req: Request & { user: any }): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        return this.hapiFhirAdapter.getById('Practitioner', req.user.fhirResourceId);
    }

    /**
     * Get all patients assigned to this practitioner
     */
    @Get('$my-patients')
    @ApiOperation({ summary: 'Get patients assigned to the authenticated practitioner' })
    @ApiResponse({ status: 200, description: 'Patients retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getMyPatients(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Ensure we have a practitioner ID
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        // This assumes the Patient resources have a "practitioner" search parameter
        // that contains a reference to the practitioner
        const params = {
            ...query,
            'general-practitioner': `Practitioner/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('Patient', params);
    }

    /**
     * Get encounters for this practitioner (optionally filtered by patient)
     */
    @Get('$my-encounters')
    @ApiOperation({ summary: 'Get encounters for the authenticated practitioner' })
    @ApiResponse({ status: 200, description: 'Encounters retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getMyEncounters(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Ensure we have a practitioner ID
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        // Search for encounters where this practitioner is a participant
        const params = {
            ...query,
            'participant': `Practitioner/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('Encounter', params);
    }

    /**
     * Get a practitioner's schedules
     */
    @Get(':id/schedule')
    @ApiOperation({ summary: 'Get schedules for a practitioner' })
    @ApiParam({ name: 'id', description: 'Practitioner ID' })
    @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Practitioner not found' })
    async getSchedule(
        @Param('id') id: string,
        @Query() query: Record<string, any>,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        // Search for schedules for this practitioner
        const params = {
            ...query,
            'actor': `Practitioner/${id}`,
        };

        return this.hapiFhirAdapter.search('Schedule', params);
    }

    /**
     * Override transformQueryParams to add practitioner-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Special case for name search - support both exact and contains matching
        if (params.name && !params['name:exact'] && !params['name:contains']) {
            searchParams['name:contains'] = params.name;
            delete searchParams.name;
        }

        // Special case for identifier search - normalize format
        if (params.identifier && params.identifier.includes('|')) {
            // If identifier is in the format system|value, keep as is
            searchParams.identifier = params.identifier;
        } else if (params.identifier) {
            // If just a value is provided, search in any system
            searchParams.identifier = params.identifier;
        }

        // Handle specialty parameter as a token search
        if (params.specialty) {
            searchParams['qualification-code'] = params.specialty;
            delete searchParams.specialty;
        }

        return searchParams;
    }

    /**
     * Update professional details for the authenticated practitioner
     */
    @Patch('$my-details')
    @ApiOperation({ summary: 'Update professional details for the authenticated practitioner' })
    @ApiBody({ description: 'Practitioner data to update' })
    @ApiResponse({ status: 200, description: 'Details updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
    @Roles(Role.PRACTITIONER)
    async updateMyDetails(
        @Req() req: Request & { user: any },
        @Body() data: any
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        // Get current practitioner data
        const currentPractitioner = await this.hapiFhirAdapter.getById('Practitioner', req.user.fhirResourceId);

        // Only allow updates to professional details fields
        const allowedUpdates = [
            'name', 'telecom', 'address', 'gender',
            'communication', 'qualification', 'photo'
        ];

        // Create update object with only allowed fields
        const updateData = { ...currentPractitioner };
        for (const field of allowedUpdates) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        // Update the practitioner resource
        return this.hapiFhirAdapter.update('Practitioner', req.user.fhirResourceId, updateData);
    }

    /**
     * Set practitioner's availability (create/update Schedule resource)
     */
    @Post('$set-availability')
    @ApiOperation({ summary: 'Set availability for the authenticated practitioner' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                planningHorizon: {
                    type: 'object',
                    properties: {
                        start: { type: 'string', example: '2025-06-01' },
                        end: { type: 'string', example: '2025-06-30' }
                    },
                    required: ['start', 'end']
                },
                slots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            start: { type: 'string', example: '2025-06-01T09:00:00Z' },
                            end: { type: 'string', example: '2025-06-01T09:30:00Z' },
                            status: { type: 'string', example: 'free' }
                        },
                        required: ['start', 'end', 'status']
                    }
                }
            },
            required: ['planningHorizon', 'slots']
        },
        description: 'Practitioner availability details'
    })
    @ApiResponse({ status: 200, description: 'Availability set successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a practitioner' })
    @Roles(Role.PRACTITIONER)
    async setAvailability(
        @Req() req: Request & { user: any },
        @Body() data: {
            planningHorizon: { start: string; end: string };
            slots: Array<{ start: string; end: string; status: string }>;
        }
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No practitioner record associated with this account');
        }

        // Create or update a Schedule resource
        const scheduleData = {
            resourceType: 'Schedule',
            status: 'active',
            actor: [
                {
                    reference: `Practitioner/${req.user.fhirResourceId}`,
                    display: req.user.name
                }
            ],
            planningHorizon: {
                start: data.planningHorizon.start,
                end: data.planningHorizon.end
            }
        };

        // Check if a schedule already exists for this practitioner
        const existingSchedules = await this.hapiFhirAdapter.search('Schedule', {
            'actor': `Practitioner/${req.user.fhirResourceId}`
        });

        let schedule;
        if (existingSchedules.entry && existingSchedules.entry.length > 0) {
            // Update existing schedule
            const scheduleId = existingSchedules.entry[0].resource.id;
            schedule = await this.hapiFhirAdapter.update('Schedule', scheduleId, {
                ...existingSchedules.entry[0].resource,
                ...scheduleData
            });
        } else {
            // Create new schedule
            schedule = await this.hapiFhirAdapter.create('Schedule', scheduleData);
        }

        // Create Slot resources for each time slot
        const slots = await Promise.all(data.slots.map(async slot => {
            const slotData = {
                resourceType: 'Slot',
                schedule: {
                    reference: `Schedule/${schedule.id}`
                },
                status: slot.status,
                start: slot.start,
                end: slot.end
            };

            return await this.hapiFhirAdapter.create('Slot', slotData);
        }));

        return {
            message: 'Availability set successfully',
            schedule,
            slots
        };
    }

    /**
     * Get available time slots for a practitioner
     */
    @Get(':id/available-slots')
    @ApiOperation({ summary: 'Get available time slots for a practitioner' })
    @ApiParam({ name: 'id', description: 'Practitioner ID' })
    @ApiQuery({ name: 'start', description: 'Start date (YYYY-MM-DD)', required: false })
    @ApiQuery({ name: 'end', description: 'End date (YYYY-MM-DD)', required: false })
    @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Practitioner not found' })
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
    async getAvailableSlots(
        @Param('id') id: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ): Promise<any> {
        // Verify the practitioner exists
        await this.hapiFhirAdapter.getById('Practitioner', id);

        // Find schedules for this practitioner
        const scheduleResult = await this.hapiFhirAdapter.search('Schedule', {
            'actor': `Practitioner/${id}`
        });

        if (!scheduleResult.entry || scheduleResult.entry.length === 0) {
            return {
                message: 'No schedules found for this practitioner',
                availableSlots: []
            };
        }

        // Get schedule IDs
        const scheduleIds = scheduleResult.entry.map(entry => entry.resource.id);

        // Find available slots for these schedules
        const availableSlots = [];
        for (const scheduleId of scheduleIds) {
            const params: Record<string, string> = {
                'schedule': `Schedule/${scheduleId}`,
                'status': 'free'
            };

            // Add date filters if provided
            if (start) params['start'] = `ge${start}`;
            if (end) params['end'] = `le${end}`;

            const slotResults = await this.hapiFhirAdapter.search('Slot', params);

            if (slotResults.entry) {
                availableSlots.push(...slotResults.entry.map(entry => entry.resource));
            }
        }

        return {
            practitioner: id,
            availableSlots
        };
    }

    /**
     * Search for practitioners with advanced filtering
     */
    @Get('search')
    @ApiOperation({ summary: 'Advanced search for practitioners with filtering' })
    @ApiQuery({ name: 'name', required: false, description: 'Practitioner name to search for' })
    @ApiQuery({ name: 'specialty', required: false, description: 'Specialty code' })
    @ApiQuery({ name: 'identifier', required: false, description: 'Practitioner identifier' })
    @ApiQuery({ name: 'available', required: false, description: 'Filter to only those with availability', type: Boolean })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (0-based)', type: Number })
    @ApiQuery({ name: 'size', required: false, description: 'Page size', type: Number })
    @ApiResponse({ status: 200, description: 'Search results' })
    @Roles(Role.ADMIN, Role.PATIENT, Role.PRACTITIONER)
    async searchPractitioners(@Query() query: Record<string, any>): Promise<any> {
        // Extract pagination parameters
        const page = parseInt(query.page) || 0;
        const size = parseInt(query.size) || 10;

        // Build search parameters
        const searchParams: Record<string, string> = {};

        if (query.name) searchParams.name = query.name;
        if (query.specialty) searchParams['qualification-code'] = query.specialty;
        if (query.identifier) searchParams.identifier = query.identifier;

        // Add pagination parameters
        searchParams._count = size.toString();
        searchParams._getpagesoffset = (page * size).toString();

        // Execute search
        const result = await this.hapiFhirAdapter.search('Practitioner', searchParams);

        // If filtering by availability is requested
        if (query.available === 'true') {
            if (!result.entry || result.entry.length === 0) {
                return result;
            }

            // Filter to practitioners that have available slots
            const practitionersWithAvailability = [];
            for (const entry of result.entry) {
                const practitionerId = entry.resource.id;

                // Check if this practitioner has any available slots
                const scheduleResult = await this.hapiFhirAdapter.search('Schedule', {
                    'actor': `Practitioner/${practitionerId}`
                });

                if (scheduleResult.entry && scheduleResult.entry.length > 0) {
                    // Find available slots for this schedule
                    const scheduleId = scheduleResult.entry[0].resource.id;
                    const slotResults = await this.hapiFhirAdapter.search('Slot', {
                        'schedule': `Schedule/${scheduleId}`,
                        'status': 'free'
                    });

                    if (slotResults.entry && slotResults.entry.length > 0) {
                        practitionersWithAvailability.push(entry);
                    }
                }
            }

            result.entry = practitionersWithAvailability;
            result.total = practitionersWithAvailability.length;
        }

        return result;
    }

    /**
     * Get practitioner statistics
     */
    @Get('$statistics')
    @ApiOperation({ summary: 'Get practitioner statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    @Roles(Role.ADMIN)
    async getPractitionerStatistics(): Promise<any> {
        // Get total count
        const totalResult = await this.hapiFhirAdapter.search('Practitioner', { _summary: 'count' });
        const totalCount = totalResult.total || 0;

        // You could add more specialized statistics here, like:
        // - Count by specialty
        // - Availability statistics
        // - Patient load distribution

        return {
            totalPractitioners: totalCount,
            // Add more statistics as needed
        };
    }
} 