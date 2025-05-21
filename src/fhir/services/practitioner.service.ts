import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { FhirService } from '../fhir.service';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class PractitionerService extends BaseResourceService {
    constructor(
        @InjectModel('Practitioner') private practitionerModel: Model<FhirResourceDocument>,
        private readonly fhirService: FhirService,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(practitionerModel, 'Practitioner', resourceRegistryService);
    }

    /**
     * Find practitioners by name
     */
    async findByName(name: string): Promise<FhirResourceDocument[]> {
        return this.practitionerModel.find({
            $or: [
                { 'name.family': { $regex: name, $options: 'i' } },
                { 'name.given': { $regex: name, $options: 'i' } },
            ],
        }).exec();
    }

    /**
     * Find a practitioner by user ID (linking to auth system)
     */
    async findByUserId(userId: string): Promise<FhirResourceDocument | null> {
        return this.practitionerModel.findOne({ userId }).exec();
    }

    /**
     * Get practitioners by specialty
     */
    async findBySpecialty(specialty: string): Promise<FhirResourceDocument[]> {
        return this.practitionerModel.find({
            'qualification.code.coding.code': specialty
        }).exec();
    }
} 