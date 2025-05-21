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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FhirService } from './fhir.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { Request } from 'express';

@ApiTags('fhir')
@Controller('fhir')
export class FhirController {
    constructor(private readonly fhirService: FhirService) { }

    @Post(':resourceType')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiResponse({ status: 201, description: 'Resource created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createResource(
        @Param('resourceType') resourceType: string,
        @Body() data: any,
        @Req() req: Request & { user: any },
    ) {
        return this.fhirService.createResource(resourceType, data, req.user._id);
    }

    @Get(':resourceType/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a specific FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiParam({ name: 'id', description: 'FHIR resource ID' })
    @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
    ) {
        return this.fhirService.getResource(resourceType, id);
    }

    @Put(':resourceType/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
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
    ) {
        return this.fhirService.updateResource(resourceType, id, data);
    }

    @Delete(':resourceType/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiParam({ name: 'id', description: 'FHIR resource ID' })
    @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    deleteResource(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
    ) {
        return this.fhirService.deleteResource(resourceType, id);
    }

    @Get(':resourceType/search')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Search for FHIR resources' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g., Patient, Observation)' })
    @ApiResponse({ status: 200, description: 'Search results' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    searchResources(
        @Param('resourceType') resourceType: string,
        @Query() query: ResourceQueryDto,
    ) {
        return this.fhirService.searchResources(resourceType, query);
    }

    @Get('my-resources')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get resources associated with the authenticated user' })
    @ApiResponse({ status: 200, description: 'User resources' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getUserResources(@Req() req: Request & { user: any }) {
        return this.fhirService.getUserResources(req.user._id);
    }
} 