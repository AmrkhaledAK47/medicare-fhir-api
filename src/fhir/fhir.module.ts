import { Module, DynamicModule, Global, OnModuleInit, MiddlewareConsumer, RequestMethod, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

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
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

// Import adapters
import { HapiFhirAdapter } from './adapters/hapi-fhir.adapter';
import { TerminologyAdapter } from './adapters/terminology.adapter';

// Import interceptors
import { FhirValidationInterceptor } from './interceptors/fhir-validation.interceptor';
import { AuditTrailInterceptor } from './interceptors/audit-trail.interceptor';

// Import filters
import { FhirExceptionFilter } from './filters/fhir-exception.filter';

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
import { MedicationController, MedicationRequestController } from './controllers/medication.controller';
import { QuestionnaireController } from './controllers/questionnaire.controller';
import { PaymentController } from './controllers/payment.controller';
import { ConditionController } from './controllers/condition.controller';
import { ProcedureController } from './controllers/procedure.controller';
import { TerminologyController } from './controllers/terminology.controller';
import { ValidationController } from './controllers/validation.controller';
import { DocumentationController } from './controllers/documentation.controller';
import { ExamplePaginationController } from './controllers/example-pagination.controller';
import { AllergyIntoleranceController } from './controllers/allergy-intolerance.controller';

// Import middleware
import { FhirAuthorizationMiddleware } from './middleware/fhir-authorization.middleware';
import { FhirVersioningMiddleware } from './middleware/fhir-versioning.middleware';
import { FhirConfigService } from './config/fhir-config.service';
import { FhirConfig } from './config/fhir-config.interface';

@Global()
@Module({})
export class FhirModule implements OnModuleInit {
    constructor(private resourceRegistry: ResourceRegistryService) { }

    async onModuleInit() {
        // Initialize resource registry
        await this.resourceRegistry.initializeRegistry();
    }

    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(FhirVersioningMiddleware, FhirAuthorizationMiddleware)
            .forRoutes({ path: 'fhir/*', method: RequestMethod.ALL });
    }

    static forRoot(options: FhirConfig): DynamicModule {
        const schemaImports = [
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
            { name: AuditLog.name, schema: AuditLogSchema },
        ];

        const imports = [
            MongooseModule.forFeature(schemaImports),
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

        // Setup providers
        const providers: Provider[] = [
            {
                provide: 'FHIR_OPTIONS',
                useValue: options || {},
            },
            ConfigService,
            FhirConfigService,
            HapiFhirAdapter,
            TerminologyAdapter,
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
            FhirAuthorizationMiddleware,
            FhirVersioningMiddleware,
            // Global exception filter
            {
                provide: APP_FILTER,
                useClass: FhirExceptionFilter,
            },
        ];

        // Setup interceptors
        if (options.enableValidation !== false) {
            providers.push(FhirValidationInterceptor);
            providers.push({
                provide: APP_INTERCEPTOR,
                useClass: FhirValidationInterceptor,
            });
        }

        if (options.enableAuditing !== false) {
            providers.push(AuditTrailInterceptor);
            providers.push({
                provide: APP_INTERCEPTOR,
                useClass: AuditTrailInterceptor,
            });
        }

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
            MedicationRequestController,
            QuestionnaireController,
            PaymentController,
            ConditionController,
            ProcedureController,
            TerminologyController,
            ValidationController,
            DocumentationController,
            ExamplePaginationController,
            AllergyIntoleranceController,
        ];

        const exports = [
            HapiFhirAdapter,
            TerminologyAdapter,
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

        if (options.enableValidation !== false) {
            // Don't add to exports, interceptors are only providers
            // exports.push(FhirValidationInterceptor);
        }

        if (options.enableAuditing !== false) {
            // Don't add to exports, interceptors are only providers
            // exports.push(AuditTrailInterceptor);
        }

        return {
            module: FhirModule,
            imports,
            providers,
            controllers,
            exports,
        };
    }
} 