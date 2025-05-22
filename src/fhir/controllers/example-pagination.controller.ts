import { Controller, Get, UseGuards, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { PaginationInterceptor } from '../../common/interceptors/pagination.interceptor';

@ApiTags('pagination-examples')
@Controller('fhir/examples')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExamplePaginationController {
    constructor(private readonly hapiFhirAdapter: HapiFhirAdapter) { }

    @Get('paginated-patients')
    @ApiOperation({ summary: 'Example of paginated patients endpoint' })
    @ApiResponse({ status: 200, description: 'Paginated list of patients' })
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @UseInterceptors(PaginationInterceptor)
    async getPaginatedPatients(@Query() pagination: PaginationDto): Promise<any> {
        // Use the pagination DTO to get FHIR pagination parameters
        const fhirParams = pagination.toFhirParams();

        // Add any additional search parameters here
        const searchParams = {
            ...fhirParams,
            // Example: '_sort': 'name'
        };

        // Return the Bundle directly - the interceptor will transform it
        return this.hapiFhirAdapter.search('Patient', searchParams);
    }

    @Get('paginated-practitioners')
    @ApiOperation({ summary: 'Example of paginated practitioners endpoint' })
    @ApiResponse({ status: 200, description: 'Paginated list of practitioners' })
    @Roles(Role.ADMIN, Role.PATIENT, Role.PRACTITIONER)
    @UseInterceptors(PaginationInterceptor)
    async getPaginatedPractitioners(@Query() pagination: PaginationDto): Promise<any> {
        // Use the pagination DTO to get FHIR pagination parameters
        const fhirParams = pagination.toFhirParams();

        // Add any additional search parameters here
        const searchParams = {
            ...fhirParams,
            // Example: '_sort': 'name'
        };

        // Return the Bundle directly - the interceptor will transform it
        return this.hapiFhirAdapter.search('Practitioner', searchParams);
    }
} 