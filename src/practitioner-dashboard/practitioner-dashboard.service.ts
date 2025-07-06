import { Injectable, Logger } from '@nestjs/common';
import { PractitionerProfileService } from './services/practitioner-profile.service';
import { PractitionerAppointmentService } from './services/practitioner-appointment.service';
import { PractitionerPatientService } from './services/practitioner-patient.service';
import { PractitionerScheduleService } from './services/practitioner-schedule.service';
import { PractitionerReportService } from './services/practitioner-report.service';
import { PractitionerMedicationService } from './services/practitioner-medication.service';
import { PractitionerLabResultService } from './services/practitioner-lab-result.service';
import { PractitionerDashboardDto, DashboardErrorDto } from './dto/practitioner-dashboard.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class PractitionerDashboardService {
    private readonly logger = new Logger(PractitionerDashboardService.name);

    constructor(
        private readonly profileService: PractitionerProfileService,
        private readonly appointmentService: PractitionerAppointmentService,
        private readonly patientService: PractitionerPatientService,
        private readonly scheduleService: PractitionerScheduleService,
        private readonly reportService: PractitionerReportService,
        private readonly medicationService: PractitionerMedicationService,
        private readonly labResultService: PractitionerLabResultService,
        private readonly usersService: UsersService,
    ) { }

    async build(userId: string, correlationId?: string): Promise<PractitionerDashboardDto> {
        this.logger.log(`Building practitioner dashboard for user ${userId} [${correlationId}]`);

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
        const errors: DashboardErrorDto[] = [];

        // Execute all service calls in parallel
        const [
            profile,
            patients,
            appointments,
            schedule,
            reports,
            medications,
            labResults,
            statistics,
        ] = await Promise.all([
            this.getWithTiming('profile', () => this.profileService.getPractitionerProfile(userId), errors, correlationId),
            this.getWithTiming('patients', () => this.patientService.getRecentPatients(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('appointments', () => this.appointmentService.getUpcomingAppointments(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('schedule', () => this.scheduleService.getTodaySchedule(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('reports', () => this.reportService.getRecentReports(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('medications', () => this.medicationService.getRecentMedications(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('labResults', () => this.labResultService.getRecentLabResults(user.fhirResourceId), errors, correlationId),
            this.getWithTiming('statistics', () => this.calculateStatistics(user.fhirResourceId), errors, correlationId),
        ]);

        const totalTime = Date.now() - startTime;
        this.logger.log(`Practitioner dashboard built in ${totalTime}ms with ${errors.length} errors [${correlationId}]`);

        // Build the dashboard DTO
        return {
            profile,
            patients,
            appointments,
            schedule,
            reports,
            medications,
            labResults,
            statistics,
            timestamp: new Date().toISOString(),
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    private async calculateStatistics(practitionerId: string) {
        const [totalPatients, todayAppointments, pendingLabResults] = await Promise.all([
            this.patientService.getTotalPatientCount(practitionerId),
            this.appointmentService.getTodayAppointmentCount(practitionerId),
            this.labResultService.getPendingLabResultCount(practitionerId),
        ]);

        return {
            totalPatients,
            newPatients: 5, // Mock data for demonstration
            totalAppointments: 18, // Mock data for demonstration
            upcomingAppointments: 7, // Mock data for demonstration
            todayAppointments,
            pendingLabResults,
        };
    }

    private async getWithTiming<T>(
        component: string,
        fn: () => Promise<T>,
        errors: DashboardErrorDto[],
        correlationId?: string
    ): Promise<T | null> {
        const startTime = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.logger.debug(`${component} fetched in ${duration}ms [${correlationId}]`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Error fetching ${component} (${duration}ms): ${error.message} [${correlationId}]`, {
                correlationId,
                component,
                duration,
                error: error.stack
            });

            errors.push({
                component,
                message: `Failed to load ${component}: ${error.message}`
            });

            return null;
        }
    }
} 