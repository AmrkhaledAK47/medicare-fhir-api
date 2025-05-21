import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';

@Injectable()
export class DiagnosticReportService extends BaseResourceService {
    constructor(
        @InjectModel('DiagnosticReport') private diagnosticReportModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(diagnosticReportModel, 'DiagnosticReport', resourceRegistryService);
    }

    /**
     * Find diagnostic reports by patient ID
     */
    async findByPatientId(patientId: string) {
        return this.findAll({
            filter: {
                'subject.reference': `Patient/${patientId}`,
            },
        });
    }
} 