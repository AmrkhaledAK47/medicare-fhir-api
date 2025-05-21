import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

/**
 * Service to register and manage FHIR resource types and their associated services
 */
@Injectable()
export class ResourceRegistryService {
    private registeredResourceTypes = new Map<string, any>();
    private resourceModels = new Map<string, Model<any>>();

    /**
     * Register a resource service for a specific FHIR resource type
     * @param resourceType The FHIR resource type (e.g., 'Patient', 'Observation')
     * @param service The service instance that handles this resource type
     */
    registerResourceService(resourceType: string, service: any): void {
        this.registeredResourceTypes.set(resourceType, service);
    }

    /**
     * Register a model for a specific resource type
     * @param resourceType The FHIR resource type
     * @param model The mongoose model
     */
    registerResourceModel(resourceType: string, model: Model<any>): void {
        this.resourceModels.set(resourceType, model);
    }

    /**
     * Get the service instance for a specific FHIR resource type
     * @param resourceType The FHIR resource type
     * @returns The service instance or undefined if not found
     */
    getServiceForResourceType(resourceType: string): any {
        return this.registeredResourceTypes.get(resourceType);
    }

    /**
     * Get the model for a specific resource type
     * @param resourceType The FHIR resource type
     * @returns The mongoose model or undefined if not found
     */
    getResourceModel(resourceType: string): Model<any> | undefined {
        return this.resourceModels.get(resourceType);
    }

    /**
     * Check if a service exists for a specific FHIR resource type
     * @param resourceType The FHIR resource type
     * @returns True if a service exists, false otherwise
     */
    hasServiceForResourceType(resourceType: string): boolean {
        return this.registeredResourceTypes.has(resourceType);
    }

    /**
     * Get all registered resource types
     * @returns Array of registered resource type strings
     */
    getRegisteredResourceTypes(): string[] {
        return Array.from(this.registeredResourceTypes.keys());
    }

    /**
     * Initialize the registry - can be used for any startup tasks
     */
    async initializeRegistry(): Promise<void> {
        // This method can be used in the future if we need to perform
        // any initialization tasks when the application starts
    }
} 