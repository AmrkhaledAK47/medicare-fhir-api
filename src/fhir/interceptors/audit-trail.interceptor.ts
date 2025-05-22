import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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
 * Interceptor that records an audit trail of all FHIR operations
 */
@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditTrailInterceptor.name);
    private readonly enableAuditing: boolean;

    constructor(
        private readonly configService: ConfigService,
        @InjectModel('AuditLog') private readonly auditLogModel: Model<AuditLogEntry>,
    ) {
        this.enableAuditing = this.configService.get<boolean>('fhir.enableAuditing') ?? true;
        this.logger.log(`Audit Trail Interceptor initialized with auditing ${this.enableAuditing ? 'enabled' : 'disabled'}`);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (!this.enableAuditing) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();

        // Extract information for audit log
        const method = request.method;
        const url = request.originalUrl;
        const userId = request.user?.id || 'anonymous';
        const userRole = request.user?.role || 'anonymous';
        const ipAddress = request.ip || request.connection?.remoteAddress || 'unknown';

        // Extract resource type and ID from URL
        const resourceTypeMatch = url.match(/\/fhir\/([A-Za-z]+)(?:\/|$|\?)/);
        const resourceIdMatch = url.match(/\/fhir\/[A-Za-z]+\/([^\/\?]+)(?:\/|$|\?)/);

        const resourceType = resourceTypeMatch ? resourceTypeMatch[1] : 'unknown';
        const resourceId = resourceIdMatch ? resourceIdMatch[1] : 'unknown';

        // Map HTTP method to FHIR action
        let action = 'unknown';
        switch (method) {
            case 'GET':
                action = resourceId !== 'unknown' ? 'read' : 'search';
                break;
            case 'POST':
                action = 'create';
                break;
            case 'PUT':
                action = 'update';
                break;
            case 'DELETE':
                action = 'delete';
                break;
            default:
                action = method.toLowerCase();
        }

        // Check if this is a FHIR operation
        if (url.includes('/$')) {
            const operationMatch = url.match(/\/\$([A-Za-z-]+)(?:\/|$|\?)/);
            if (operationMatch) {
                action = `operation:${operationMatch[1]}`;
            }
        }

        return next.handle().pipe(
            tap(
                async (data) => {
                    // Success response
                    const duration = Date.now() - startTime;
                    const status = response.statusCode;

                    const auditLog = new this.auditLogModel({
                        id: uuidv4(),
                        timestamp: new Date(),
                        userId,
                        userRole,
                        ipAddress,
                        action,
                        resourceType,
                        resourceId,
                        status,
                        details: `${method} ${url} completed in ${duration}ms`,
                    });

                    try {
                        await auditLog.save();
                        this.logger.debug(`Audit log created for ${action} on ${resourceType}/${resourceId}`);
                    } catch (error) {
                        this.logger.error(`Failed to save audit log: ${error.message}`, error.stack);
                    }
                },
                async (error) => {
                    // Error response
                    const duration = Date.now() - startTime;
                    const status = error.status || 500;

                    const auditLog = new this.auditLogModel({
                        id: uuidv4(),
                        timestamp: new Date(),
                        userId,
                        userRole,
                        ipAddress,
                        action,
                        resourceType,
                        resourceId,
                        status,
                        details: `${method} ${url} failed with error "${error.message}" after ${duration}ms`,
                    });

                    try {
                        await auditLog.save();
                        this.logger.debug(`Audit log created for failed ${action} on ${resourceType}/${resourceId}`);
                    } catch (saveError) {
                        this.logger.error(`Failed to save audit log: ${saveError.message}`, saveError.stack);
                    }
                }
            )
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