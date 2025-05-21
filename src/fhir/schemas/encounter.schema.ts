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

export type EncounterDocument = Encounter & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'encounters',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Encounter extends BaseResource {
    @Prop({ default: 'Encounter' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: String, required: true })
    status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';

    @Prop({ type: [Object] })
    statusHistory?: {
        status: string;
        period: Period;
    }[];

    @Prop({ type: Object, required: true })
    class: {
        system: string;
        code: string;
        display?: string;
    };

    @Prop({ type: [Object] })
    classHistory?: {
        class: {
            system: string;
            code: string;
            display?: string;
        };
        period: Period;
    }[];

    @Prop({ type: [Object] })
    type?: CodeableConcept[];

    @Prop({ type: Object })
    serviceType?: CodeableConcept;

    @Prop({ type: Object })
    priority?: CodeableConcept;

    @Prop({ type: Object, required: true })
    subject: FhirReference;

    @Prop({ type: [Object] })
    episodeOfCare?: FhirReference[];

    @Prop({ type: [Object] })
    basedOn?: FhirReference[];

    @Prop({ type: [Object] })
    participant?: {
        type?: CodeableConcept[];
        period?: Period;
        individual?: FhirReference;
    }[];

    @Prop({ type: [Object] })
    appointment?: FhirReference[];

    @Prop({ type: Object, required: true })
    period: Period;

    @Prop({ type: Object })
    length?: {
        value: number;
        unit: string;
        system?: string;
        code?: string;
    };

    @Prop({ type: [Object] })
    reasonCode?: CodeableConcept[];

    @Prop({ type: [Object] })
    reasonReference?: FhirReference[];

    @Prop({ type: [Object] })
    diagnosis?: {
        condition: FhirReference;
        use?: CodeableConcept;
        rank?: number;
    }[];

    @Prop({ type: [Object] })
    account?: FhirReference[];

    @Prop({ type: Object })
    hospitalization?: {
        preAdmissionIdentifier?: Identifier;
        origin?: FhirReference;
        admitSource?: CodeableConcept;
        reAdmission?: CodeableConcept;
        dietPreference?: CodeableConcept[];
        specialCourtesy?: CodeableConcept[];
        specialArrangement?: CodeableConcept[];
        destination?: FhirReference;
        dischargeDisposition?: CodeableConcept;
    };

    @Prop({ type: [Object] })
    location?: {
        location: FhirReference;
        status?: 'planned' | 'active' | 'reserved' | 'completed';
        physicalType?: CodeableConcept;
        period?: Period;
    }[];

    @Prop({ type: Object })
    serviceProvider?: FhirReference;

    @Prop({ type: Object })
    partOf?: FhirReference;
}

export const EncounterSchema = SchemaFactory.createForClass(Encounter);

// Create indexes for common search parameters
EncounterSchema.index({ status: 1 });
EncounterSchema.index({ 'subject.reference': 1 });
EncounterSchema.index({ 'participant.individual.reference': 1 });
EncounterSchema.index({ 'period.start': 1, 'period.end': 1 });
EncounterSchema.index({ 'serviceProvider.reference': 1 });
EncounterSchema.index({ 'class.code': 1 });
EncounterSchema.index({ 'type.coding.code': 1 });

// Method to convert to FHIR format
EncounterSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 