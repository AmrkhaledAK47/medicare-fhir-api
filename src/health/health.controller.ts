import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthStatus {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    fhirServer: string;
    database: string;
    version: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    @Get()
    @ApiOperation({ summary: 'Get API health status' })
    @ApiResponse({
        status: 200,
        description: 'The API is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', example: '2023-08-25T12:34:56.789Z' },
                uptime: { type: 'number', example: 1234567 },
                environment: { type: 'string', example: 'production' },
                fhirServer: { type: 'string', example: 'connected' },
                database: { type: 'string', example: 'connected' },
                version: { type: 'string', example: '1.0.0' },
            },
        },
    })
    getHealth(): HealthStatus {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            environment: process.env.NODE_ENV || 'development',
            fhirServer: process.env.FHIR_SERVER_URL ? 'configured' : 'not configured',
            database: process.env.MONGODB_URI ? 'configured' : 'not configured',
            version: process.env.npm_package_version || '1.0.0',
        };
    }
} 