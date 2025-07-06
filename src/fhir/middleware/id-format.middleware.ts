import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle FHIR resource IDs
 * Automatically converts purely numeric IDs to alphanumeric format
 * to comply with HAPI FHIR server requirements
 */
@Injectable()
export class IdFormatMiddleware implements NestMiddleware {
    private readonly logger = new Logger(IdFormatMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        try {
            // Extract resource ID from URL path
            const urlParts = req.path.split('/');
            const resourceType = urlParts[urlParts.length - 2]; // e.g., 'Patient'
            const urlId = urlParts[urlParts.length - 1]; // e.g., '123'

            // Check if we have a valid FHIR resource path with an ID
            const isFhirResourcePath = urlParts.length >= 3 && urlParts.includes('fhir');
            const hasNumericId = isFhirResourcePath && /^\d+$/.test(urlId);

            if (hasNumericId) {
                // Convert URL ID to alphanumeric
                const newId = `res-${urlId}`;
                this.logger.log(`Converting URL ID from ${urlId} to ${newId}`);

                // Modify the URL
                const newUrl = req.url.replace(`/${urlId}`, `/${newId}`);
                req.url = newUrl;

                // If this is a PUT or POST with a body, also update the body ID
                if ((req.method === 'PUT' || req.method === 'POST') && req.body && req.body.resourceType) {
                    if (req.body.id === urlId) {
                        req.body.id = newId;
                        this.logger.log(`Updated body ID to match URL: ${newId}`);
                    }
                }
            }

            // Also check request body for any resource with a numeric ID
            if ((req.method === 'PUT' || req.method === 'POST') && req.body && req.body.resourceType) {
                if (req.body.id && /^\d+$/.test(req.body.id)) {
                    const originalId = req.body.id;
                    req.body.id = `res-${originalId}`;
                    this.logger.log(`Converted body ID from ${originalId} to ${req.body.id}`);
                }
            }
        } catch (error) {
            // Log error but don't block the request
            this.logger.error(`Error in ID format middleware: ${error.message}`, error.stack);
        }

        next();
    }
} 