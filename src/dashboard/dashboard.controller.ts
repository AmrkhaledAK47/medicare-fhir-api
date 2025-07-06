import { Controller, Get, UseGuards, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardDto } from './dto/dashboard.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from '../metrics/metrics.service';
import { v4 as uuidv4 } from 'uuid';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly metricsService: MetricsService,
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.PATIENT)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get user dashboard data',
        description: 'Retrieves all dashboard data for the authenticated patient user, including profile information, biomarkers, appointments, calendar events, and quick actions. The dashboard data is cached for 60 seconds. This endpoint is only accessible to patients.'
    })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully', type: DashboardDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired JWT token' })
    @ApiResponse({ status: 403, description: 'Forbidden - User does not have patient role' })
    @ApiResponse({ status: 400, description: 'Bad Request - User has no linked FHIR resource' })
    @ApiResponse({ status: 500, description: 'Internal Server Error - Failed to load dashboard data' })
    async getDashboard(@CurrentUser() user: UserDocument): Promise<DashboardDto> {
        const startTime = Date.now();
        const correlationId = uuidv4();

        try {
            // Verify user has FHIR resource ID
            if (!user.fhirResourceId || !user.fhirResourceType) {
                this.logger.warn(`User ${user._id} (${user.role}) has no FHIR resource ID [${correlationId}]`);
                this.metricsService.incrementCounter('dashboard_errors_total', 1, {
                    reason: 'missing_fhir_resource',
                    role: user.role
                });
                throw new HttpException('User has no linked FHIR resource', HttpStatus.BAD_REQUEST);
            }

            const dashboard = await this.dashboardService.build(user._id.toString(), correlationId);
            const responseTime = Date.now() - startTime;

            // Record metrics
            if (dashboard.errors && dashboard.errors.length > 0) {
                // Some components failed, but we still return a partial dashboard
                this.metricsService.incrementCounter('dashboard_partial_loads_total', 1, {
                    role: user.role,
                    error_count: dashboard.errors.length.toString()
                });

                // Log each error
                dashboard.errors.forEach(error => {
                    this.logger.warn(`Dashboard component error: ${error} [${correlationId}]`);
                });

                this.logger.log(
                    `Partial dashboard loaded for user ${user._id} in ${responseTime}ms with ${dashboard.errors.length} errors [${correlationId}]`,
                    { correlationId, userId: user._id, responseTime, errors: dashboard.errors }
                );
            } else {
                // Complete successful load
                this.metricsService.incrementCounter('dashboard_successful_loads_total', 1, {
                    role: user.role
                });
                this.logger.log(
                    `Dashboard successfully loaded for user ${user._id} in ${responseTime}ms [${correlationId}]`,
                    { correlationId, userId: user._id, responseTime }
                );
            }

            // Record response time histogram
            this.metricsService.recordTiming('dashboard_response_time_ms', responseTime, {
                role: user.role,
                status: dashboard.errors && dashboard.errors.length > 0 ? 'partial' : 'success'
            });

            return dashboard;
        } catch (error) {
            const responseTime = Date.now() - startTime;

            // Record metrics for complete failures
            this.metricsService.incrementCounter('dashboard_failed_loads_total', 1, {
                role: user.role,
                error: error.name
            });

            this.metricsService.recordTiming('dashboard_response_time_ms', responseTime, {
                role: user.role,
                status: 'error'
            });

            this.logger.error(
                `Failed to load dashboard for user ${user._id}: ${error.message} [${correlationId}]`,
                { correlationId, userId: user._id, responseTime, error: error.stack }
            );

            // If it's already an HTTP exception, rethrow it
            if (error instanceof HttpException) {
                throw error;
            }

            // Otherwise wrap in a 500
            throw new HttpException(
                'Failed to load dashboard data',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}