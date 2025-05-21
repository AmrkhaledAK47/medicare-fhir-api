import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class ObservationService extends BaseResourceService {
    constructor(
        @InjectModel('Observation') private observationModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(observationModel, 'Observation', resourceRegistryService);
    }

    /**
     * Find observations by patient ID
     */
    async findByPatientId(patientId: string): Promise<FhirResourceDocument[]> {
        return this.observationModel.find({
            'subject.reference': `Patient/${patientId}`
        }).exec();
    }
} 