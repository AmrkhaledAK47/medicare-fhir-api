import { Module } from '@nestjs/common';
import { PractitionerDashboardController } from './practitioner-dashboard.controller';
import { PractitionerDashboardService } from './practitioner-dashboard.service';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PractitionerProfileService } from './services/practitioner-profile.service';
import { PractitionerPatientService } from './services/practitioner-patient.service';
import { PractitionerAppointmentService } from './services/practitioner-appointment.service';
import { PractitionerScheduleService } from './services/practitioner-schedule.service';
import { PractitionerReportService } from './services/practitioner-report.service';
import { PractitionerMedicationService } from './services/practitioner-medication.service';
import { PractitionerLabResultService } from './services/practitioner-lab-result.service';

@Module({
    imports: [
        CacheModule.register({
            ttl: 60, // seconds
            max: 100, // maximum number of items in cache
        }),
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [PractitionerDashboardController],
    providers: [
        PractitionerDashboardService,
        PractitionerProfileService,
        PractitionerPatientService,
        PractitionerAppointmentService,
        PractitionerScheduleService,
        PractitionerReportService,
        PractitionerMedicationService,
        PractitionerLabResultService,
    ],
    exports: [PractitionerDashboardService],
})
export class PractitionerDashboardModule { } 