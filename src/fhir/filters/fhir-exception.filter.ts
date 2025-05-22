import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Exception filter that converts all exceptions to FHIR OperationOutcome format
 */
@Catch()
export class FhirExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(FhirExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Determine error details
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'exception';
        let details = 'An unexpected error occurred';

        // Handle different error types
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse() as any;

            if (typeof exceptionResponse === 'object') {
                message = exceptionResponse.message || message;
                code = this.mapStatusToIssueCode(status);
                details = Array.isArray(exceptionResponse.message)
                    ? exceptionResponse.message.join('; ')
                    : exceptionResponse.message || details;
            } else if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                details = exceptionResponse;
            }
        } else if (exception?.name === 'ValidationError') {
            // Handle validation errors
            status = HttpStatus.BAD_REQUEST;
            code = 'invalid';
            message = 'Validation error';
            details = exception.message;
        } else if (exception?.name === 'CastError') {
            // Handle MongoDB cast errors
            status = HttpStatus.BAD_REQUEST;
            code = 'value';
            message = 'Invalid value';
            details = exception.message;
        } else {
            // Handle generic errors with useful information
            message = exception?.message || message;
            details = exception?.message || details;

            // Log unexpected errors
            this.logger.error(
                `Unhandled exception: ${message}`,
                exception?.stack || 'No stack trace'
            );
        }

        // Format as FHIR OperationOutcome
        const operationOutcome = this.createOperationOutcome(status, code, details);

        // Send response
        response
            .status(status)
            .contentType('application/fhir+json')
            .json(operationOutcome);
    }

    /**
     * Map HTTP status code to FHIR issue code
     */
    private mapStatusToIssueCode(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'invalid';
            case HttpStatus.UNAUTHORIZED:
                return 'security';
            case HttpStatus.FORBIDDEN:
                return 'forbidden';
            case HttpStatus.NOT_FOUND:
                return 'not-found';
            case HttpStatus.METHOD_NOT_ALLOWED:
                return 'not-supported';
            case HttpStatus.CONFLICT:
                return 'conflict';
            case HttpStatus.GONE:
                return 'deleted';
            case HttpStatus.UNPROCESSABLE_ENTITY:
                return 'business-rule';
            case HttpStatus.TOO_MANY_REQUESTS:
                return 'throttled';
            case HttpStatus.SERVICE_UNAVAILABLE:
                return 'transient';
            default:
                return status < 500 ? 'processing' : 'exception';
        }
    }

    /**
     * Map HTTP status to FHIR issue severity
     */
    private mapStatusToSeverity(status: number): string {
        return status >= 500 ? 'error' : 'warning';
    }

    /**
     * Create a FHIR OperationOutcome resource from error details
     */
    private createOperationOutcome(status: number, code: string, details: string): any {
        const severity = this.mapStatusToSeverity(status);

        return {
            resourceType: 'OperationOutcome',
            issue: [
                {
                    severity: severity,
                    code: code,
                    diagnostics: details,
                    details: {
                        text: details
                    }
                }
            ]
        };
    }
} 