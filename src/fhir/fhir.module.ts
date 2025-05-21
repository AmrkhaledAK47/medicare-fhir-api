import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirController } from './fhir.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FhirResource, FhirResourceSchema } from './schemas/fhir-resource.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FhirResource.name, schema: FhirResourceSchema }
        ]),
    ],
    controllers: [FhirController],
    providers: [FhirService],
    exports: [FhirService],
})
export class FhirModule { } 