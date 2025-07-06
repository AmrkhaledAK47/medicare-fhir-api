import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AuditEventService } from '../services/audit-event.service';

/**
 * Schema for audit log entries
 */
export class AuditLogEntry {
    id: string;
    timestamp: Date;
    userId: string;
    userRole: string;
    ipAddress: string;
    action: string;
    resourceType: string;
    resourceId: string;
    status: number;
    details: string;
}

/**
 * Interceptor that automatically logs audit events for all FHIR API requests
 */
@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditTrailInterceptor.name);

    constructor(private readonly auditEventService: AuditEventService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        // Skip if not a FHIR API request
        if (!request.path.includes('/api/fhir/')) {
            return next.handle();
        }

        // Skip if no user information is available
        if (!request.user) {
            return next.handle();
        }

        const { userId, role } = request.user;
        const method = request.method;
        const path = request.path;
        const ipAddress = request.ip;

        // Extract resource type and ID from the path
        const pathParts = path.split('/');
        const fhirIndex = pathParts.findIndex(part => part === 'fhir');

        if (fhirIndex === -1 || fhirIndex + 1 >= pathParts.length) {
            return next.handle();
        }

        const resourceType = pathParts[fhirIndex + 1];
        const resourceId = pathParts[fhirIndex + 2];

        // Map HTTP method to audit action
        const actionMap = {
            'GET': 'read',
            'POST': 'create',
            'PUT': 'update',
            'DELETE': 'delete',
        };

        const action = actionMap[method] || 'execute';

        // For search requests
        const isSearch = method === 'GET' && !resourceId;
        const searchAction = isSearch ? 'query' : action;

        // Create description based on the request
        let description = `${method} ${path}`;
        if (Object.keys(request.query).length > 0) {
            description += ` with query params: ${JSON.stringify(request.query)}`;
        }

        const startTime = Date.now();

        return next.handle().pipe(
            tap(response => {
                const duration = Date.now() - startTime;

                // Log successful audit event
                this.auditEventService.logAuditEvent(
                    userId,
                    role,
                    searchAction,
                    resourceType,
                    resourceId,
                    'success',
                    `${description} - Completed in ${duration}ms`,
                    ipAddress,
                ).catch(error => {
                    this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
                });
            }),
            catchError(error => {
                const duration = Date.now() - startTime;

                // Determine severity based on error status
                let outcome: 'minor' | 'serious' | 'major' = 'minor';
                if (error.status >= 500) {
                    outcome = 'major';
                } else if (error.status >= 400) {
                    outcome = 'minor';
                }

                // Log failed audit event
                this.auditEventService.logAuditEvent(
                    userId,
                    role,
                    searchAction,
                    resourceType,
                    resourceId,
                    outcome,
                    `${description} - Failed with status ${error.status}: ${error.message} - Duration: ${duration}ms`,
                    ipAddress,
                ).catch(logError => {
                    this.logger.error(`Failed to log audit event: ${logError.message}`, logError.stack);
                });

                throw error;
            }),
        );
    }
}

/**
 * MongoDB schema for audit logs
 */
export const AuditLogSchema = {
    id: { type: String, required: true, unique: true },
    timestamp: { type: Date, required: true, default: Date.now },
    userId: { type: String, required: true, index: true },
    userRole: { type: String, required: true },
    ipAddress: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, required: true, index: true },
    status: { type: Number, required: true },
    details: { type: String, required: true },
};

/**
 * Module for registering the audit log model
 */
export const AuditLogModule = MongooseModule.forFeature([
    { name: 'AuditLog', schema: AuditLogSchema },
]); 