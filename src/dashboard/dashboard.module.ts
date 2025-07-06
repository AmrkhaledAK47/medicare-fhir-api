import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BiomarkerService } from './services/biomarker.service';
import { AppointmentService } from './services/appointment.service';
import { CalendarService } from './services/calendar.service';
import { QuickActionService } from './services/quick-action.service';
import { PatientProfileService } from './services/patient-profile.service';
import { ChronicDiseaseService } from './services/chronic-disease.service';
import { FhirModule } from '../fhir/fhir.module';
import { UsersModule } from '../users/users.module';
import { CacheModule } from '../cache/cache.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        FhirModule,
        UsersModule,
        CacheModule,
        AuthModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION', '7d'),
                },
            }),
        }),
    ],
    controllers: [DashboardController],
    providers: [
        DashboardService,
        BiomarkerService,
        AppointmentService,
        CalendarService,
        QuickActionService,
        PatientProfileService,
        ChronicDiseaseService,
    ],
    exports: [DashboardService],
})
export class DashboardModule { } 