import { Injectable, Logger } from '@nestjs/common';
import { BiomarkerService } from './services/biomarker.service';
import { AppointmentService } from './services/appointment.service';
import { CalendarService } from './services/calendar.service';
import { QuickActionService } from './services/quick-action.service';
import { PatientProfileService } from './services/patient-profile.service';
import { DashboardDto } from './dto/dashboard.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly biomarkerService: BiomarkerService,
        private readonly appointmentService: AppointmentService,
        private readonly calendarService: CalendarService,
        private readonly quickActionService: QuickActionService,
        private readonly patientProfileService: PatientProfileService,
        private readonly usersService: UsersService,
    ) { }

    async build(userId: string, correlationId?: string): Promise<DashboardDto> {
        this.logger.log(`Building dashboard for user ${userId} [${correlationId}]`);

        const startTime = Date.now();

        // Get the user to determine their FHIR resource ID
        const user = await this.usersService.findById(userId);

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        if (!user.fhirResourceId || !user.fhirResourceType) {
            throw new Error(`User ${userId} has no linked FHIR resource`);
        }

        // Store any errors that occur during dashboard build
        const errors: string[] = [];

        // Execute all service calls in parallel
        const [
            profile,
            biomarkers,
            appointments,
            calendar,
            quickActions,
        ] = await Promise.all([
            this.getWithTiming('profile', () => this.patientProfileService.getPatientProfile(userId), errors, correlationId),
            this.getWithTiming('biomarkers', () => this.biomarkerService.getBiomarkers(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('appointments', () => this.appointmentService.getUpcomingAppointments(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('calendar', () => this.calendarService.getCalendarEvents(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('quickActions', () => this.quickActionService.getQuickActions(user.fhirResourceId), errors, correlationId),
        ]);

        const totalTime = Date.now() - startTime;
        this.logger.log(`Dashboard built in ${totalTime}ms with ${errors.length} errors [${correlationId}]`);

        // Build the dashboard DTO
        return {
            profile,
            biomarkers,
            appointments,
            calendar,
            quickActions,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    private async getWithTiming<T>(
        name: string,
        fn: () => Promise<T>,
        errors: string[],
        correlationId?: string
    ): Promise<T | null> {
        const startTime = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.logger.debug(`${name} fetched in ${duration}ms [${correlationId}]`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Error fetching ${name} (${duration}ms): ${error.message} [${correlationId}]`, {
                correlationId,
                component: name,
                duration,
                error: error.stack
            });
            errors.push(`Failed to load ${name}: ${error.message}`);
            return null;
        }
    }
} 