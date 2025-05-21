import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class QuestionnaireService extends BaseResourceService {
    constructor(
        @InjectModel('Questionnaire') private questionnaireModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(questionnaireModel, 'Questionnaire', resourceRegistryService);
    }

    /**
     * Find questionnaires by title
     */
    async findByTitle(title: string): Promise<FhirResourceDocument[]> {
        return this.questionnaireModel.find({
            title: { $regex: title, $options: 'i' }
        }).exec();
    }
} 