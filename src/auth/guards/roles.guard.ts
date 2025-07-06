import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Role enum for type safety
export enum Role {
    ADMIN = 'admin',
    PRACTITIONER = 'practitioner',
    PATIENT = 'patient',
    PHARMACIST = 'pharmacist',
}

// Metadata keys
export const ROLES_KEY = 'roles';
export const RESOURCE_KEY = 'resource';
export const ACTION_KEY = 'action';

// Action types
export enum Action {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    SEARCH = 'search',
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required roles from controller or handler
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles are required, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();

        // Extract token from Authorization header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ForbiddenException('Invalid or missing authentication token');
        }

        const token = authHeader.split(' ')[1];
        let payload;

        try {
            // Verify JWT and extract payload
            payload = this.jwtService.verify(token);
        } catch (error) {
            throw new ForbiddenException('Invalid or expired token');
        }

        // Get user's role from token
        const userRole = payload.role;

        // Check if user has required role (case-insensitive)
        const hasRequiredRole = requiredRoles.some(role =>
            role.toLowerCase() === userRole.toLowerCase()
        );
        if (!hasRequiredRole) {
            throw new ForbiddenException(`Access denied: requires ${requiredRoles.join(', ')} role`);
        }

        // Get resource and action information
        const requiredResource = this.reflector.get<string>(RESOURCE_KEY, context.getHandler());
        const requiredAction = this.reflector.get<Action>(ACTION_KEY, context.getHandler());

        // If no resource or action is specified, basic role check is sufficient
        if (!requiredResource || !requiredAction) {
            return true;
        }

        // Store user info for controllers/services to use
        request['user'] = payload;

        // For resources that require ownership checks
        const resourceId = request.params.id;
        const userId = payload.sub;

        // Special handling for resource-specific permissions
        if (this.needsOwnershipCheck(userRole, requiredResource, requiredAction)) {
            // For Patient role, validate resource ownership
            if (userRole.toLowerCase() === Role.PATIENT.toLowerCase()) {
                return await this.validatePatientAccess(userId, resourceId, requiredResource, request);
            }

            // For Practitioner role, validate patient assignment
            if (userRole.toLowerCase() === Role.PRACTITIONER.toLowerCase()) {
                return await this.validatePractitionerAccess(userId, resourceId, requiredResource, request);
            }
        }

        // Admin can access everything
        if (userRole.toLowerCase() === Role.ADMIN.toLowerCase()) {
            return true;
        }

        // Default permission policy (should not reach here if guard is properly configured)
        return this.getDefaultPermission(userRole, requiredResource, requiredAction);
    }

    private needsOwnershipCheck(role: string, resource: string, action: Action): boolean {
        // Only READ actions for certain resources need ownership check
        if (role.toLowerCase() === Role.ADMIN.toLowerCase()) return false;

        const resourcesRequiringOwnershipCheck = [
            'Patient', 'Encounter', 'Observation', 'DiagnosticReport',
            'MedicationRequest', 'QuestionnaireResponse', 'Payment'
        ];

        return resourcesRequiringOwnershipCheck.includes(resource) &&
            (action === Action.READ || action === Action.UPDATE || action === Action.DELETE);
    }

    private async validatePatientAccess(
        userId: string,
        resourceId: string,
        resource: string,
        request: Request,
    ): Promise<boolean> {
        const user = request['user'] as any;
        if (!user || !user.fhirResourceId) {
            return false;
        }

        // For now we'll use a simplified check based on resource type
        if (resource === 'Patient') {
            // Patient can only access their own record
            // Remove 'res-' prefix if present for comparison
            const normalizedResourceId = resourceId?.startsWith('res-') ? resourceId.substring(4) : resourceId;
            const normalizedUserResourceId = user.fhirResourceId?.startsWith('res-') ?
                user.fhirResourceId.substring(4) : user.fhirResourceId;

            console.log(`Comparing patient resource IDs: ${normalizedUserResourceId} === ${normalizedResourceId}`);
            return normalizedUserResourceId === normalizedResourceId;
        }

        // For search endpoints, we add a filter to only return the patient's resources
        if (!resourceId && request.method === 'GET') {
            const query = request.query || {};
            // Use the user's FHIR resource ID for filtering
            request.query = {
                ...query,
                patient: user.fhirResourceId
            };
            return true;
        }

        // For other resources, allow access to those that belong to the patient
        // This is a simplified implementation - in production, you would check
        // if the resource references the patient
        console.log(`Validating patient ${userId} access to ${resource} ${resourceId}`);
        return true;
    }

    private async validatePractitionerAccess(
        practitionerId: string,
        resourceId: string,
        resource: string,
        request: Request,
    ): Promise<boolean> {
        const user = request['user'] as any;
        if (!user) {
            return false;
        }

        // Remove 'res-' prefix if present for comparison
        const normalizedResourceId = resourceId?.startsWith('res-') ? resourceId.substring(4) : resourceId;
        const normalizedUserResourceId = user.fhirResourceId?.startsWith('res-') ?
            user.fhirResourceId.substring(4) : user.fhirResourceId;

        if (resource === 'Practitioner') {
            // Practitioner can only access their own record
            console.log(`Comparing practitioner resource IDs: ${normalizedUserResourceId} === ${normalizedResourceId}`);
            return normalizedUserResourceId === normalizedResourceId;
        }

        // For Patient resources, practitioners should have access to their patients
        // In a real implementation, you would check if the patient is assigned to this practitioner
        if (resource === 'Patient') {
            // For demonstration purposes, allow all practitioners to access all patients
            // In a production environment, you would implement proper checks
            console.log(`Allowing practitioner ${practitionerId} access to patient ${resourceId}`);
            return true;
        }

        // For search endpoints, add practitioner context to filter
        if (!resourceId && request.method === 'GET') {
            const query = request.query || {};

            if (resource === 'Patient') {
                // Filter patients by practitioner
                request.query = {
                    ...query,
                    'generalPractitioner': user.fhirResourceId
                };
            }
            return true;
        }

        // For other clinical resources, allow access
        // In a production environment, you would implement more sophisticated checks
        console.log(`Validating practitioner ${practitionerId} access to ${resource} ${resourceId}`);
        return true;
    }

    private getDefaultPermission(role: string, resource: string, action: Action): boolean {
        // Normalize role to lowercase for case-insensitive comparison
        const normalizedRole = role.toLowerCase();

        // Default permission matrix
        const permissionMatrix = {
            [Role.ADMIN.toLowerCase()]: {
                // Admin can do everything
                '*': [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SEARCH],
            },
            [Role.PRACTITIONER.toLowerCase()]: {
                'Patient': [Action.READ, Action.SEARCH],
                'Practitioner': [Action.READ, Action.UPDATE], // Practitioners can update their own profile
                'Encounter': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Observation': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'DiagnosticReport': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Medication': [Action.READ, Action.SEARCH],
                'MedicationRequest': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Questionnaire': [Action.READ, Action.SEARCH],
                'QuestionnaireResponse': [Action.CREATE, Action.READ, Action.SEARCH],
                'CarePlan': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Condition': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Procedure': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Payment': [Action.READ, Action.SEARCH],
                // For all other resources, default to no access
                '*': [],
            },
            [Role.PATIENT.toLowerCase()]: {
                'Patient': [Action.READ, Action.UPDATE], // Patients can update their own profile
                'Practitioner': [Action.READ, Action.SEARCH],
                'Organization': [Action.READ, Action.SEARCH],
                'Encounter': [Action.READ, Action.SEARCH],
                'Observation': [Action.READ, Action.SEARCH],
                'DiagnosticReport': [Action.READ, Action.SEARCH],
                'Medication': [Action.READ, Action.SEARCH],
                'MedicationRequest': [Action.READ, Action.SEARCH],
                'Questionnaire': [Action.READ, Action.SEARCH],
                'QuestionnaireResponse': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                'Payment': [Action.CREATE, Action.READ, Action.UPDATE, Action.SEARCH],
                // For all other resources, default to no access
                '*': [],
            },
        };

        // Check specific resource permissions
        if (permissionMatrix[normalizedRole] && permissionMatrix[normalizedRole][resource]) {
            return permissionMatrix[normalizedRole][resource].includes(action);
        }

        // Check wildcard permissions
        return permissionMatrix[normalizedRole] && permissionMatrix[normalizedRole]['*'].includes(action);
    }
} 