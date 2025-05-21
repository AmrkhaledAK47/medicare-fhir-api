import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    CodeableConcept,
    FhirReference,
    Identifier,
    Period
} from './resource.schema';

export type ObservationDocument = Observation & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'observations',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Observation extends BaseResource {
    @Prop({ default: 'Observation' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: [Object] })
    basedOn?: FhirReference[];

    @Prop({ type: [Object] })
    partOf?: FhirReference[];

    @Prop({ type: String, required: true })
    status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';

    @Prop({ type: [Object] })
    category?: CodeableConcept[];

    @Prop({ type: Object, required: true })
    code: CodeableConcept;

    @Prop({ type: Object, required: true })
    subject: FhirReference;

    @Prop({ type: [Object] })
    focus?: FhirReference[];

    @Prop({ type: Object })
    encounter?: FhirReference;

    @Prop({ type: Date })
    effectiveDateTime?: Date;

    @Prop({ type: Object })
    effectivePeriod?: Period;

    @Prop({ type: String })
    effectiveTiming?: string; // Could be more structured

    @Prop({ type: String })
    effectiveInstant?: string;

    @Prop({ type: Date })
    issued?: Date;

    @Prop({ type: [Object] })
    performer?: FhirReference[];

    @Prop({ type: Object })
    valueQuantity?: {
        value?: number;
        comparator?: string;
        unit?: string;
        system?: string;
        code?: string;
    };

    @Prop({ type: Object })
    valueCodeableConcept?: CodeableConcept;

    @Prop({ type: String })
    valueString?: string;

    @Prop({ type: Boolean })
    valueBoolean?: boolean;

    @Prop({ type: Number })
    valueInteger?: number;

    @Prop({ type: Number })
    valueDecimal?: number;

    @Prop({ type: Object })
    valueRange?: {
        low?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
        high?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
    };

    @Prop({ type: Object })
    valueRatio?: {
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

    @Prop({ type: String })
    valueTime?: string;

    @Prop({ type: Date })
    valueDateTime?: Date;

    @Prop({ type: String })
    valueSampledData?: string;

    @Prop({ type: Object })
    dataAbsentReason?: CodeableConcept;

    @Prop({ type: [Object] })
    interpretation?: CodeableConcept[];

    @Prop({ type: String })
    note?: string;

    @Prop({ type: Object })
    bodySite?: CodeableConcept;

    @Prop({ type: Object })
    method?: CodeableConcept;

    @Prop({ type: Object })
    specimen?: FhirReference;

    @Prop({ type: Object })
    device?: FhirReference;

    @Prop({ type: [Object] })
    referenceRange?: {
        low?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
        high?: {
            value?: number;
            unit?: string;
            system?: string;
            code?: string;
        };
        type?: CodeableConcept;
        appliesTo?: CodeableConcept[];
        age?: {
            low?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
            high?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
        };
        text?: string;
    }[];

    @Prop({ type: [Object] })
    hasMember?: FhirReference[];

    @Prop({ type: [Object] })
    derivedFrom?: FhirReference[];

    @Prop({ type: [Object] })
    component?: {
        code: CodeableConcept;
        valueQuantity?: {
            value?: number;
            comparator?: string;
            unit?: string;
            system?: string;
            code?: string;
        };
        valueCodeableConcept?: CodeableConcept;
        valueString?: string;
        valueBoolean?: boolean;
        valueInteger?: number;
        valueTime?: string;
        valueDateTime?: Date;
        valueRange?: {
            low?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
            high?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
        };
        dataAbsentReason?: CodeableConcept;
        interpretation?: CodeableConcept[];
        referenceRange?: {
            low?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
            high?: {
                value?: number;
                unit?: string;
                system?: string;
                code?: string;
            };
            type?: CodeableConcept;
            appliesTo?: CodeableConcept[];
            age?: {
                low?: {
                    value?: number;
                    unit?: string;
                    system?: string;
                    code?: string;
                };
                high?: {
                    value?: number;
                    unit?: string;
                    system?: string;
                    code?: string;
                };
            };
            text?: string;
        }[];
    }[];

    // Additional fields for lab tests
    @Prop({ type: String })
    testName?: string;

    @Prop({ type: String })
    testCode?: string;

    @Prop({ type: String })
    abnormalFlag?: 'normal' | 'abnormal' | 'high' | 'low' | 'critical-high' | 'critical-low';

    @Prop({ type: Boolean })
    needsReview?: boolean;

    @Prop({ type: String })
    resultSummary?: string;
}

export const ObservationSchema = SchemaFactory.createForClass(Observation);

// Create indexes for common search parameters
ObservationSchema.index({ status: 1 });
ObservationSchema.index({ 'subject.reference': 1 });
ObservationSchema.index({ 'encounter.reference': 1 });
ObservationSchema.index({ 'code.coding.code': 1 });
ObservationSchema.index({ effectiveDateTime: 1 });
ObservationSchema.index({ 'performer.reference': 1 });
ObservationSchema.index({ abnormalFlag: 1 });
ObservationSchema.index({ testName: 'text' });
ObservationSchema.index({ testCode: 1 });
ObservationSchema.index({ needsReview: 1 });
ObservationSchema.index({ 'category.coding.code': 1 });

// Method to convert to FHIR format
ObservationSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 