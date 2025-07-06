import { Controller, Get, UseGuards, Req, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { PractitionerDashboardService } from './practitioner-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PractitionerDashboardDto } from './dto/practitioner-dashboard.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { UserDocument, UserRole } from '../users/schemas/user.schema';

@ApiTags('practitioner-dashboard')
@Controller('practitioner-dashboard')
export class PractitionerDashboardController {
  private readonly logger = new Logger(PractitionerDashboardController.name);

  constructor(
    private readonly practitionerDashboardService: PractitionerDashboardService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRACTITIONER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get practitioner dashboard data',
    description: 'Retrieves all dashboard data for the authenticated practitioner user, including profile information, patients, appointments, schedule, reports, medications, and lab results. The dashboard data is cached for 60 seconds. This endpoint is only accessible to practitioners.'
  })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully', type: PractitionerDashboardDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have practitioner role' })
  @ApiResponse({ status: 400, description: 'Bad Request - User has no linked FHIR resource' })
  @ApiResponse({ status: 500, description: 'Internal Server Error - Failed to load dashboard data' })
  async getDashboard(@CurrentUser() user: UserDocument): Promise<PractitionerDashboardDto> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    try {
      // Verify user has FHIR resource ID
      if (!user.fhirResourceId || !user.fhirResourceType) {
        this.logger.warn(`User ${user._id} (${user.role}) has no FHIR resource ID [${correlationId}]`);
        throw new HttpException('User has no linked FHIR resource', HttpStatus.BAD_REQUEST);
      }

      // Verify user is a practitioner
      if (user.role !== UserRole.PRACTITIONER && user.role !== UserRole.ADMIN) {
        this.logger.warn(`User ${user._id} with role ${user.role} attempted to access practitioner dashboard [${correlationId}]`);
        throw new HttpException('Only practitioners can access this resource', HttpStatus.FORBIDDEN);
      }

      const dashboard = await this.practitionerDashboardService.build(user._id.toString(), correlationId);
      const responseTime = Date.now() - startTime;

      // Log success or partial success
      if (dashboard.errors && dashboard.errors.length > 0) {
        // Some components failed, but we still return a partial dashboard
        this.logger.log(
          `Partial practitioner dashboard loaded for user ${user._id} in ${responseTime}ms with ${dashboard.errors.length} errors [${correlationId}]`,
          { correlationId, userId: user._id, responseTime, errors: dashboard.errors }
        );
      } else {
        // Complete successful load
        this.logger.log(
          `Practitioner dashboard successfully loaded for user ${user._id} in ${responseTime}ms [${correlationId}]`,
          { correlationId, userId: user._id, responseTime }
        );
      }

      return dashboard;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(
        `Failed to load practitioner dashboard for user ${user._id}: ${error.message} [${correlationId}]`,
        { correlationId, userId: user._id, responseTime, error: error.stack }
      );

      // If it's already an HTTP exception, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise wrap in a 500
      throw new HttpException(
        'Failed to load practitioner dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 