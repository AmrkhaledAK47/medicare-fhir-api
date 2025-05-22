import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Middleware to handle FHIR resource authorization based on user roles and resource compartments
 */
@Injectable()
export class FhirAuthorizationMiddleware implements NestMiddleware {
    private readonly logger = new Logger(FhirAuthorizationMiddleware.name);
    private readonly adminRole: string;
    private readonly practitionerRole: string;
    private readonly patientRole: string;

    constructor(private readonly configService: ConfigService) {
        this.adminRole = this.configService.get<string>('app.roles.admin') || 'ADMIN';
        this.practitionerRole = this.configService.get<string>('app.roles.practitioner') || 'PRACTITIONER';
        this.patientRole = this.configService.get<string>('app.roles.patient') || 'PATIENT';
    }

    async use(req: Request & { user?: any }, res: Response, next: NextFunction) {
        // Skip middleware if no user (public route) or if user is authenticated via another mechanism
        if (!req.user) {
            return next();
        }

        try {
            const { method, originalUrl, user } = req;
            const resourceType = this.extractResourceType(originalUrl);
            const resourceId = this.extractResourceId(originalUrl);
            const operation = this.extractOperation(originalUrl);

            this.logger.debug(`Checking authorization for ${method} ${originalUrl}`);
            this.logger.debug(`User: ${user?.id}, Role: ${user?.role}, Resource: ${resourceType}${resourceId ? '/' + resourceId : ''}`);

            // Admin has full access to everything
            if (user.role === this.adminRole) {
                return next();
            }

            // Check if the operation is allowed for the user's role
            if (!this.isOperationAllowed(user.role, method, resourceType, operation)) {
                throw new ForbiddenException(`User with role ${user.role} is not authorized to perform ${method} on ${resourceType}`);
            }

            // If accessing a specific resource, check if the user has access to it
            if (resourceId && !await this.hasResourceAccess(user, resourceType, resourceId)) {
                throw new ForbiddenException(`User does not have access to ${resourceType}/${resourceId}`);
            }

            // If it's a search operation, add compartment restrictions to the query parameters
            if (method === 'GET' && !resourceId) {
                this.addCompartmentRestrictions(req, user, resourceType);
            }

            next();
        } catch (error) {
            this.logger.error('FHIR authorization error:', error);
            next(error);
        }
    }

    /**
     * Extract resource type from the URL
     */
    private extractResourceType(url: string): string | null {
        // Extract resource type from URL pattern: /fhir/{resourceType} or /fhir/{resourceType}/{id}
        const match = url.match(/\/fhir\/([A-Za-z]+)(?:\/|$|\?)/);
        return match ? match[1] : null;
    }

    /**
     * Extract resource ID from the URL
     */
    private extractResourceId(url: string): string | null {
        // Extract resource ID from URL pattern: /fhir/{resourceType}/{id}
        const match = url.match(/\/fhir\/[A-Za-z]+\/([^\/\?]+)(?:\/|$|\?)/);
        return match ? match[1] : null;
    }

    /**
     * Extract operation from the URL
     */
    private extractOperation(url: string): string | null {
        // Extract operation from URL pattern: /fhir/{resourceType}/$operation or /fhir/{resourceType}/{id}/$operation
        const match = url.match(/\/\$([A-Za-z]+)(?:\/|$|\?)/);
        return match ? match[1] : null;
    }

    /**
     * Check if the operation is allowed for the user's role
     */
    private isOperationAllowed(role: string, method: string, resourceType: string, operation: string | null): boolean {
        // Define role-based access permissions
        // This is a simplified version - in a real application, this would be more granular
        // and potentially stored in a database

        if (role === this.adminRole) {
            // Admin can do everything
            return true;
        }

        if (role === this.practitionerRole) {
            // Practitioners can read most resources and write clinical data
            if (method === 'GET') {
                return true;
            }

            if (['POST', 'PUT'].includes(method)) {
                // Practitioners can create/update clinical resources
                const clinicalResources = [
                    'Observation', 'Condition', 'Procedure', 'MedicationRequest',
                    'DiagnosticReport', 'Immunization', 'AllergyIntolerance', 'CarePlan'
                ];
                return clinicalResources.includes(resourceType);
            }

            // Practitioners can't delete resources
            return false;
        }

        if (role === this.patientRole) {
            // Patients can only read their own data
            return method === 'GET';
        }

        // Default deny
        return false;
    }

    /**
     * Check if the user has access to the specific resource
     */
    private async hasResourceAccess(user: any, resourceType: string, resourceId: string): Promise<boolean> {
        // In a real implementation, this would fetch the resource and check permissions
        // This is a simplified version that uses role-based rules

        if (user.role === this.adminRole) {
            return true;
        }

        if (user.role === this.patientRole) {
            // Patient can only access their own Patient resource
            if (resourceType === 'Patient') {
                return user.fhirResourceId === resourceId;
            }

            // For other resources, they need to be linked to the patient's compartment
            // In a real implementation, you would check if the resource belongs to the patient's compartment
            return true; // Simplified - would need actual resource checking
        }

        if (user.role === this.practitionerRole) {
            // Practitioners can access resources for patients under their care
            // In a real implementation, you would check care relationships
            return true; // Simplified - would need actual resource checking
        }

        return false;
    }

    /**
     * Add compartment restrictions to the query parameters for search operations
     */
    private addCompartmentRestrictions(req: Request, user: any, resourceType: string): void {
        if (user.role === this.adminRole) {
            // Admin can see everything, no restrictions needed
            return;
        }

        // Get current query parameters
        const query = req.query || {};

        if (user.role === this.patientRole && user.fhirResourceId) {
            // Add patient compartment restriction
            if (resourceType === 'Patient') {
                // When searching for patients, only return the patient themselves
                query._id = user.fhirResourceId;
            } else {
                // For other resources, filter by patient reference
                query.patient = `Patient/${user.fhirResourceId}`;
            }
        }

        if (user.role === this.practitionerRole && user.fhirResourceId) {
            // Add practitioner compartment restriction
            if (resourceType === 'Practitioner') {
                // When searching for practitioners, only return the practitioner themselves
                query._id = user.fhirResourceId;
            }

            // If organization is specified, restrict to that organization
            if (user.organization) {
                query.organization = `Organization/${user.organization}`;
            }
        }

        // Update the request query parameters
        req.query = query;
    }
} 