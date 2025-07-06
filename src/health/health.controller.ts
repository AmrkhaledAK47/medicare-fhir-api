import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MongooseHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { FhirService } from '../fhir/fhir.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private mongo: MongooseHealthIndicator,
        private configService: ConfigService,
        private fhirService: FhirService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    @Get()
    @Public()
    @HealthCheck()
    @ApiOperation({ summary: 'Check system health' })
    check() {
        return this.health.check([
            // Check MongoDB connection
            () => this.mongo.pingCheck('mongodb'),

            // Check FHIR server
            async () => {
                const isHealthy = await this.fhirService.checkHealth();
                return {
                    fhir: {
                        status: isHealthy ? 'up' : 'down',
                    },
                };
            },

            // Check Redis connection
            async () => {
                try {
                    // Try to set and get a value from Redis
                    const testKey = 'health-check-test';
                    const testValue = Date.now().toString();

                    await this.cacheManager.set(testKey, testValue, 10 * 1000);
                    const retrievedValue = await this.cacheManager.get(testKey);

                    return {
                        redis: {
                            status: retrievedValue === testValue ? 'up' : 'down',
                        },
                    };
                } catch (error) {
                    return {
                        redis: {
                            status: 'down',
                            message: error.message,
                        },
                    };
                }
            },

            // API self-check
            () => ({ api: { status: 'up' } }),
        ]);
    }
} 