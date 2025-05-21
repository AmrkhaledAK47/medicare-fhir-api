import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    FhirReference,
    Identifier,
    CodeableConcept
} from './resource.schema';

export type PaymentDocument = Payment & FhirResourceDocument;

/**
 * Custom Payment resource (not a standard FHIR resource)
 * This represents financial transactions in the system
 */
@Schema({
    timestamps: true,
    collection: 'payments',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Payment extends BaseResource {
    @Prop({ default: 'Payment' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: String, required: true })
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

    @Prop({ type: Object, required: true })
    subject: FhirReference; // Link to Patient

    @Prop({ type: Object })
    encounter?: FhirReference; // Link to Encounter if this payment is for a specific encounter

    @Prop({ type: String, required: true })
    type: 'consultation' | 'procedure' | 'lab-test' | 'medication' | 'insurance' | 'other';

    @Prop({ type: Object })
    paymentMethod: {
        system: string; // e.g., "http://terminology.hl7.org/CodeSystem/payment-method"
        code: string;   // e.g., "CASH", "CREDIT", "DEBIT", "INSURANCE"
        display?: string;
    };

    @Prop({ type: Object, required: true })
    amount: {
        value: number;
        currency: string; // ISO 4217 currency code
    };

    @Prop({ type: Object })
    amountNet?: {
        value: number;
        currency: string;
    };

    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: Object })
    payee?: FhirReference; // Link to Organization that gets paid

    @Prop({ type: Object })
    recipient?: FhirReference; // Link to Organization or Practitioner who receives the payment

    @Prop({ type: Object })
    organization?: FhirReference; // Link to the organization handling the payment

    @Prop({ type: [Object] })
    serviceItems?: {
        description: string;
        itemCode?: string;
        quantity?: number;
        unitPrice?: {
            value: number;
            currency: string;
        };
        totalPrice: {
            value: number;
            currency: string;
        };
        serviceDate?: Date;
        reference?: FhirReference;
    }[];

    @Prop({ type: String })
    note?: string;

    @Prop({ type: String })
    receiptNumber?: string;

    @Prop({ type: String })
    transactionId?: string;

    @Prop({ type: Object })
    insurance?: {
        provider?: string;
        policyNumber?: string;
        coveragePercent?: number;
        approvalCode?: string;
        amountCovered?: {
            value: number;
            currency: string;
        };
        patientResponsibility?: {
            value: number;
            currency: string;
        };
    };

    @Prop({ type: [String] })
    tags?: string[];

    @Prop({ type: String })
    createdBy?: string;

    @Prop({ type: String })
    modifiedBy?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes for common search parameters
PaymentSchema.index({ 'subject.reference': 1 });
PaymentSchema.index({ 'encounter.reference': 1 });
PaymentSchema.index({ type: 1 });
PaymentSchema.index({ 'paymentMethod.code': 1 });
PaymentSchema.index({ receiptNumber: 1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ 'insurance.provider': 1 });
PaymentSchema.index({ 'insurance.policyNumber': 1 });
PaymentSchema.index({ tags: 1 });

// Method to convert to custom format
PaymentSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed
    return obj;
}; 