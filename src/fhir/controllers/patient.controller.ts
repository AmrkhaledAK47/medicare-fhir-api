import { Controller, Get, UseGuards, Req, Query, Param, Post, Body, Put, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';
import { FhirBundleDto, OperationOutcomeDto, PatientDto, ObservationDto } from '../dto/fhir-response.dto';

@ApiTags('patients')
@Controller('fhir/Patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Patient');
    }

    /**
     * Get the patient resource associated with the authenticated user
     */
    @Get('$my-profile')
    @ApiOperation({
        summary: 'Get the patient profile for the authenticated user',
        description: 'Retrieves the FHIR Patient resource that is associated with the currently authenticated user. The user must have the PATIENT role.'
    })
    @ApiResponse({
        status: 200,
        description: 'Patient record retrieved successfully',
        type: PatientDto
    })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @ApiResponse({ status: 404, description: 'Patient profile not found' })
    @Roles(Role.PATIENT)
    async getMyProfile(@Req() req: Request & { user: any }): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No patient record associated with this account');
        }

        return this.hapiFhirAdapter.getById('Patient', req.user.fhirResourceId);
    }

    /**
     * Get all encounters for the authenticated patient
     */
    @Get('$my-encounters')
    @ApiOperation({
        summary: 'Get encounters for the authenticated patient',
        description: 'Retrieves all clinical encounters for the currently authenticated patient. Results can be filtered and paginated using query parameters.'
    })
    @ApiResponse({
        status: 200,
        description: 'Encounters retrieved successfully',
        type: FhirBundleDto
    })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyEncounters(
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

        return this.hapiFhirAdapter.search('Encounter', params);
    }

    /**
     * Get all observations for the authenticated patient
     */
    @Get('$my-observations')
    @ApiOperation({
        summary: 'Get observations for the authenticated patient',
        description: 'Retrieves all clinical observations (vital signs, lab results, etc.) for the currently authenticated patient. Results can be filtered and paginated using query parameters.'
    })
    @ApiResponse({
        status: 200,
        description: 'Observations retrieved successfully',
        type: FhirBundleDto
    })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyObservations(
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

        return this.hapiFhirAdapter.search('Observation', params);
    }

    /**
     * Get all medications for the authenticated patient
     */
    @Get('$my-medications')
    @ApiOperation({ summary: 'Get medications for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Medications retrieved successfully' })
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
     * Get all data for a patient (similar to $everything operation in FHIR)
     */
    @Get(':id/$everything')
    @ApiOperation({ summary: 'Get all data for a specific patient' })
    @ApiParam({ name: 'id', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Patient data retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getEverything(
        @Param('id') id: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // First make sure the patient exists
        const patient = await this.hapiFhirAdapter.getById('Patient', id);

        // This is a simplified version of $everything - in a real implementation,
        // you would make multiple queries for various resource types
        const patientData = {
            patient: patient,
            encounters: await this.hapiFhirAdapter.search('Encounter', { 'subject': `Patient/${id}` }),
            observations: await this.hapiFhirAdapter.search('Observation', { 'subject': `Patient/${id}` }),
            medications: await this.hapiFhirAdapter.search('MedicationRequest', { 'subject': `Patient/${id}` }),
            conditions: await this.hapiFhirAdapter.search('Condition', { 'subject': `Patient/${id}` }),
        };

        return patientData;
    }

    /**
     * Register a new patient with the system
     */
    @Post('$register')
    @ApiOperation({
        summary: 'Register a new patient',
        description: 'Creates a new patient resource in the FHIR server. Typically used during the registration process.'
    })
    @ApiBody({
        description: 'Patient registration data',
        schema: {
            type: 'object',
            required: ['resource'],
            properties: {
                resource: {
                    type: 'object',
                    required: ['resourceType'],
                    properties: {
                        resourceType: { type: 'string', enum: ['Patient'] },
                        active: { type: 'boolean' },
                        name: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    use: { type: 'string', enum: ['official', 'usual', 'nickname', 'anonymous', 'maiden', 'old'] },
                                    family: { type: 'string' },
                                    given: { type: 'array', items: { type: 'string' } },
                                    prefix: { type: 'array', items: { type: 'string' } },
                                    suffix: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        },
                        telecom: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    system: { type: 'string', enum: ['phone', 'email', 'fax', 'pager', 'url', 'sms', 'other'] },
                                    value: { type: 'string' },
                                    use: { type: 'string', enum: ['home', 'work', 'temp', 'old', 'mobile'] }
                                }
                            }
                        },
                        gender: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] },
                        birthDate: { type: 'string', format: 'date' },
                        address: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    use: { type: 'string', enum: ['home', 'work', 'temp', 'old', 'billing'] },
                                    type: { type: 'string', enum: ['postal', 'physical', 'both'] },
                                    line: { type: 'array', items: { type: 'string' } },
                                    city: { type: 'string' },
                                    district: { type: 'string' },
                                    state: { type: 'string' },
                                    postalCode: { type: 'string' },
                                    country: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        examples: {
            patientExample: {
                value: {
                    "resource": {
                        "resourceType": "Patient",
                        "active": true,
                        "name": [
                            {
                                "use": "official",
                                "family": "Smith",
                                "given": ["John", "Edward"],
                                "prefix": ["Mr"]
                            }
                        ],
                        "telecom": [
                            {
                                "system": "phone",
                                "value": "555-123-4567",
                                "use": "home"
                            },
                            {
                                "system": "email",
                                "value": "john.smith@example.com",
                                "use": "work"
                            }
                        ],
                        "gender": "male",
                        "birthDate": "1980-01-01",
                        "address": [
                            {
                                "use": "home",
                                "type": "both",
                                "line": ["123 Main St", "Apt 4B"],
                                "city": "Anytown",
                                "state": "CA",
                                "postalCode": "12345",
                                "country": "USA"
                            }
                        ]
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Patient registered successfully',
        type: PatientDto
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid registration data',
        type: OperationOutcomeDto
    })
    async registerPatient(@Body() data: any): Promise<any> {
        // Ensure we have a valid Patient resource
        if (!data.resource || data.resource.resourceType !== 'Patient') {
            throw new Error('Invalid patient data. Expected Patient resource.');
        }

        // Store the patient in FHIR server
        const patientResource = await this.hapiFhirAdapter.create('Patient', data.resource);

        // Here you would typically also create a user account in your auth system
        // that references this FHIR resource ID

        return patientResource;
    }

    /**
     * Override transformQueryParams to add patient-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Special case for name search
        if (params.name && !params['name:exact'] && !params['name:contains']) {
            searchParams['name:contains'] = params.name;
            delete searchParams.name;
        }

        // Handle birthdate range searches
        if (params.birthdate) {
            searchParams.birthdate = params.birthdate;
        } else {
            if (params.birthdate_start) {
                searchParams['birthdate'] = `ge${params.birthdate_start}`;
            }
            if (params.birthdate_end) {
                if (searchParams['birthdate']) {
                    searchParams['birthdate'] += `,le${params.birthdate_end}`;
                } else {
                    searchParams['birthdate'] = `le${params.birthdate_end}`;
                }
            }
        }

        // Handle custom tags
        if (params.tag) {
            searchParams._tag = params.tag;
            delete searchParams.tag;
        }

        return searchParams;
    }

    /**
     * Update demographics for the authenticated patient
     */
    @Patch('$my-demographics')
    @ApiOperation({ summary: 'Update demographics for the authenticated patient' })
    @ApiBody({ description: 'Patient demographic data to update' })
    @ApiResponse({ status: 200, description: 'Demographics updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @ApiResponse({ status: 404, description: 'Patient profile not found' })
    @Roles(Role.PATIENT)
    async updateMyDemographics(
        @Req() req: Request & { user: any },
        @Body() data: any
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No patient record associated with this account');
        }

        // Get current patient data
        const currentPatient = await this.hapiFhirAdapter.getById('Patient', req.user.fhirResourceId);

        // Only allow updates to demographic fields
        const allowedUpdates = ['name', 'telecom', 'gender', 'birthDate', 'address', 'communication', 'contact'];

        // Create update object with only allowed fields
        const updateData = { ...currentPatient };
        for (const field of allowedUpdates) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        // Update the patient resource
        return this.hapiFhirAdapter.update('Patient', req.user.fhirResourceId, updateData);
    }

    /**
     * Assign healthcare provider to a patient
     */
    @Post(':id/assign-provider')
    @ApiOperation({ summary: 'Assign a healthcare provider to a patient' })
    @ApiParam({ name: 'id', description: 'Patient ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                practitionerId: { type: 'string', example: '123456' },
                relationship: {
                    type: 'object',
                    example: {
                        coding: [{
                            system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                            code: "CP",
                            display: "Consulting Provider"
                        }]
                    }
                }
            },
            required: ['practitionerId']
        },
        description: 'Provider assignment details'
    })
    @ApiResponse({ status: 200, description: 'Provider assigned successfully' })
    @ApiResponse({ status: 404, description: 'Patient or practitioner not found' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    async assignProvider(
        @Param('id') id: string,
        @Body() data: { practitionerId: string, relationship?: any }
    ): Promise<any> {
        // Verify the patient exists
        const patient = await this.hapiFhirAdapter.getById('Patient', id);

        // Verify the practitioner exists
        await this.hapiFhirAdapter.getById('Practitioner', data.practitionerId);

        // Default relationship if not provided
        const relationship = data.relationship || {
            coding: [{
                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                code: "CP",
                display: "Consulting Provider"
            }]
        };

        // Add or update the generalPractitioner reference
        const generalPractitioner = {
            reference: `Practitioner/${data.practitionerId}`,
            type: "Practitioner"
        };

        if (!patient.generalPractitioner) {
            patient.generalPractitioner = [generalPractitioner];
        } else {
            // Check if this practitioner is already assigned
            const existingIndex = patient.generalPractitioner.findIndex(
                gp => gp.reference === `Practitioner/${data.practitionerId}`
            );

            if (existingIndex >= 0) {
                patient.generalPractitioner[existingIndex] = generalPractitioner;
            } else {
                patient.generalPractitioner.push(generalPractitioner);
            }
        }

        // Update the patient
        return this.hapiFhirAdapter.update('Patient', id, patient);
    }

    /**
     * Get a patient's healthcare providers
     */
    @Get(':id/providers')
    @ApiOperation({ summary: 'Get healthcare providers for a patient' })
    @ApiParam({ name: 'id', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
    async getProviders(@Param('id') id: string): Promise<any> {
        // Verify the patient exists and get their data
        const patient = await this.hapiFhirAdapter.getById('Patient', id);

        if (!patient.generalPractitioner || patient.generalPractitioner.length === 0) {
            return { providers: [] };
        }

        // Extract practitioner references
        const practitioners = [];
        for (const gp of patient.generalPractitioner) {
            if (gp.reference && gp.reference.startsWith('Practitioner/')) {
                const practitionerId = gp.reference.split('/')[1];
                try {
                    const practitioner = await this.hapiFhirAdapter.getById('Practitioner', practitionerId);
                    practitioners.push(practitioner);
                } catch (error) {
                    console.error(`Failed to fetch practitioner ${practitionerId}:`, error);
                }
            }
        }

        return { providers: practitioners };
    }

    /**
     * Search for patients with pagination and filtering
     */
    @Get('search')
    @ApiOperation({ summary: 'Advanced search for patients with pagination and filtering' })
    @ApiQuery({ name: 'name', required: false, description: 'Patient name to search for' })
    @ApiQuery({ name: 'identifier', required: false, description: 'Patient identifier' })
    @ApiQuery({ name: 'gender', required: false, description: 'Patient gender (male, female, other, unknown)' })
    @ApiQuery({ name: 'birthdate', required: false, description: 'Birth date in YYYY-MM-DD format' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (0-based)', type: Number })
    @ApiQuery({ name: 'size', required: false, description: 'Page size', type: Number })
    @ApiResponse({ status: 200, description: 'Search results' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    async searchPatients(@Query() query: Record<string, any>): Promise<any> {
        // Extract pagination parameters
        const page = parseInt(query.page) || 0;
        const size = parseInt(query.size) || 10;

        // Build search parameters
        const searchParams: Record<string, string> = {};

        if (query.name) searchParams.name = query.name;
        if (query.identifier) searchParams.identifier = query.identifier;
        if (query.gender) searchParams.gender = query.gender;
        if (query.birthdate) searchParams.birthdate = query.birthdate;

        // Add pagination parameters
        searchParams._count = size.toString();
        searchParams._getpagesoffset = (page * size).toString();

        // Execute search
        return this.hapiFhirAdapter.search('Patient', searchParams);
    }

    /**
     * Get summary statistics for patients
     */
    @Get('$summary')
    @ApiOperation({ summary: 'Get patient summary statistics' })
    @ApiResponse({ status: 200, description: 'Summary statistics' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    async getPatientSummaryStats(): Promise<any> {
        // Get total count
        const totalResult = await this.hapiFhirAdapter.search('Patient', { _summary: 'count' });
        const totalCount = totalResult.total || 0;

        // Get gender distribution
        const maleResult = await this.hapiFhirAdapter.search('Patient', { gender: 'male', _summary: 'count' });
        const femaleResult = await this.hapiFhirAdapter.search('Patient', { gender: 'female', _summary: 'count' });
        const otherResult = await this.hapiFhirAdapter.search('Patient', { gender: 'other', _summary: 'count' });

        // Return summary statistics
        return {
            totalPatients: totalCount,
            genderDistribution: {
                male: maleResult.total || 0,
                female: femaleResult.total || 0,
                other: otherResult.total || 0,
            }
        };
    }

    // Override for search method to add examples
    @Get()
    @ApiOperation({
        summary: 'Search for patients',
        description: 'Search for patients using FHIR search parameters. Results are paginated and can be filtered by name, gender, birthdate, and other supported parameters.'
    })
    @ApiResponse({
        status: 200,
        description: 'Search results',
        type: FhirBundleDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required'
    })
    @ApiQuery({ name: 'name', required: false, description: 'Patient name (supports :exact and :contains modifiers)' })
    @ApiQuery({ name: 'gender', required: false, description: 'Patient gender (male, female, other, unknown)' })
    @ApiQuery({ name: 'birthdate', required: false, description: 'Birth date in YYYY-MM-DD format (supports gt, lt, ge, le prefixes)' })
    @ApiQuery({ name: 'identifier', required: false, description: 'Patient identifier (format: [system]|[value])' })
    @ApiQuery({ name: '_count', required: false, description: 'Number of results per page' })
    @ApiQuery({ name: '_getpagesoffset', required: false, description: 'Offset for pagination' })
    async search(
        @Query() params: any,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        return super.search(params, req);
    }

    // Override for findOne method to add examples
    @Get(':id')
    @ApiOperation({
        summary: 'Get a patient by ID',
        description: 'Retrieves a specific patient resource by its ID. The user must have appropriate permissions to access the patient data.'
    })
    @ApiParam({ name: 'id', description: 'Patient ID' })
    @ApiResponse({
        status: 200,
        description: 'Patient retrieved successfully',
        type: PatientDto
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - Resource does not exist'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required'
    })
    async findOne(
        @Param('id') id: string,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        return super.findOne(id, req);
    }
} 