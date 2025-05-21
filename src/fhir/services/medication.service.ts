import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class MedicationService extends BaseResourceService {
    constructor(
        @InjectModel('Medication') private medicationModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(medicationModel, 'Medication', resourceRegistryService);
    }

    /**
     * Find medications by code
     */
    async findByCode(code: string): Promise<FhirResourceDocument[]> {
        return this.medicationModel.find({
            'code.coding.code': code
        }).exec();
    }
} 