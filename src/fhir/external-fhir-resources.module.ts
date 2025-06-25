import { DynamicModule, Module, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalFhirService } from './services/external-fhir.service';
import { ExternalFhirResourcesController } from './controllers/external-fhir-resources.controller';

export interface ExternalFhirResourcesOptions {
    serverUrl?: string;
    version?: string;
    localResources?: string[];
    externalResources?: string[];
}

@Module({})
export class ExternalFhirResourcesModule {
    static forRoot(options: ExternalFhirResourcesOptions = {}): DynamicModule {
        return {
            module: ExternalFhirResourcesModule,
            imports: [
                HttpModule.register({
                    timeout: 30000,
                }),
                ConfigModule,
            ],
            controllers: [ExternalFhirResourcesController],
            providers: [
                ExternalFhirService,
                {
                    provide: 'EXTERNAL_FHIR_OPTIONS',
                    useValue: {
                        serverUrl: options.serverUrl || process.env.FHIR_SERVER_URL || 'http://hapi-fhir:8080/fhir',
                        version: options.version || process.env.FHIR_VERSION || 'R4',
                        localResources: options.localResources ||
                            (process.env.LOCAL_FHIR_RESOURCES ? process.env.LOCAL_FHIR_RESOURCES.split(',') : [
                                'Patient', 'Practitioner', 'Organization', 'Encounter',
                                'Observation', 'DiagnosticReport', 'Medication',
                                'Questionnaire', 'Payment'
                            ]),
                        externalResources: options.externalResources || ['*'],
                    },
                },
            ],
            exports: [ExternalFhirService],
        };
    }
} 