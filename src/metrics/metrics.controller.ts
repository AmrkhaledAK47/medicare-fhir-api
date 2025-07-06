import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { ConfigService } from '@nestjs/config';
import { IpWhitelistGuard } from '../common/guards/ip-whitelist.guard';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
    private readonly enableMetricsEndpoint: boolean;

    constructor(
        private readonly metricsService: MetricsService,
        private readonly configService: ConfigService,
    ) {
        this.enableMetricsEndpoint = this.configService.get<boolean>('ENABLE_METRICS_ENDPOINT', true);
    }

    @Get()
    @UseGuards(IpWhitelistGuard)
    @Header('Content-Type', 'text/plain')
    @ApiOperation({ summary: 'Get Prometheus metrics' })
    @ApiResponse({ status: 200, description: 'Prometheus metrics' })
    getMetrics(): string {
        if (!this.enableMetricsEndpoint) {
            return '# Metrics endpoint disabled';
        }
        return this.metricsService.getPrometheusMetrics();
    }
} 