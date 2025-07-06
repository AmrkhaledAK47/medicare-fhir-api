import { Injectable, Logger } from '@nestjs/common';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { ConfigService } from '@nestjs/config';

/**
 * Service for creating and managing FHIR AuditEvent resources
 * to track user interactions with the system for compliance and security purposes
 */
@Injectable()
export class AuditEventService {
    private readonly logger = new Logger(AuditEventService.name);
    private readonly systemName: string;

    constructor(
        private readonly hapiFhirAdapter: HapiFhirAdapter,
        private readonly configService: ConfigService,
    ) {
        this.systemName = this.configService.get<string>('app.name', 'MediCare FHIR API');
    }

    /**
     * Log an audit event for a user action
     * 
     * @param userId The ID of the user performing the action
     * @param userRole The role of the user (admin, practitioner, patient)
     * @param action The action being performed (e.g., 'read', 'create', 'update', 'delete')
     * @param resourceType The type of resource being accessed (e.g., 'Patient', 'Observation')
     * @param resourceId The ID of the resource being accessed (if applicable)
     * @param outcome The outcome of the action (success, failure)
     * @param description Optional description of the action
     * @param ipAddress Optional IP address of the user
     */
    async logAuditEvent(
        userId: string,
        userRole: string,
        action: string,
        resourceType: string,
        resourceId?: string,
        outcome: 'success' | 'minor' | 'serious' | 'major' | 'fatal' = 'success',
        description?: string,
        ipAddress?: string,
    ): Promise<void> {
        try {
            // Map action to FHIR AuditEvent.action
            const actionMap = {
                'read': 'R',
                'create': 'C',
                'update': 'U',
                'delete': 'D',
                'execute': 'E', // For operations
                'query': 'R', // For search - changed from 'Q' to 'R' as 'Q' is not a valid code
            };

            // Map outcome to FHIR AuditEvent.outcome
            const outcomeMap = {
                'success': '0', // Success
                'minor': '4', // Minor failure
                'serious': '8', // Serious failure
                'major': '12', // Major failure
                'fatal': '16', // Fatal failure
            };

            // Create the AuditEvent resource
            const auditEvent = {
                resourceType: 'AuditEvent',
                recorded: new Date().toISOString(),
                type: {
                    system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
                    code: 'rest',
                    display: 'RESTful Operation',
                },
                action: actionMap[action] || 'E',
                outcome: outcomeMap[outcome] || '0',
                outcomeDesc: description,
                agent: [
                    {
                        type: {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v3-RoleClass',
                                    code: 'AGNT',
                                    display: 'Agent',
                                },
                            ],
                        },
                        who: {
                            identifier: {
                                value: userId,
                            },
                            display: `User ${userId} (${userRole})`,
                        },
                        requestor: true,
                        network: ipAddress ? {
                            address: ipAddress,
                            type: '2', // 2 = IP Address
                        } : undefined,
                    },
                    {
                        type: {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v3-RoleClass',
                                    code: 'DEV',
                                    display: 'Device',
                                },
                            ],
                        },
                        who: {
                            display: this.systemName,
                        },
                        requestor: false,
                    },
                ],
                source: {
                    observer: {
                        display: this.systemName,
                    },
                    type: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
                            code: '4',
                            display: 'Application Server',
                        },
                    ],
                },
                entity: [
                    {
                        what: {
                            reference: resourceId ? `${resourceType}/${resourceId}` : undefined,
                            display: resourceType + (resourceId ? `/${resourceId}` : ''),
                        },
                        type: {
                            system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
                            code: '2',
                            display: 'System Object',
                        },
                        role: {
                            system: 'http://terminology.hl7.org/CodeSystem/object-role',
                            code: '4',
                            display: 'Domain Resource',
                        },
                    },
                ],
            };

            // Create the AuditEvent resource in FHIR server
            await this.hapiFhirAdapter.create('AuditEvent', auditEvent);
            this.logger.log(`Audit event logged: ${action} ${resourceType}/${resourceId || ''} by ${userRole} ${userId}`);
        } catch (error) {
            // Don't fail the main operation if audit logging fails
            this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
        }
    }

    /**
     * Search audit events with filtering options
     * 
     * @param params Search parameters
     * @returns Promise with search results
     */
    async searchAuditEvents(params: Record<string, any> = {}): Promise<any> {
        try {
            return await this.hapiFhirAdapter.search('AuditEvent', params);
        } catch (error) {
            this.logger.error(`Failed to search audit events: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get audit events for a specific user
     * 
     * @param userId The ID of the user
     * @param limit Optional limit on the number of results
     * @returns Promise with search results
     */
    async getAuditEventsForUser(userId: string, limit?: number): Promise<any> {
        const params: Record<string, any> = {
            'agent-who-identifier': userId,
            _sort: '-recorded', // Sort by recorded timestamp, most recent first
        };

        if (limit) {
            params._count = limit.toString();
        }

        return this.searchAuditEvents(params);
    }

    /**
     * Get audit events for a specific resource
     * 
     * @param resourceType The type of resource
     * @param resourceId The ID of the resource
     * @param limit Optional limit on the number of results
     * @returns Promise with search results
     */
    async getAuditEventsForResource(resourceType: string, resourceId: string, limit?: number): Promise<any> {
        const params: Record<string, any> = {
            'entity-what': `${resourceType}/${resourceId}`,
            _sort: '-recorded', // Sort by recorded timestamp, most recent first
        };

        if (limit) {
            params._count = limit.toString();
        }

        return this.searchAuditEvents(params);
    }

    /**
     * Get recent audit events
     * 
     * @param limit Optional limit on the number of results (default 100)
     * @returns Promise with search results
     */
    async getRecentAuditEvents(limit: number = 100): Promise<any> {
        const params: Record<string, any> = {
            _sort: '-recorded', // Sort by recorded timestamp, most recent first
            _count: limit.toString(),
        };

        return this.searchAuditEvents(params);
    }
} 