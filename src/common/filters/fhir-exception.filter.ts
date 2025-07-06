import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AxiosError } from 'axios';
import { DownstreamFhirException } from '../../fhir/fhir.service';
import { MetricsService } from '../../metrics/metrics.service';

interface FhirOperationOutcome {
    resourceType: string;
    issue?: Array<{
        severity?: string;
        code?: string;
        details?: {
            text?: string;
        };
        diagnostics?: string;
    }>;
}

@Catch(AxiosError, DownstreamFhirException)
export class FhirExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(FhirExceptionFilter.name);

    constructor(private readonly metricsService?: MetricsService) { }

    catch(exception: AxiosError | DownstreamFhirException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();
        const correlationId = request.headers['x-correlation-id'] || 'unknown';

        // Extract error details from the FHIR response if available
        let status = HttpStatus.BAD_GATEWAY;
        let message = 'Clinical service unavailable';
        let details = null;
        let originalError = exception;

        // Handle our custom DownstreamFhirException
        if (exception instanceof DownstreamFhirException) {
            originalError = exception.originalError;
            message = exception.message;

            // If the original error is an AxiosError, extract more details
            if (originalError instanceof AxiosError && originalError.response) {
                status = originalError.response.status;
            }
        }
        // Handle direct AxiosError
        else if (exception instanceof AxiosError && exception.response) {
            status = exception.response.status;

            // Try to extract FHIR OperationOutcome if available
            const fhirResponse = exception.response.data as FhirOperationOutcome;
            if (fhirResponse && fhirResponse.resourceType === 'OperationOutcome') {
                const issueDetails = fhirResponse.issue && fhirResponse.issue.length > 0
                    ? fhirResponse.issue.map(i => i.details?.text || i.diagnostics).filter(Boolean)
                    : [];

                if (issueDetails.length > 0) {
                    message = issueDetails.join(', ');
                }
                details = fhirResponse.issue;
            }
        }

        // Record metrics
        if (this.metricsService) {
            this.metricsService.incrementCounter('fhir_error', 1, {
                status: status.toString(),
                path: request.path,
            });
        }

        // Log detailed error for debugging
        this.logger.error(
            `FHIR Error [${correlationId}]: ${message} (${status})`,
            {
                correlationId,
                path: request.url,
                method: request.method,
                status,
                message,
                details,
                stack: originalError.stack,
            }
        );

        // In production, return a cleaner error message
        const isProduction = process.env.NODE_ENV === 'production';
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
            message: message,
            details: isProduction ? undefined : details,
        });
    }
} 