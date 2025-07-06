import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { FhirModule } from '../fhir/fhir.module';

@Module({
    imports: [
        TerminusModule,
        HttpModule,
        FhirModule,
    ],
    controllers: [HealthController],
})
export class HealthModule { } 