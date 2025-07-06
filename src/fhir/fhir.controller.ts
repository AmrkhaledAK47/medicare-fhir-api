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
    Req,
    HttpStatus,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FhirService } from './fhir.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { Request } from 'express';
import { ResourceRegistryService } from './services/resource-registry.service';
import { Public } from '../auth/decorators/public.decorator';
import { GenericResourceService } from './services/generic-resource.service';
import { AccessCodesService } from '../access-codes/access-codes.service';
import { Logger } from '@nestjs/common';
import axios from 'axios'; // Added axios import

@ApiTags('fhir')
@Controller('fhir')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FhirController {
    private readonly logger = new Logger(FhirController.name);

    constructor(
        private readonly fhirService: FhirService,
        private readonly resourceRegistry: ResourceRegistryService,
        private readonly genericResourceService: GenericResourceService,
        private readonly accessCodesService: AccessCodesService
    ) { }

    @Post(':resourceType')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create a new FHIR resource (Admin & Practitioner only)' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiResponse({ status: 201, description: 'Resource created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async createResource(
        @Param('resourceType') resourceType: string,
        @Body() data: any,
        @Req() req: Request & { user: any },
    ) {
        return this.fhirService.createResource(resourceType, data, req.user._id);
    }

    @Get(':resourceType/:id')
    @ApiOperation({ summary: 'Get a specific FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiParam({ name: 'id', description: 'FHIR resource ID' })
    @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Req() req: Request & { user: any },
    ) {
        // Log the request for debugging
        this.logger.debug(`GET request for ${resourceType}/${id} by user ${req.user?.email} (${req.user?.role})`);

        // Normalize resource ID (handle with or without 'res-' prefix)
        const normalizedId = id.startsWith('res-') ? id : `res-${id}`;

        // For specific resources, check permissions based on user role
        if (req.user.role === Role.ADMIN) {
            // Admins can access any resource
            return this.fhirService.getResource(resourceType, normalizedId);
        } else {
            // Other roles can access resources based on permissions
            return this.fhirService.getResourceWithPermissionCheck(resourceType, normalizedId, req.user);
        }
    }

    @Put(':resourceType/:id')
    @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
    @ApiOperation({ summary: 'Update a FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiParam({ name: 'id', description: 'FHIR resource ID' })
    @ApiResponse({ status: 200, description: 'Resource updated successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    updateResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Body() data: any,
        @Req() req: Request & { user: any },
    ) {
        // Log the request for debugging
        this.logger.debug(`PUT request for ${resourceType}/${id} by user ${req.user?.email} (${req.user?.role})`);

        // Normalize resource ID (handle with or without 'res-' prefix)
        const normalizedId = id.startsWith('res-') ? id : `res-${id}`;

        // Ensure the resource type and ID in the body match the URL
        data.resourceType = resourceType;
        data.id = normalizedId;

        if (req.user.role === Role.ADMIN) {
            // Admins can update any resource
            return this.fhirService.updateResource(resourceType, normalizedId, data);
        } else {
            // Other roles can update resources based on permissions
            return this.fhirService.updateResourceWithPermissionCheck(resourceType, normalizedId, data, req.user);
        }
    }

    @Delete(':resourceType/:id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete a FHIR resource (Admin only)' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiParam({ name: 'id', description: 'FHIR resource ID' })
    @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    deleteResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
    ) {
        return this.fhirService.deleteResource(resourceType, id);
    }

    @Get(':resourceType')
    @ApiOperation({ summary: 'Search for FHIR resources' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiResponse({ status: 200, description: 'Search results' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    searchResources(
        @Param('resourceType') resourceType: string,
        @Query() query: ResourceQueryDto,
        @Req() req: Request & { user: any },
    ) {
        if (req.user.role === Role.ADMIN) {
            return this.fhirService.searchResources(resourceType, query);
        } else {
            return this.fhirService.searchResourcesWithPermissionCheck(resourceType, query, req.user);
        }
    }

    @Get('my-resources')
    @ApiOperation({ summary: 'Get resources associated with the authenticated user' })
    @ApiResponse({ status: 200, description: 'User resources' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getUserResources(@Req() req: Request & { user: any }) {
        return this.fhirService.getUserResources(req.user._id);
    }

    @Get('patient-profile')
    @Roles(Role.PATIENT)
    @ApiOperation({ summary: 'Get the Patient resource for the authenticated patient user' })
    @ApiResponse({ status: 200, description: 'Patient profile' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Patient access required' })
    @ApiResponse({ status: 404, description: 'Patient profile not found' })
    async getPatientProfile(@Req() req: Request & { user: any }) {
        if (!req.user.fhirResourceId || req.user.fhirResourceType !== 'Patient') {
            throw new Error('No patient profile linked to this account');
        }

        return this.fhirService.getResource('Patient', req.user.fhirResourceId);
    }

    @Get('practitioner-profile')
    @Roles(Role.PRACTITIONER)
    @ApiOperation({ summary: 'Get the Practitioner resource for the authenticated practitioner user' })
    @ApiResponse({ status: 200, description: 'Practitioner profile' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Practitioner access required' })
    @ApiResponse({ status: 404, description: 'Practitioner profile not found' })
    async getPractitionerProfile(@Req() req: Request & { user: any }) {
        if (!req.user.fhirResourceId || req.user.fhirResourceType !== 'Practitioner') {
            throw new Error('No practitioner profile linked to this account');
        }

        return this.fhirService.getResource('Practitioner', req.user.fhirResourceId);
    }

    @Get('metadata')
    @Public()
    @ApiOperation({ summary: 'Get FHIR server capability statement' })
    @ApiResponse({ status: 200, description: 'FHIR capability statement' })
    async getMetadata() {
        // Build capability statement dynamically based on registered resources
        const resources = this.resourceRegistry.getRegisteredResourceTypes();

        return {
            resourceType: 'CapabilityStatement',
            status: 'active',
            date: new Date().toISOString(),
            publisher: 'MediCare API',
            kind: 'instance',
            software: {
                name: 'MediCare FHIR API',
                version: '1.0.0',
            },
            implementation: {
                description: 'MediCare FHIR API Server',
                url: 'api/fhir',
            },
            fhirVersion: '4.0.1',
            format: ['json'],
            rest: [
                {
                    mode: 'server',
                    resource: resources.map(resourceType => ({
                        type: resourceType,
                        interaction: [
                            { code: 'read' },
                            { code: 'search-type' },
                            { code: 'create' },
                            { code: 'update' },
                            { code: 'delete' }
                        ],
                        searchParam: this.getSearchParamsForResource(resourceType),
                    })),
                },
            ],
        };
    }

    @Get('health')
    @ApiOperation({ summary: 'Check FHIR server health' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Server health information' })
    async checkHealth() {
        const localStatus = true; // API is running
        const hapiFhirStatus = await this.fhirService.checkFhirServerHealth();

        return {
            status: 'online',
            components: {
                api: localStatus,
                hapiFhir: hapiFhirStatus,
            },
            timestamp: new Date().toISOString(),
        };
    }

    @Get('registry')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get registered resource types' })
    @ApiResponse({ status: 200, description: 'List of registered FHIR resource types' })
    async getRegistry() {
        const resources = this.resourceRegistry.getRegisteredResourceTypes();
        return { resources };
    }

    @Post(':resourceType/with-access-code')
    @Public()
    @ApiOperation({ summary: 'Create a FHIR resource with access code for registration' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (Patient or Practitioner)' })
    @ApiResponse({ status: 201, description: 'Resource created and access code sent' })
    @ApiResponse({ status: 400, description: 'Invalid input or resource type' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async createResourceWithAccessCode(
        @Param('resourceType') resourceType: string,
        @Body() resourceData: any,
        @Query('email') email: string,
        @Req() req: Request & { user?: any },
    ) {
        // Check if user is authenticated and has admin role
        if (!req.user || req.user.role !== Role.ADMIN) {
            throw new BadRequestException('Admin access required');
        }

        if (!email) {
            throw new BadRequestException('Email is required for access code generation');
        }

        // Only allow Patient and Practitioner resources for this endpoint
        const allowedResourceTypes = ['Patient', 'Practitioner'];
        const normalizedResourceType = this.fhirService.normalizeResourceType(resourceType);

        if (!allowedResourceTypes.includes(normalizedResourceType)) {
            throw new BadRequestException(`Only ${allowedResourceTypes.join(', ')} resources can be created with access codes`);
        }

        try {
            this.logger.log(`Creating ${normalizedResourceType} with access code for email: ${email}`);

            // Ensure resourceType is set correctly
            resourceData.resourceType = normalizedResourceType;

            // Ensure the resource has the email in telecom
            if (!resourceData.telecom) {
                resourceData.telecom = [];
            }

            // Add email to telecom if not already present
            const hasEmail = resourceData.telecom.some(
                t => t.system === 'email' && t.value === email
            );

            if (!hasEmail) {
                resourceData.telecom.push({
                    system: 'email',
                    value: email,
                    use: normalizedResourceType === 'Patient' ? 'home' : 'work'
                });
            }

            // Create the resource directly using the FHIR service
            const createdResource = await axios.post(
                `${this.fhirService.getBaseUrl()}/${normalizedResourceType}`,
                resourceData,
                {
                    headers: {
                        'Content-Type': 'application/fhir+json',
                        'Accept': 'application/fhir+json'
                    }
                }
            );

            const resourceId = createdResource.data.id;

            // Generate an access code
            const role = normalizedResourceType.toLowerCase();
            const accessCode = await this.accessCodesService.create({
                role,
                recipientEmail: email,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                resourceId: resourceId,
                resourceType: normalizedResourceType
            });

            this.logger.log(`Successfully created ${normalizedResourceType} resource with ID ${resourceId} and generated access code`);

            return {
                success: true,
                data: {
                    resource: createdResource.data,
                    accessCode: accessCode.code
                }
            };
        } catch (error) {
            this.logger.error(`Failed to create ${normalizedResourceType} with access code: ${error.message}`);
            throw error;
        }
    }

    private getSearchParamsForResource(resourceType: string): any[] {
        // Common search parameters for all resources
        const commonParams = [
            { name: '_id', type: 'token' },
            { name: '_lastUpdated', type: 'date' },
        ];

        // Resource-specific search parameters
        const specificParams: Record<string, any[]> = {
            Patient: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
                { name: 'birthdate', type: 'date' },
                { name: 'gender', type: 'token' },
                { name: 'address', type: 'string' },
                { name: 'phone', type: 'token' },
                { name: 'email', type: 'token' },
            ],
            Practitioner: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
                { name: 'specialty', type: 'token' },
            ],
            Organization: [
                { name: 'name', type: 'string' },
                { name: 'address', type: 'string' },
            ],
            Encounter: [
                { name: 'patient', type: 'reference' },
                { name: 'date', type: 'date' },
                { name: 'status', type: 'token' },
            ],
            Observation: [
                { name: 'patient', type: 'reference' },
                { name: 'code', type: 'token' },
                { name: 'date', type: 'date' },
                { name: 'category', type: 'token' },
            ],
            DiagnosticReport: [
                { name: 'patient', type: 'reference' },
                { name: 'code', type: 'token' },
                { name: 'date', type: 'date' },
            ],
            Medication: [
                { name: 'code', type: 'token' },
                { name: 'status', type: 'token' },
            ],
            Questionnaire: [
                { name: 'title', type: 'string' },
                { name: 'status', type: 'token' },
            ],
        };

        return [...commonParams, ...(specificParams[resourceType] || [])];
    }
} 