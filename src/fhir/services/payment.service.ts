import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';
import { ResourceRegistryService } from './resource-registry.service';
import { Payment } from '../schemas/payment.schema';

@Injectable()
export class PaymentService extends BaseResourceService {
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<FhirResourceDocument>,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(paymentModel, 'Payment', resourceRegistryService);
    }

    /**
     * Find payments by patient ID
     */
    async findByPatientId(patientId: string): Promise<FhirResourceDocument[]> {
        return this.paymentModel.find({
            'subject.reference': `Patient/${patientId}`
        }).exec();
    }
} 