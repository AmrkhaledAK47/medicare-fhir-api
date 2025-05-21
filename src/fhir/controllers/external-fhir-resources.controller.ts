import {
    Controller, Get, Post, Put, Delete,
    Param, Body, Query, Inject, Logger,
    HttpCode, HttpStatus, All, Req
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ExternalFhirService } from '../services/external-fhir.service';

@ApiTags('External FHIR Resources')
@Controller('fhir')
export class ExternalFhirResourcesController {
    private readonly logger = new Logger(ExternalFhirResourcesController.name);
    private readonly localResources: string[];
    private readonly externalResources: string[];

    constructor(
        private readonly externalFhirService: ExternalFhirService,
        @Inject('EXTERNAL_FHIR_OPTIONS') private readonly options: any,
    ) {
        this.localResources = options.localResources || [];
        this.externalResources = options.externalResources || ['*'];

        this.logger.log(`Initialized with local resources: ${this.localResources.join(', ')}`);
        this.logger.log(`External resources pattern: ${this.externalResources.join(', ')}`);
    }

    private shouldRouteToExternal(resourceType: string): boolean {
        // If the resource is in the local list, don't route externally
        if (this.localResources.includes(resourceType)) {
            return false;
        }

        // If we have a wildcard or the specific resource in external list, route externally
        return this.externalResources.includes('*') || this.externalResources.includes(resourceType);
    }

    @Get('metadata')
    @ApiOperation({ summary: 'Get FHIR server metadata (capability statement)' })
    @ApiResponse({ status: 200, description: 'FHIR capability statement' })
    async getMetadata() {
        return this.externalFhirService.getServerMetadata();
    }

    @Get(':resourceType')
    @ApiOperation({ summary: 'Search for resources of a specific type' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiResponse({ status: 200, description: 'Resource bundle' })
    async searchResources(
        @Param('resourceType') resourceType: string,
        @Query() searchParams: any
    ) {
        if (!this.shouldRouteToExternal(resourceType)) {
            this.logger.debug(`Resource ${resourceType} is handled locally, not forwarding search request`);
            throw new Error(`Resource ${resourceType} is handled locally`);
        }

        this.logger.debug(`Forwarding search request for ${resourceType} with params: ${JSON.stringify(searchParams)}`);
        return this.externalFhirService.searchResources(resourceType, searchParams);
    }

    @Get(':resourceType/:id')
    @ApiOperation({ summary: 'Get a specific resource by ID' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: 200, description: 'Requested resource' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async getResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string
    ) {
        if (!this.shouldRouteToExternal(resourceType)) {
            this.logger.debug(`Resource ${resourceType} is handled locally, not forwarding get request`);
            throw new Error(`Resource ${resourceType} is handled locally`);
        }

        this.logger.debug(`Forwarding get request for ${resourceType}/${id}`);
        return this.externalFhirService.getResource(resourceType, id);
    }

    @Post(':resourceType')
    @ApiOperation({ summary: 'Create a new resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiBody({ description: 'Resource to create' })
    @ApiResponse({ status: 201, description: 'Resource created' })
    @HttpCode(HttpStatus.CREATED)
    async createResource(
        @Param('resourceType') resourceType: string,
        @Body() resource: any
    ) {
        if (!this.shouldRouteToExternal(resourceType)) {
            this.logger.debug(`Resource ${resourceType} is handled locally, not forwarding create request`);
            throw new Error(`Resource ${resourceType} is handled locally`);
        }

        // Ensure resourceType in body matches URL
        resource.resourceType = resourceType;

        this.logger.debug(`Forwarding create request for ${resourceType}`);
        return this.externalFhirService.createResource(resourceType, resource);
    }

    @Put(':resourceType/:id')
    @ApiOperation({ summary: 'Update a resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiBody({ description: 'Updated resource' })
    @ApiResponse({ status: 200, description: 'Resource updated' })
    async updateResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Body() resource: any
    ) {
        if (!this.shouldRouteToExternal(resourceType)) {
            this.logger.debug(`Resource ${resourceType} is handled locally, not forwarding update request`);
            throw new Error(`Resource ${resourceType} is handled locally`);
        }

        // Ensure resourceType and id in body match URL
        resource.resourceType = resourceType;
        resource.id = id;

        this.logger.debug(`Forwarding update request for ${resourceType}/${id}`);
        return this.externalFhirService.updateResource(resourceType, id, resource);
    }

    @Delete(':resourceType/:id')
    @ApiOperation({ summary: 'Delete a resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: 204, description: 'Resource deleted' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string
    ) {
        if (!this.shouldRouteToExternal(resourceType)) {
            this.logger.debug(`Resource ${resourceType} is handled locally, not forwarding delete request`);
            throw new Error(`Resource ${resourceType} is handled locally`);
        }

        this.logger.debug(`Forwarding delete request for ${resourceType}/${id}`);
        await this.externalFhirService.deleteResource(resourceType, id);
    }

    @Post()
    @ApiOperation({ summary: 'Process a FHIR transaction or batch bundle' })
    @ApiBody({ description: 'FHIR Bundle with type transaction or batch' })
    @ApiResponse({ status: 200, description: 'Transaction processed' })
    async processBundleTransaction(@Body() bundle: any) {
        if (bundle.resourceType !== 'Bundle') {
            throw new Error('Root resource must be a Bundle');
        }

        if (bundle.type !== 'transaction' && bundle.type !== 'batch') {
            throw new Error('Bundle type must be transaction or batch');
        }

        this.logger.debug(`Forwarding ${bundle.type} bundle with ${bundle.entry?.length || 0} entries`);
        return this.externalFhirService.executeTransaction(bundle);
    }

    @Get('$supported-resources')
    @ApiOperation({ summary: 'Get list of supported resource types' })
    @ApiResponse({ status: 200, description: 'List of supported resource types' })
    async getSupportedResourceTypes() {
        const externalTypes = await this.externalFhirService.getSupportedResourceTypes();

        return {
            resourceTypes: {
                local: this.localResources,
                external: externalTypes,
            }
        };
    }
} 