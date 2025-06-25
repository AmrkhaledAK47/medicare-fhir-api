import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('observations')
@Controller('fhir/Observation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObservationController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Observation');
    }

    /**
     * Get observations by code (e.g., vital signs, lab results)
     */
    @Get('$by-code')
    @ApiOperation({ summary: 'Search observations by code' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @ApiQuery({ name: 'code', required: true, description: 'Observation code (LOINC, SNOMED CT, etc.)' })
    @ApiQuery({ name: 'system', required: false, description: 'Code system (e.g., http://loinc.org)' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getObservationsByCode(
        @Query('code') code: string,
        @Query('system') system: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        const params = {
            ...query,
            code: system ? `${system}|${code}` : code,
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get observations for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get observations for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @ApiQuery({ name: 'category', required: false, description: 'Observation category (e.g., vital-signs, laboratory)' })
    @ApiQuery({ name: 'date', required: false, description: 'Date filter (e.g., gt2022-01-01, le2022-12-31)' })
    @ApiQuery({ name: 'code', required: false, description: 'Observation code' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientObservations(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get the latest observation of a specific type for a patient
     */
    @Get('patient/:patientId/latest')
    @ApiOperation({ summary: 'Get latest observation of a specific type for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiQuery({ name: 'code', required: true, description: 'Observation code' })
    @ApiResponse({ status: 200, description: 'Latest observation retrieved successfully' })
    @ApiResponse({ status: 404, description: 'No observations found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getLatestObservation(
        @Param('patientId') patientId: string,
        @Query('code') code: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'code': code,
            '_sort': '-date', // Sort by date descending
            '_count': '1', // Limit to 1 result
        };

        const result = await this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));

        if (!result.entry || result.entry.length === 0) {
            throw new Error('No observations found for the specified criteria');
        }

        return result.entry[0].resource;
    }

    /**
     * Get vital signs for a patient
     */
    @Get('patient/:patientId/vitals')
    @ApiOperation({ summary: 'Get vital signs for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiQuery({ name: 'date', required: false, description: 'Date filter (e.g., gt2022-01-01, le2022-12-31)' })
    @ApiResponse({ status: 200, description: 'Vital signs retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getVitalSigns(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'category': 'vital-signs',
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get lab results for a patient
     */
    @Get('patient/:patientId/labs')
    @ApiOperation({ summary: 'Get lab results for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiQuery({ name: 'date', required: false, description: 'Date filter (e.g., gt2022-01-01, le2022-12-31)' })
    @ApiResponse({ status: 200, description: 'Lab results retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
    async getLabResults(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'category': 'laboratory',
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get observations by component code
     */
    @Get('$by-component')
    @ApiOperation({ summary: 'Search observations by component code' })
    @ApiQuery({ name: 'component-code', required: true, description: 'Component code to search for' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getObservationsByComponent(
        @Query('component-code') componentCode: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!componentCode) {
            throw new Error('Component-code parameter is required');
        }

        const params = {
            ...query,
            'component-code': componentCode,
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get observations by value range
     */
    @Get('$by-value-range')
    @ApiOperation({ summary: 'Search observations by value range' })
    @ApiQuery({ name: 'code', required: true, description: 'Observation code' })
    @ApiQuery({ name: 'value-min', required: false, description: 'Minimum value' })
    @ApiQuery({ name: 'value-max', required: false, description: 'Maximum value' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getObservationsByValueRange(
        @Query('code') code: string,
        @Query('value-min') valueMin: string,
        @Query('value-max') valueMax: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        if (!valueMin && !valueMax) {
            throw new Error('At least one of value-min or value-max is required');
        }

        const params = {
            ...query,
            'code': code,
            'value-min': valueMin,
            'value-max': valueMax,
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get observations using composite search parameters
     * Allows searching by component-code and component-value together
     */
    @Get('$by-component-value')
    @ApiOperation({ summary: 'Search observations by component code and value' })
    @ApiQuery({ name: 'component-code', required: true, description: 'Component code to search for' })
    @ApiQuery({ name: 'value-operator', required: false, description: 'Value comparison operator (eq, ne, gt, lt, ge, le)', enum: ['eq', 'ne', 'gt', 'lt', 'ge', 'le'] })
    @ApiQuery({ name: 'value', required: true, description: 'Value to compare against' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getObservationsByComponentValue(
        @Query('component-code') componentCode: string,
        @Query('value-operator') valueOperator: string,
        @Query('value') value: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!componentCode) {
            throw new Error('Component-code parameter is required');
        }

        if (!value) {
            throw new Error('Value parameter is required');
        }

        // Default operator is equals if not specified
        const operator = valueOperator || 'eq';

        // Validate operator
        if (!['eq', 'ne', 'gt', 'lt', 'ge', 'le'].includes(operator)) {
            throw new Error('Invalid value-operator. Must be one of: eq, ne, gt, lt, ge, le');
        }

        const params = {
            ...query,
            'component-code-value-quantity': `${componentCode}$${operator}${value}`,
        };

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Get observations within a specific reference range
     */
    @Get('$by-reference-range')
    @ApiOperation({ summary: 'Search observations by reference range' })
    @ApiQuery({ name: 'code', required: true, description: 'Observation code' })
    @ApiQuery({ name: 'range-low', required: false, description: 'Low value of reference range' })
    @ApiQuery({ name: 'range-high', required: false, description: 'High value of reference range' })
    @ApiResponse({ status: 200, description: 'Observations retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getObservationsByReferenceRange(
        @Query('code') code: string,
        @Query('range-low') rangeLow: string,
        @Query('range-high') rangeHigh: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        if (!rangeLow && !rangeHigh) {
            throw new Error('At least one of range-low or range-high is required');
        }

        const params = {
            ...query,
            'code': code,
        };

        if (rangeLow) {
            params['reference-range-low'] = rangeLow;
        }

        if (rangeHigh) {
            params['reference-range-high'] = rangeHigh;
        }

        return this.hapiFhirAdapter.search('Observation', this.transformQueryParams(params));
    }

    /**
     * Create a new observation
     */
    @Post()
    @ApiOperation({ summary: 'Create a new observation' })
    @ApiBody({ description: 'Observation resource' })
    @ApiResponse({ status: 201, description: 'Observation created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid observation data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createObservation(@Body() data: any): Promise<any> {
        // Ensure we have a valid Observation resource
        if (!data.resourceType || data.resourceType !== 'Observation') {
            throw new Error('Invalid observation data. Expected Observation resource.');
        }

        // Validate the observation according to FHIR rules
        // You might want to add additional validation here

        return this.hapiFhirAdapter.create('Observation', data);
    }

    /**
     * Override transformQueryParams to add observation-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches
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

        // Handle value range searches
        if (params.value_min || params.value_max || params['value-min'] || params['value-max']) {
            let valueRange = '';

            // Support both formats: value_min and value-min
            const min = params.value_min || params['value-min'];
            const max = params.value_max || params['value-max'];

            if (min) {
                valueRange += `ge${min}`;
            }
            if (max) {
                if (valueRange) {
                    valueRange += `,le${max}`;
                } else {
                    valueRange = `le${max}`;
                }
            }
            if (valueRange) {
                searchParams['value-quantity'] = valueRange;
            }
        }

        // Handle status filter
        if (params.status && Array.isArray(params.status)) {
            searchParams.status = params.status.join(',');
        }

        // Handle component code searches
        if (params['component-code']) {
            searchParams['component-code'] = params['component-code'];
        }

        // Handle component value searches
        if (params['component-value-quantity']) {
            searchParams['component-value-quantity'] = params['component-value-quantity'];
        }

        // Handle composite search parameters (component-code-value-quantity)
        if (params['component-code-value-quantity']) {
            searchParams['component-code-value-quantity'] = params['component-code-value-quantity'];
        }

        // Handle reference range searches
        if (params['reference-range']) {
            searchParams['reference-range'] = params['reference-range'];
        }

        // Handle specific reference range low/high searches
        if (params['reference-range-low']) {
            searchParams['reference-range-low'] = params['reference-range-low'];
        }

        if (params['reference-range-high']) {
            searchParams['reference-range-high'] = params['reference-range-high'];
        }

        // Handle data absent reason searches
        if (params['data-absent-reason']) {
            searchParams['data-absent-reason'] = params['data-absent-reason'];
        }

        // Handle derived-from searches (e.g., observations derived from other observations)
        if (params['derived-from']) {
            searchParams['derived-from'] = params['derived-from'];
        }

        // Handle has-member searches (e.g., panel observations)
        if (params['has-member']) {
            searchParams['has-member'] = params['has-member'];
        }

        // Handle chained parameters for patient
        Object.keys(params).forEach(key => {
            if (key.startsWith('patient.')) {
                const chainedParam = key.substring('patient.'.length);
                searchParams[`subject:Patient.${chainedParam}`] = params[key];
            }
        });

        // Handle chained parameters for performer
        Object.keys(params).forEach(key => {
            if (key.startsWith('performer.')) {
                const chainedParam = key.substring('performer.'.length);
                searchParams[`performer.${chainedParam}`] = params[key];
            }
        });

        // Handle combination searches with comma-separated values
        ['code', 'category', 'identifier'].forEach(param => {
            if (params[param] && params[param].includes(',')) {
                // Keep comma-separated values as is for FHIR OR searches
                searchParams[param] = params[param];
            }
        });

        // Handle _has parameter for reverse chaining
        // Example: _has:Observation:patient:code=1234
        Object.keys(params).forEach(key => {
            if (key.startsWith('_has:')) {
                searchParams[key] = params[key];
            }
        });

        return searchParams;
    }
} 