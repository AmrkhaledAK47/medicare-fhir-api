import { Controller, Get, Post, UseGuards, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TerminologyAdapter } from '../adapters/terminology.adapter';

@ApiTags('terminology')
@Controller('fhir/terminology')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TerminologyController {
    constructor(private readonly terminologyAdapter: TerminologyAdapter) { }

    /**
     * Validate if a code is valid within a code system
     */
    @Get('validate-code')
    @ApiOperation({ summary: 'Validate a code in a code system' })
    @ApiQuery({ name: 'system', description: 'The code system URL' })
    @ApiQuery({ name: 'code', description: 'The code to validate' })
    @ApiQuery({ name: 'display', required: false, description: 'The display text to validate' })
    @ApiResponse({ status: 200, description: 'Code validation result' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async validateCode(
        @Query('system') system: string,
        @Query('code') code: string,
        @Query('display') display?: string,
    ): Promise<any> {
        return this.terminologyAdapter.validateCode(system, code, display);
    }

    /**
     * Expand a value set
     */
    @Get('expand')
    @ApiOperation({ summary: 'Expand a value set' })
    @ApiQuery({ name: 'url', description: 'The value set URL to expand' })
    @ApiQuery({ name: 'filter', required: false, description: 'Filter for expansion' })
    @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
    @ApiQuery({ name: 'count', required: false, description: 'Number of results to return' })
    @ApiResponse({ status: 200, description: 'Expanded value set' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async expandValueSet(
        @Query('url') url: string,
        @Query('filter') filter?: string,
        @Query('offset') offset?: number,
        @Query('count') count?: number,
    ): Promise<any> {
        return this.terminologyAdapter.expandValueSet(url, filter, offset, count);
    }

    /**
     * Translate a code from one system to another
     */
    @Get('translate')
    @ApiOperation({ summary: 'Translate a code from one system to another' })
    @ApiQuery({ name: 'source-system', description: 'The source code system URL' })
    @ApiQuery({ name: 'source-code', description: 'The source code to translate' })
    @ApiQuery({ name: 'target-system', description: 'The target code system URL' })
    @ApiResponse({ status: 200, description: 'Code translation result' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async translateCode(
        @Query('source-system') sourceSystem: string,
        @Query('source-code') sourceCode: string,
        @Query('target-system') targetSystem: string,
    ): Promise<any> {
        return this.terminologyAdapter.translateCode(sourceSystem, sourceCode, targetSystem);
    }

    /**
     * Lookup code details
     */
    @Get('lookup')
    @ApiOperation({ summary: 'Lookup details for a specific code' })
    @ApiQuery({ name: 'system', description: 'The code system URL' })
    @ApiQuery({ name: 'code', description: 'The code to lookup' })
    @ApiResponse({ status: 200, description: 'Code details' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async lookupCode(
        @Query('system') system: string,
        @Query('code') code: string,
    ): Promise<any> {
        return this.terminologyAdapter.lookupCode(system, code);
    }

    /**
     * Find concepts matching a search criteria
     */
    @Post('find-matches')
    @ApiOperation({ summary: 'Find concepts matching a criteria' })
    @ApiBody({ description: 'Search criteria' })
    @ApiResponse({ status: 200, description: 'Matching concepts' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async findConcepts(@Body() data: {
        system: string;
        searchText: string;
        property?: string[];
    }): Promise<any> {
        return this.terminologyAdapter.findConcepts(
            data.system,
            data.searchText,
            data.property,
        );
    }
} 