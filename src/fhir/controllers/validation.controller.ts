import { Controller, Post, UseGuards, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';

@ApiTags('validation')
@Controller('fhir')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ValidationController {
    constructor(private readonly hapiFhirAdapter: HapiFhirAdapter) { }

    /**
     * Validate a resource against FHIR specifications
     */
    @Post(':resourceType/$validate')
    @ApiOperation({ summary: 'Validate a FHIR resource' })
    @ApiParam({ name: 'resourceType', description: 'The type of resource to validate' })
    @ApiBody({ description: 'The resource to validate' })
    @ApiResponse({ status: 200, description: 'Validation result' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async validateResource(
        @Param('resourceType') resourceType: string,
        @Body() resource: any,
    ): Promise<any> {
        return this.hapiFhirAdapter.validate(resourceType, resource);
    }

    /**
     * Validate a specific resource instance
     */
    @Post(':resourceType/:id/$validate')
    @ApiOperation({ summary: 'Validate a specific resource instance' })
    @ApiParam({ name: 'resourceType', description: 'The type of resource to validate' })
    @ApiParam({ name: 'id', description: 'The ID of the resource instance' })
    @ApiBody({ description: 'The resource to validate (optional)' })
    @ApiResponse({ status: 200, description: 'Validation result' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async validateResourceInstance(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Body() resource?: any,
    ): Promise<any> {
        // If a resource body is provided, validate it
        if (resource && Object.keys(resource).length > 0) {
            return this.hapiFhirAdapter.validate(resourceType, resource);
        }

        // Otherwise retrieve the resource and validate it
        const retrievedResource = await this.hapiFhirAdapter.getById(resourceType, id);
        return this.hapiFhirAdapter.validate(resourceType, retrievedResource);
    }

    /**
     * Batch validate multiple resources
     */
    @Post('$validate-batch')
    @ApiOperation({ summary: 'Validate multiple resources in batch' })
    @ApiBody({ description: 'Bundle of resources to validate' })
    @ApiResponse({ status: 200, description: 'Batch validation results' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async validateBatch(@Body() bundle: any): Promise<any> {
        if (!bundle.resourceType || bundle.resourceType !== 'Bundle') {
            throw new Error('Invalid request. Expected a Bundle resource.');
        }

        if (!bundle.entry || !Array.isArray(bundle.entry)) {
            throw new Error('Invalid Bundle. Expected an entry array.');
        }

        // Validate each resource in the bundle
        const results = await Promise.all(
            bundle.entry.map(async (entry) => {
                const resource = entry.resource;
                if (!resource || !resource.resourceType) {
                    return {
                        resourceType: 'unknown',
                        valid: false,
                        issue: [{
                            severity: 'error',
                            code: 'structure',
                            diagnostics: 'Invalid resource structure in bundle entry'
                        }]
                    };
                }

                try {
                    const validationResult = await this.hapiFhirAdapter.validate(
                        resource.resourceType,
                        resource
                    );

                    return {
                        resourceType: resource.resourceType,
                        id: resource.id,
                        valid: !validationResult.issue || validationResult.issue.length === 0,
                        issue: validationResult.issue || []
                    };
                } catch (error) {
                    return {
                        resourceType: resource.resourceType,
                        id: resource.id,
                        valid: false,
                        issue: [{
                            severity: 'error',
                            code: 'exception',
                            diagnostics: `Validation error: ${error.message}`
                        }]
                    };
                }
            })
        );

        return {
            resourceType: 'Bundle',
            type: 'collection',
            entry: results.map(result => ({
                resource: result
            }))
        };
    }
} 