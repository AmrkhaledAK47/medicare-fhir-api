import { SetMetadata } from '@nestjs/common';
import { Role, ROLES_KEY, RESOURCE_KEY, ACTION_KEY, Action } from '../guards/roles.guard';

/**
 * Decorator to specify which roles can access a controller or route handler
 * @param roles - Array of roles that are allowed to access the endpoint
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to specify which FHIR resource a controller or handler operates on
 * @param resource - The name of the FHIR resource (e.g., 'Patient', 'Observation')
 */
export const Resource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

/**
 * Decorator to specify which action is being performed on a resource
 * @param action - The action being performed (create, read, update, delete, search)
 */
export const ResourceAction = (action: Action) => SetMetadata(ACTION_KEY, action);

/**
 * Combines resource and action decorators for convenience
 * @param resource - The name of the FHIR resource
 * @param action - The action being performed
 */
export const ResourcePermission = (resource: string, action: Action) => (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
) => {
    SetMetadata(RESOURCE_KEY, resource)(target, key, descriptor);
    SetMetadata(ACTION_KEY, action)(target, key, descriptor);
    return descriptor;
};

/**
 * Decorator for publicly accessible endpoints (no authentication required)
 * Use for routes like login, registration, or public information
 */
export const Public = () => SetMetadata('isPublic', true); 