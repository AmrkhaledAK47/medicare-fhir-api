import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to ensure all requests have a correlation ID
 * If X-Correlation-ID header is provided, it will be used
 * Otherwise, a new correlation ID will be generated
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    private readonly logger = new Logger(CorrelationIdMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Get existing correlation ID or generate a new one
        const correlationId = req.headers['x-correlation-id'] ||
            `medicare-${Date.now()}-${uuidv4().substring(0, 8)}`;

        // Add correlation ID to request headers
        req.headers['x-correlation-id'] = correlationId;

        // Add correlation ID to response headers
        res.setHeader('X-Correlation-ID', correlationId);

        // Add correlation ID to request object for use in controllers and services
        (req as any).correlationId = correlationId;

        // Log the request with correlation ID
        this.logger.debug(`Incoming request ${req.method} ${req.url} [${correlationId}]`);

        // Track response time
        const start = Date.now();

        // Log response on finish
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';

            this.logger[logLevel](
                `Response ${res.statusCode} ${req.method} ${req.url} [${correlationId}] - ${duration}ms`
            );
        });

        next();
    }
} 