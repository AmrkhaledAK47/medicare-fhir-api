import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: 'Get API health status' })
    @ApiResponse({ status: 200, description: 'API is healthy' })
    getApiHealth() {
        return this.healthService.getApiHealth();
    }

    @Get('fhir-server')
    @ApiOperation({ summary: 'Check FHIR server health status' })
    @ApiResponse({ status: 200, description: 'FHIR server health status' })
    @ApiResponse({ status: 503, description: 'FHIR server is unhealthy or unavailable' })
    checkFhirServerHealth() {
        return this.healthService.checkFhirServerHealth();
    }
} 