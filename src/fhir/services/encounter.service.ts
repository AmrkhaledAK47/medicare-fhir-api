import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class EncounterService extends BaseResourceService {
    constructor(
        @InjectModel('Encounter') private encounterModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(encounterModel, 'Encounter', resourceRegistryService);
    }

    /**
     * Find encounters by patient ID
     */
    async findByPatientId(patientId: string): Promise<FhirResourceDocument[]> {
        return this.encounterModel.find({
            'subject.reference': `Patient/${patientId}`
        }).exec();
    }

    /**
     * Find encounters by date range
     */
    async findByDateRange(startDate: Date, endDate: Date): Promise<FhirResourceDocument[]> {
        return this.encounterModel.find({
            $or: [
                { 'period.start': { $gte: startDate, $lte: endDate } },
                { 'period.end': { $gte: startDate, $lte: endDate } }
            ]
        }).exec();
    }
} 