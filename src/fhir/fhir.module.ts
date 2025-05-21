import { Module, DynamicModule, Global, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Import schemas
import { Patient, PatientSchema } from './schemas/patient.schema';
import { Practitioner, PractitionerSchema } from './schemas/practitioner.schema';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { Observation, ObservationSchema } from './schemas/observation.schema';
import { DiagnosticReport, DiagnosticReportSchema } from './schemas/diagnostic-report.schema';
import { Medication, MedicationSchema } from './schemas/medication.schema';
import { Questionnaire, QuestionnaireSchema } from './schemas/questionnaire.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { GenericResource, GenericResourceSchema } from './schemas/generic-resource.schema';
import { FhirResource, FhirResourceSchema } from './schemas/fhir-resource.schema';

// Import services
import { FhirService } from './fhir.service';
import { ResourceRegistryService } from './services/resource-registry.service';
import { GenericResourceService } from './services/generic-resource.service';
import { PatientService } from './services/patient.service';
import { PractitionerService } from './services/practitioner.service';
import { OrganizationService } from './services/organization.service';
import { EncounterService } from './services/encounter.service';
import { ObservationService } from './services/observation.service';
import { DiagnosticReportService } from './services/diagnostic-report.service';
import { MedicationService } from './services/medication.service';
import { QuestionnaireService } from './services/questionnaire.service';
import { PaymentService } from './services/payment.service';

// Import controllers
import { FhirController } from './fhir.controller';
import { GenericResourceController } from './generic-resource.controller';
import { PatientController } from './controllers/patient.controller';
import { PractitionerController } from './controllers/practitioner.controller';
import { OrganizationController } from './controllers/organization.controller';
import { EncounterController } from './controllers/encounter.controller';
import { ObservationController } from './controllers/observation.controller';
import { DiagnosticReportController } from './controllers/diagnostic-report.controller';
import { MedicationController } from './controllers/medication.controller';
import { QuestionnaireController } from './controllers/questionnaire.controller';
import { PaymentController } from './controllers/payment.controller';

@Global()
@Module({})
export class FhirModule implements OnModuleInit {
    constructor(private resourceRegistry: ResourceRegistryService) { }

    async onModuleInit() {
        // Initialize resource registry
        await this.resourceRegistry.initializeRegistry();
    }

    static forRoot(options: {
        enableHapiFhir?: boolean,
        hapiFhirUrl?: string,
        localResources?: string[]
    } = {}): DynamicModule {
        const imports = [
            MongooseModule.forFeature([
                { name: FhirResource.name, schema: FhirResourceSchema },
                { name: Patient.name, schema: PatientSchema },
                { name: Practitioner.name, schema: PractitionerSchema },
                { name: Organization.name, schema: OrganizationSchema },
                { name: Encounter.name, schema: EncounterSchema },
                { name: Observation.name, schema: ObservationSchema },
                { name: DiagnosticReport.name, schema: DiagnosticReportSchema },
                { name: Medication.name, schema: MedicationSchema },
                { name: Questionnaire.name, schema: QuestionnaireSchema },
                { name: Payment.name, schema: PaymentSchema },
                { name: GenericResource.name, schema: GenericResourceSchema },
            ]),
            ConfigModule,
            HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            JwtModule.registerAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => ({
                    secret: configService.get<string>('app.jwt.secret'),
                    signOptions: {
                        expiresIn: configService.get<string>('app.jwt.expiresIn', '7d'),
                    },
                }),
            }),
        ];

        const providers = [
            {
                provide: 'FHIR_MODULE_OPTIONS',
                useValue: {
                    enableHapiFhir: options.enableHapiFhir || false,
                    hapiFhirUrl: options.hapiFhirUrl || 'http://localhost:9090/fhir',
                    localResources: options.localResources || [],
                },
            },
            ResourceRegistryService,
            FhirService,
            GenericResourceService,
            PatientService,
            PractitionerService,
            OrganizationService,
            EncounterService,
            ObservationService,
            DiagnosticReportService,
            MedicationService,
            QuestionnaireService,
            PaymentService,
        ];

        const controllers = [
            FhirController,
            GenericResourceController,
            PatientController,
            PractitionerController,
            OrganizationController,
            EncounterController,
            ObservationController,
            DiagnosticReportController,
            MedicationController,
            QuestionnaireController,
            PaymentController,
        ];

        const exports = [
            ResourceRegistryService,
            FhirService,
            GenericResourceService,
            PatientService,
            PractitionerService,
            OrganizationService,
            EncounterService,
            ObservationService,
            DiagnosticReportService,
            MedicationService,
            QuestionnaireService,
            PaymentService,
        ];

        return {
            module: FhirModule,
            imports,
            providers,
            controllers,
            exports,
        };
    }
} 