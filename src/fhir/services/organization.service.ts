import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class OrganizationService extends BaseResourceService {
    constructor(
        @InjectModel('Organization') private organizationModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(organizationModel, 'Organization', resourceRegistryService);
    }

    /**
     * Find organizations by name
     */
    async findByName(name: string): Promise<FhirResourceDocument[]> {
        return this.organizationModel.find({
            name: { $regex: name, $options: 'i' }
        }).exec();
    }
} 