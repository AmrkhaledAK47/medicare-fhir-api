import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    private readonly logger = new Logger(MetricsInterceptor.name);

    constructor(private readonly metricsService: MetricsService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url } = request;
        const startTime = Date.now();

        // Extract path without query params for cleaner metrics
        const path = url.split('?')[0];

        // Create tags for the metric
        const tags = {
            method,
            path,
        };

        return next.handle().pipe(
            tap(() => {
                // Record successful request
                const responseTime = Date.now() - startTime;
                this.metricsService.recordTiming('http_request', responseTime, {
                    ...tags,
                    status: 'success',
                });

                // Increment request counter
                this.metricsService.incrementCounter('http_request', 1, {
                    ...tags,
                    status: 'success',
                });
            }),
            catchError(error => {
                // Record failed request
                const responseTime = Date.now() - startTime;
                this.metricsService.recordTiming('http_request', responseTime, {
                    ...tags,
                    status: 'error',
                    error_type: error.name || 'Unknown',
                });

                // Increment error counter
                this.metricsService.incrementCounter('http_request', 1, {
                    ...tags,
                    status: 'error',
                    error_type: error.name || 'Unknown',
                });

                throw error;
            }),
        );
    }
} 