import { Injectable, NestMiddleware, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import * as jwt from 'jsonwebtoken';

/**
 * Enhanced Authorization Middleware for FHIR Resources
 * 
 * This middleware implements role-based access control for FHIR resources
 * by leveraging HAPI FHIR capabilities and adding custom logic for
 * patient-practitioner relationships and compartment-based access.
 */
@Injectable()
export class EnhancedAuthorizationMiddleware implements NestMiddleware {
    private readonly logger = new Logger(EnhancedAuthorizationMiddleware.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly hapiFhirAdapter: HapiFhirAdapter,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            // Skip auth for OPTIONS requests (CORS preflight)
            if (req.method === 'OPTIONS') {
                return next();
            }

            // Extract token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Missing or invalid authorization token');
            }

            const token = authHeader.split(' ')[1];

            // Verify and decode the JWT token
            let decodedToken: any;
            try {
                // Get JWT secret directly from environment variable
                const jwtSecret = this.configService.get<string>('JWT_SECRET');

                if (!jwtSecret) {
                    this.logger.error('JWT_SECRET environment variable is not defined');
                    throw new Error('JWT secret is not configured');
                }

                decodedToken = jwt.verify(token, jwtSecret);
            } catch (error) {
                this.logger.warn(`Invalid JWT token: ${error.message}`);
                throw new UnauthorizedException('Invalid or expired token');
            }

            // Extract user information from token
            const { sub: userId, role, fhirResourceId } = decodedToken;

            if (!userId || !role) {
                throw new UnauthorizedException('Invalid token payload');
            }

            // Add user info to request for downstream use
            req['user'] = {
                userId,
                role,
                fhirResourceId,
            };

            this.logger.log(`User ${userId} with role ${role} accessing ${req.method} ${req.path}`);

            // Parse the request path to extract resource type and ID
            const pathParts = req.path.split('/');
            const fhirIndex = pathParts.findIndex(part => part === 'fhir');

            // If not a FHIR resource path, skip resource-specific checks
            if (fhirIndex === -1 || fhirIndex + 1 >= pathParts.length) {
                return next();
            }

            const resourceType = pathParts[fhirIndex + 1];
            const resourceId = pathParts[fhirIndex + 2];

            // Implement role-based access control
            await this.enforceRoleBasedAccess(req, resourceType, resourceId, role, userId, fhirResourceId);

            // If we get here, access is granted
            next();
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
                res.status(error.getStatus()).json({
                    message: error.message,
                    statusCode: error.getStatus(),
                });
            } else {
                this.logger.error(`Authorization error: ${error.message}`, error.stack);
                res.status(500).json({
                    message: 'Internal server error during authorization',
                    statusCode: 500,
                });
            }
        }
    }

    /**
     * Enforce role-based access control based on resource type, method, and user role
     */
    private async enforceRoleBasedAccess(
        req: Request,
        resourceType: string,
        resourceId: string | undefined,
        role: string,
        userId: string,
        fhirResourceId: string,
    ): Promise<void> {
        const method = req.method;

        // Admin has full access to all resources
        if (role === 'admin') {
            this.logger.log(`Admin access granted for ${method} ${resourceType}${resourceId ? '/' + resourceId : ''}`);
            return;
        }

        // Check read-only endpoints first
        if (method === 'GET') {
            await this.enforceReadAccess(resourceType, resourceId, role, userId, fhirResourceId);
            return;
        }

        // For write operations (POST, PUT, DELETE)
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
            await this.enforceWriteAccess(req, resourceType, resourceId, role, userId, fhirResourceId);
            return;
        }
    }

    /**
     * Enforce access control for read operations
     */
    private async enforceReadAccess(
        resourceType: string,
        resourceId: string | undefined,
        role: string,
        userId: string,
        fhirResourceId: string,
    ): Promise<void> {
        // Practitioner can access all resource types, but with filtering
        if (role === 'practitioner') {
            if (resourceId) {
                // Check if practitioner has access to this specific resource
                await this.checkPractitionerResourceAccess(resourceType, resourceId, userId);
            } else {
                // For list operations, filtering will be handled at the service level
                // We allow the request to proceed
                return;
            }
        }

        // Patient can only access their own data
        else if (role === 'patient') {
            if (resourceType === 'Patient' && resourceId) {
                // Patient can only access their own patient resource
                if (resourceId !== fhirResourceId) {
                    throw new ForbiddenException(`Patient can only access their own record`);
                }
            }
            else if (resourceId) {
                // For other resources, check if they're in the patient's compartment
                await this.checkPatientCompartmentAccess(resourceType, resourceId, fhirResourceId);
            }
            // For list operations, filtering will be handled at the service level
        }

        // Unknown role
        else {
            throw new ForbiddenException(`Role ${role} not recognized`);
        }
    }

    /**
     * Enforce access control for write operations
     */
    private async enforceWriteAccess(
        req: Request,
        resourceType: string,
        resourceId: string | undefined,
        role: string,
        userId: string,
        fhirResourceId: string,
    ): Promise<void> {
        // Practitioner can create/update clinical resources, but not administrative ones
        if (role === 'practitioner') {
            // Check if resource type is allowed for practitioners to modify
            const allowedResourceTypes = [
                'Observation', 'Encounter', 'Condition', 'Procedure',
                'DiagnosticReport', 'MedicationRequest', 'CarePlan',
                'QuestionnaireResponse', 'DocumentReference'
            ];

            if (!allowedResourceTypes.includes(resourceType)) {
                throw new ForbiddenException(`Practitioners cannot modify ${resourceType} resources`);
            }

            // For updates, check if practitioner has access to this resource
            if (resourceId) {
                await this.checkPractitionerResourceAccess(resourceType, resourceId, userId);
            }

            // For creates, check if the referenced patient is assigned to this practitioner
            if (req.method === 'POST' && req.body && req.body.subject && req.body.subject.reference) {
                const patientReference = req.body.subject.reference;
                const patientId = patientReference.split('/')[1];
                await this.checkPractitionerPatientAssignment(userId, patientId);
            }
        }

        // Patient can only update their own demographics and create certain resources
        else if (role === 'patient') {
            // Patient can update their own demographics
            if (resourceType === 'Patient' && resourceId === fhirResourceId && req.method === 'PUT') {
                // Allow patients to update their own demographics
                return;
            }

            // Patient can create QuestionnaireResponses and Observations with limited scope
            if (req.method === 'POST' && ['QuestionnaireResponse', 'Observation'].includes(resourceType)) {
                // Check if the subject is the patient themselves
                if (req.body && req.body.subject && req.body.subject.reference) {
                    const patientReference = req.body.subject.reference;
                    const patientId = patientReference.split('/')[1];

                    if (patientId !== fhirResourceId) {
                        throw new ForbiddenException(`Patients can only create resources referencing themselves`);
                    }
                } else {
                    throw new ForbiddenException(`Subject reference is required for patient-created resources`);
                }
                return;
            }

            // All other write operations are forbidden for patients
            throw new ForbiddenException(`Patients cannot modify ${resourceType} resources`);
        }

        // Unknown role
        else {
            throw new ForbiddenException(`Role ${role} not recognized`);
        }
    }

    /**
     * Check if a practitioner has access to a specific resource
     */
    private async checkPractitionerResourceAccess(
        resourceType: string,
        resourceId: string,
        practitionerId: string,
    ): Promise<void> {
        try {
            // For Patient resources, check if this patient is assigned to the practitioner
            if (resourceType === 'Patient') {
                await this.checkPractitionerPatientAssignment(practitionerId, resourceId);
                return;
            }

            // For other resources, get the resource and check its subject/patient reference
            const resource = await this.hapiFhirAdapter.getById(resourceType, resourceId);

            // Different resources have different ways of referencing a patient
            let patientReference = null;

            if (resource.subject && resource.subject.reference) {
                patientReference = resource.subject.reference;
            } else if (resource.patient && resource.patient.reference) {
                patientReference = resource.patient.reference;
            }

            if (patientReference) {
                const patientId = patientReference.split('/')[1];
                await this.checkPractitionerPatientAssignment(practitionerId, patientId);
            } else {
                // If no patient reference found, deny access to be safe
                throw new ForbiddenException(`Resource does not contain a patient reference`);
            }
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error checking practitioner resource access: ${error.message}`);
            throw new ForbiddenException(`Access denied to ${resourceType}/${resourceId}`);
        }
    }

    /**
     * Check if a patient is assigned to a practitioner
     */
    private async checkPractitionerPatientAssignment(
        practitionerId: string,
        patientId: string,
    ): Promise<void> {
        try {
            // In a real implementation, this would query a Care Team or PractitionerRole resource
            // to check if the practitioner is assigned to the patient

            // For this example, we'll make a simplified check using a search query
            const searchParams = {
                _id: patientId,
                'general-practitioner': `Practitioner/${practitionerId}`
            };

            const result = await this.hapiFhirAdapter.search('Patient', searchParams);

            if (!result.entry || result.entry.length === 0) {
                throw new ForbiddenException(`Patient ${patientId} is not assigned to practitioner ${practitionerId}`);
            }
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error checking practitioner-patient assignment: ${error.message}`);
            throw new ForbiddenException(`Access denied to patient ${patientId}`);
        }
    }

    /**
     * Check if a resource is in the patient's compartment
     */
    private async checkPatientCompartmentAccess(
        resourceType: string,
        resourceId: string,
        patientId: string,
    ): Promise<void> {
        try {
            // Get the resource
            const resource = await this.hapiFhirAdapter.getById(resourceType, resourceId);

            // Check if this resource belongs to the patient's compartment
            let belongsToPatient = false;

            // Different resources have different ways of referencing a patient
            if (resource.subject && resource.subject.reference === `Patient/${patientId}`) {
                belongsToPatient = true;
            } else if (resource.patient && resource.patient.reference === `Patient/${patientId}`) {
                belongsToPatient = true;
            }

            // Special case for specific resource types
            if (resourceType === 'Encounter' && resource.subject && resource.subject.reference === `Patient/${patientId}`) {
                belongsToPatient = true;
            }

            if (!belongsToPatient) {
                throw new ForbiddenException(`Resource does not belong to patient ${patientId}`);
            }
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error checking patient compartment access: ${error.message}`);
            throw new ForbiddenException(`Access denied to ${resourceType}/${resourceId}`);
        }
    }
} 