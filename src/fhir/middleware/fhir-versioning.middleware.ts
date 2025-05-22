import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that handles FHIR versioning by parsing version headers and parameters
 */
@Injectable()
export class FhirVersioningMiddleware implements NestMiddleware {
    private readonly logger = new Logger(FhirVersioningMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Extract FHIR version information from headers and query parameters
        this.extractVersionInfo(req);

        // Set appropriate content type headers for FHIR response
        this.setupResponseHeaders(req, res);

        // Continue processing
        next();
    }

    /**
     * Extract version information from request
     */
    private extractVersionInfo(req: Request) {
        // Initialize version info on request object
        req['fhirVersion'] = {
            versionId: null,
            historyRequested: false,
            contentType: null,
            acceptHeader: null,
            versionRequested: false,
        };

        // Check if this is a history request
        const isHistoryRequest = req.path.includes('/_history');
        req['fhirVersion'].historyRequested = isHistoryRequest;

        // Extract version from _versionId parameter
        if (req.query._versionId) {
            req['fhirVersion'].versionId = req.query._versionId as string;
            req['fhirVersion'].versionRequested = true;
            this.logger.debug(`Version requested from query param: ${req['fhirVersion'].versionId}`);
        }

        // Extract version from URL if it's a history request
        if (isHistoryRequest) {
            const historyMatch = req.path.match(/\/_history\/([^\/]+)/);
            if (historyMatch && historyMatch[1]) {
                req['fhirVersion'].versionId = historyMatch[1];
                req['fhirVersion'].versionRequested = true;
                this.logger.debug(`Version requested from URL: ${req['fhirVersion'].versionId}`);
            }
        }

        // Parse content-type header
        if (req.headers['content-type']) {
            req['fhirVersion'].contentType = req.headers['content-type'] as string;

            // Check if version is included in content-type (e.g., application/fhir+json; fhirVersion=4.0)
            const versionMatch = req['fhirVersion'].contentType.match(/fhirVersion=([^;]+)/);
            if (versionMatch && versionMatch[1]) {
                this.logger.debug(`Content-Type contains FHIR version: ${versionMatch[1]}`);
            }
        }

        // Parse accept header
        if (req.headers.accept) {
            req['fhirVersion'].acceptHeader = req.headers.accept as string;

            // Check if version is included in accept header
            const versionMatch = req['fhirVersion'].acceptHeader.match(/fhirVersion=([^;]+)/);
            if (versionMatch && versionMatch[1]) {
                this.logger.debug(`Accept header contains FHIR version: ${versionMatch[1]}`);
            }
        }
    }

    /**
     * Setup appropriate headers for FHIR responses
     */
    private setupResponseHeaders(req: Request, res: Response) {
        // Override res.json to add version headers
        const originalJson = res.json;
        res.json = function (body: any) {
            // Set Content-Type header if not already set
            if (!res.getHeader('Content-Type')) {
                // If the response is a FHIR resource and a specific version was requested,
                // use the FHIR-specific content type
                if (body && body.resourceType) {
                    res.setHeader('Content-Type', 'application/fhir+json');
                } else {
                    res.setHeader('Content-Type', 'application/json');
                }
            }

            // If this is a specific resource version, add FHIR version headers
            if (body && body.meta && body.meta.versionId) {
                res.setHeader('ETag', `W/"${body.meta.versionId}"`);
                res.setHeader('Last-Modified', body.meta.lastUpdated || new Date().toISOString());
            }

            // Call the original json method
            return originalJson.call(this, body);
        };

        // Handle conditional requests
        const ifNoneMatch = req.headers['if-none-match'] as string;
        if (ifNoneMatch) {
            // Extract ETag value (remove W/ and quotes)
            const requestedETag = ifNoneMatch.replace(/W\/|"/g, '');
            req['fhirVersion'].ifNoneMatch = requestedETag;
            this.logger.debug(`If-None-Match header: ${requestedETag}`);
        }

        const ifModifiedSince = req.headers['if-modified-since'] as string;
        if (ifModifiedSince) {
            req['fhirVersion'].ifModifiedSince = new Date(ifModifiedSince);
            this.logger.debug(`If-Modified-Since header: ${ifModifiedSince}`);
        }
    }
} 