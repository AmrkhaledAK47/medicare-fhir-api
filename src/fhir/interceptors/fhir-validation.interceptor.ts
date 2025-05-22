import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { ConfigService } from '@nestjs/config';

/**
 * Interceptor that validates FHIR resources before they are processed by controllers
 * Uses the HAPI FHIR $validate operation to ensure resources conform to the FHIR specification
 */
@Injectable()
export class FhirValidationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(FhirValidationInterceptor.name);
    private readonly validationMode: 'strict' | 'lenient' | 'off';

    constructor(
        private readonly hapiFhirAdapter: HapiFhirAdapter,
        private readonly configService: ConfigService,
    ) {
        this.validationMode = this.configService.get<'strict' | 'lenient' | 'off'>('fhir.validationMode') || 'strict';
        this.logger.log(`FHIR Validation Interceptor initialized with mode: ${this.validationMode}`);
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        if (this.validationMode === 'off') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // Only validate POST and PUT requests as they modify resources
        if (method !== 'POST' && method !== 'PUT') {
            return next.handle();
        }

        // Extract resource type from URL
        const url = request.originalUrl;
        const resourceTypeMatch = url.match(/\/fhir\/([A-Za-z]+)(?:\/|$|\?)/);

        if (!resourceTypeMatch) {
            this.logger.debug(`Could not extract resource type from URL: ${url}`);
            return next.handle();
        }

        const resourceType = resourceTypeMatch[1];
        const resource = request.body;

        // Skip validation if resource is empty or doesn't have required properties
        if (!resource || !resource.resourceType) {
            this.logger.debug('Skipping validation for invalid resource structure');
            return next.handle();
        }

        // Ensure the resource type matches the endpoint
        if (resource.resourceType !== resourceType) {
            throw new BadRequestException(`Resource type mismatch: URL endpoint is for ${resourceType} but resource has type ${resource.resourceType}`);
        }

        try {
            this.logger.debug(`Validating ${resourceType} resource`);
            const validationResult = await this.hapiFhirAdapter.validate(resourceType, resource);

            // Check if there are any validation issues
            if (validationResult.issue && validationResult.issue.length > 0) {
                // In strict mode, any error or warning is a failure
                if (this.validationMode === 'strict') {
                    const errors = validationResult.issue.filter(issue =>
                        issue.severity === 'error' || issue.severity === 'fatal'
                    );

                    if (errors.length > 0) {
                        const errorMessages = errors.map(issue =>
                            `[${issue.severity}] ${issue.diagnostics || issue.details?.text || 'Unknown issue'}`
                        ).join('; ');

                        throw new BadRequestException(`Resource validation failed: ${errorMessages}`);
                    }
                }

                // In lenient mode, only errors are considered failures
                if (this.validationMode === 'lenient') {
                    const errors = validationResult.issue.filter(issue =>
                        issue.severity === 'error' || issue.severity === 'fatal'
                    );

                    if (errors.length > 0) {
                        const errorMessages = errors.map(issue =>
                            `[${issue.severity}] ${issue.diagnostics || issue.details?.text || 'Unknown issue'}`
                        ).join('; ');

                        throw new BadRequestException(`Resource validation failed: ${errorMessages}`);
                    }
                }
            }

            this.logger.debug(`Validation passed for ${resourceType} resource`);
            return next.handle().pipe(
                tap(() => {
                    this.logger.debug(`Request for ${resourceType} completed successfully`);
                })
            );
        } catch (error) {
            this.logger.error(`Validation error for ${resourceType}: ${error.message}`, error.stack);
            throw error;
        }
    }
} 