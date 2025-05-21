import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    CodeableConcept,
    FhirReference,
    Identifier
} from './resource.schema';

export type MedicationDocument = Medication & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'medications',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Medication extends BaseResource {
    @Prop({ default: 'Medication' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: Object })
    code?: CodeableConcept;

    @Prop({ type: String })
    status?: 'active' | 'inactive' | 'entered-in-error';

    @Prop({ type: Object })
    manufacturer?: FhirReference;

    @Prop({ type: Object })
    form?: CodeableConcept;

    @Prop({ type: Number })
    amount?: {
        numerator?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
        denominator?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
    };

    @Prop({ type: [Object] })
    ingredient?: {
        itemCodeableConcept?: CodeableConcept;
        itemReference?: FhirReference;
        isActive?: boolean;
        strength?: {
            numerator?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
            denominator?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
        };
    }[];

    @Prop({ type: [Object] })
    batch?: {
        lotNumber?: string;
        expirationDate?: Date;
    };

    // Additional custom fields
    @Prop({ type: String })
    brandName?: string;

    @Prop({ type: String })
    genericName?: string;

    @Prop({ type: String })
    dosageForm?: string;

    @Prop({ type: String })
    strength?: string;

    @Prop({ type: String })
    route?: string;

    @Prop({ type: Boolean })
    requiresPrescription?: boolean;

    @Prop({ type: Number })
    price?: number;

    @Prop({ type: String })
    currency?: string;

    @Prop({ type: Number })
    stockQuantity?: number;
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);

// Create indexes for common search parameters
MedicationSchema.index({ 'code.coding.code': 1 });
MedicationSchema.index({ brandName: 'text', genericName: 'text' });
MedicationSchema.index({ status: 1 });
MedicationSchema.index({ 'manufacturer.reference': 1 });
MedicationSchema.index({ requiresPrescription: 1 });
MedicationSchema.index({ stockQuantity: 1 });

// Method to convert to FHIR format
MedicationSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 