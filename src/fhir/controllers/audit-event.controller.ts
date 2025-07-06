import { Controller, Get, Query, Param, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/guards/roles.guard';
import { AuditEventService } from '../services/audit-event.service';

/**
 * Controller for accessing audit event information
 * Only accessible to admin users
 */
@Controller('api/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditEventController {
    private readonly logger = new Logger(AuditEventController.name);

    constructor(private readonly auditEventService: AuditEventService) { }

    /**
     * Get recent audit events
     * 
     * @param limit Optional limit on the number of results
     * @returns Promise with search results
     */
    @Get()
    async getRecentAuditEvents(
        @Query('limit') limit: string,
        @Req() req: any,
    ): Promise<any> {
        this.logger.log(`Admin ${req.user.userId} retrieving recent audit events`);

        const limitNum = limit ? parseInt(limit) : 100;
        const result = await this.auditEventService.getRecentAuditEvents(limitNum);

        // Log this access as an audit event itself
        await this.auditEventService.logAuditEvent(
            req.user.userId,
            req.user.role,
            'read',
            'AuditEvent',
            undefined,
            'success',
            `Retrieved ${result.total || 0} recent audit events`,
            req.ip,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * Get audit events for a specific user
     * 
     * @param userId The ID of the user
     * @param limit Optional limit on the number of results
     * @returns Promise with search results
     */
    @Get('user/:userId')
    async getAuditEventsForUser(
        @Param('userId') userId: string,
        @Query('limit') limit: string,
        @Req() req: any,
    ): Promise<any> {
        this.logger.log(`Admin ${req.user.userId} retrieving audit events for user ${userId}`);

        const limitNum = limit ? parseInt(limit) : 100;
        const result = await this.auditEventService.getAuditEventsForUser(userId, limitNum);

        // Log this access as an audit event itself
        await this.auditEventService.logAuditEvent(
            req.user.userId,
            req.user.role,
            'read',
            'AuditEvent',
            undefined,
            'success',
            `Retrieved audit events for user ${userId}`,
            req.ip,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * Get audit events for a specific resource
     * 
     * @param resourceType The type of resource
     * @param resourceId The ID of the resource
     * @param limit Optional limit on the number of results
     * @returns Promise with search results
     */
    @Get('resource/:resourceType/:resourceId')
    async getAuditEventsForResource(
        @Param('resourceType') resourceType: string,
        @Param('resourceId') resourceId: string,
        @Query('limit') limit: string,
        @Req() req: any,
    ): Promise<any> {
        this.logger.log(`Admin ${req.user.userId} retrieving audit events for ${resourceType}/${resourceId}`);

        const limitNum = limit ? parseInt(limit) : 100;
        const result = await this.auditEventService.getAuditEventsForResource(resourceType, resourceId, limitNum);

        // Log this access as an audit event itself
        await this.auditEventService.logAuditEvent(
            req.user.userId,
            req.user.role,
            'read',
            'AuditEvent',
            undefined,
            'success',
            `Retrieved audit events for ${resourceType}/${resourceId}`,
            req.ip,
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * Search audit events with custom parameters
     * 
     * @param params Search parameters
     * @returns Promise with search results
     */
    @Get('search')
    async searchAuditEvents(
        @Query() params: Record<string, any>,
        @Req() req: any,
    ): Promise<any> {
        this.logger.log(`Admin ${req.user.userId} searching audit events with params: ${JSON.stringify(params)}`);

        const result = await this.auditEventService.searchAuditEvents(params);

        // Log this access as an audit event itself
        await this.auditEventService.logAuditEvent(
            req.user.userId,
            req.user.role,
            'query',
            'AuditEvent',
            undefined,
            'success',
            `Searched audit events with custom parameters`,
            req.ip,
        );

        return {
            success: true,
            data: result,
        };
    }
} 