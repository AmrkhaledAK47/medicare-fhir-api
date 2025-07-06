import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('FHIR Help')
@Controller('fhir/help')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FhirQueryGuideController {
    /**
     * Get information about FHIR search parameters
     */
    @Get('query-guide')
    @Public()  // Make this endpoint public for API users
    @ApiOperation({ summary: 'Get guide for FHIR search parameters' })
    @ApiResponse({ status: 200, description: 'Search parameter guide retrieved successfully' })
    getQueryGuide(): any {
        return {
            success: true,
            data: {
                title: 'MediCare FHIR API Query Parameter Guide',
                description: 'This guide provides information on how to use query parameters with the MediCare FHIR API.',
                parameterTypes: [
                    {
                        type: 'Pagination',
                        parameters: [
                            { name: 'page', description: 'Page number (starting at 1)', example: '?page=2' },
                            { name: '_count', description: 'Number of results per page', example: '?_count=20' }
                        ]
                    },
                    {
                        type: 'Date Parameters',
                        description: 'Date parameters can be queried using exact values, ranges, or before/after constraints.',
                        parameters: [
                            { name: 'date', description: 'Exact date or date range', example: '?date=2023-01-01' },
                            { name: 'date-start', description: 'Start date (inclusive)', example: '?date-start=2023-01-01' },
                            { name: 'date-end', description: 'End date (inclusive)', example: '?date-end=2023-12-31' },
                            { name: 'date_start', description: 'Alternative format for start date', example: '?date_start=2023-01-01' },
                            { name: 'dateRange', description: 'Object format for date ranges', example: '?dateRange[start]=2023-01-01&dateRange[end]=2023-12-31' }
                        ]
                    },
                    {
                        type: 'Value Parameters',
                        description: 'Value parameters can be queried using exact values or ranges.',
                        parameters: [
                            { name: 'value-min', description: 'Minimum value', example: '?value-min=100' },
                            { name: 'value-max', description: 'Maximum value', example: '?value-max=200' },
                            { name: 'value_min', description: 'Alternative format for minimum value', example: '?value_min=100' },
                            { name: 'value-operator', description: 'Comparison operator (eq, ne, gt, lt, ge, le)', example: '?value-operator=gt&value=100' }
                        ]
                    },
                    {
                        type: 'Name Parameters',
                        description: 'Person names can be queried using various formats.',
                        parameters: [
                            { name: 'name', description: 'Full name search', example: '?name=John' },
                            { name: 'given', description: 'First/given name', example: '?given=John' },
                            { name: 'family', description: 'Last/family name', example: '?family=Smith' },
                            { name: 'firstName', description: 'Alternative for given name', example: '?firstName=John' },
                            { name: 'lastName', description: 'Alternative for family name', example: '?lastName=Smith' }
                        ]
                    },
                    {
                        type: 'Patient-specific Parameters',
                        parameters: [
                            { name: 'gender', description: 'Patient gender (male, female, other, unknown)', example: '?gender=male' },
                            { name: 'birthdate', description: 'Patient birthdate', example: '?birthdate=1970-01-01' },
                            { name: 'address-city', description: 'City in address', example: '?address-city=Boston' },
                            { name: 'address-state', description: 'State in address', example: '?address-state=MA' },
                            { name: 'address-postalCode', description: 'Postal/zip code in address', example: '?address-postalCode=02108' }
                        ]
                    },
                    {
                        type: 'Observation-specific Parameters',
                        parameters: [
                            { name: 'code', description: 'Observation code', example: '?code=8480-6' },
                            { name: 'category', description: 'Observation category', example: '?category=vital-signs' },
                            { name: 'component-code', description: 'Code in component', example: '?component-code=8480-6' },
                            { name: 'range-low', description: 'Lower bound of reference range', example: '?range-low=90' },
                            { name: 'range-high', description: 'Upper bound of reference range', example: '?range-high=120' }
                        ]
                    },
                    {
                        type: 'Special FHIR Parameters',
                        parameters: [
                            { name: '_sort', description: 'Sort results by parameter', example: '?_sort=date' },
                            { name: '_include', description: 'Include referenced resources', example: '?_include=Observation:patient' },
                            { name: '_revinclude', description: 'Include resources that reference this one', example: '?_revinclude=Observation:patient' },
                            { name: '_summary', description: 'Return summary of resource', example: '?_summary=true' },
                            { name: '_elements', description: 'Return only specific elements', example: '?_elements=id,code,value' }
                        ]
                    }
                ],
                exampleQueries: [
                    {
                        description: 'Find all patients named Smith',
                        url: '/api/fhir/Patient?family=Smith'
                    },
                    {
                        description: 'Find male patients born after 1980',
                        url: '/api/fhir/Patient?gender=male&birthdate=gt1980-01-01'
                    },
                    {
                        description: 'Find vital sign observations for a specific patient in a date range',
                        url: '/api/fhir/Observation?subject=Patient/123&category=vital-signs&date-start=2023-01-01&date-end=2023-12-31'
                    },
                    {
                        description: 'Find blood pressure observations with systolic > 140',
                        url: '/api/fhir/Observation?code=85354-9&component-code=8480-6&value-operator=gt&value=140'
                    },
                    {
                        description: 'Get the second page of 20 observations',
                        url: '/api/fhir/Observation?_count=20&page=2'
                    }
                ]
            }
        };
    }

    /**
     * Get information about common FHIR codes used in the API
     */
    @Get('codes')
    @Public()  // Make this endpoint public for API users
    @ApiOperation({ summary: 'Get guide for common FHIR codes' })
    @ApiResponse({ status: 200, description: 'Common FHIR codes guide retrieved successfully' })
    getCodesGuide(): any {
        return {
            success: true,
            data: {
                title: 'MediCare FHIR API Common Codes Guide',
                description: 'This guide provides information on common FHIR codes used in the API.',
                codeSystems: [
                    {
                        name: 'LOINC',
                        url: 'http://loinc.org',
                        description: 'Logical Observation Identifiers Names and Codes',
                        commonCodes: [
                            { code: '8480-6', display: 'Systolic blood pressure' },
                            { code: '8462-4', display: 'Diastolic blood pressure' },
                            { code: '85354-9', display: 'Blood pressure panel' },
                            { code: '8867-4', display: 'Heart rate' },
                            { code: '9279-1', display: 'Respiratory rate' },
                            { code: '8310-5', display: 'Body temperature' },
                            { code: '8302-2', display: 'Body height' },
                            { code: '29463-7', display: 'Body weight' },
                            { code: '39156-5', display: 'Body mass index' }
                        ]
                    },
                    {
                        name: 'SNOMED CT',
                        url: 'http://snomed.info/sct',
                        description: 'SNOMED Clinical Terms',
                        commonCodes: [
                            { code: '386661006', display: 'Fever' },
                            { code: '73211009', display: 'Diabetes mellitus' },
                            { code: '38341003', display: 'Hypertensive disorder' },
                            { code: '195967001', display: 'Asthma' },
                            { code: '44054006', display: 'Diabetes mellitus type 2' }
                        ]
                    }
                ],
                observationCategories: [
                    { code: 'vital-signs', display: 'Vital Signs' },
                    { code: 'laboratory', display: 'Laboratory' },
                    { code: 'social-history', display: 'Social History' },
                    { code: 'imaging', display: 'Imaging' },
                    { code: 'procedure', display: 'Procedure' }
                ]
            }
        };
    }
} 