import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    HumanName,
    ContactPoint,
    Address,
    CodeableConcept,
    FhirReference,
    Identifier
} from './resource.schema';

export type PractitionerDocument = Practitioner & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'practitioners',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Practitioner extends BaseResource {
    @Prop({ default: 'Practitioner' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: Boolean })
    active?: boolean;

    @Prop({ type: [Object] })
    name?: HumanName[];

    @Prop({ type: [Object] })
    telecom?: ContactPoint[];

    @Prop({ type: [Object] })
    address?: Address[];

    @Prop({ type: String })
    gender?: 'male' | 'female' | 'other' | 'unknown';

    @Prop({ type: Date })
    birthDate?: Date;

    @Prop({ type: [Object] })
    photo?: {
        contentType?: string;
        data?: string; // base64
        url?: string;
        title?: string;
    }[];

    @Prop({ type: [Object] })
    qualification?: {
        identifier?: Identifier[];
        code: CodeableConcept;
        period?: {
            start?: Date;
            end?: Date;
        };
        issuer?: FhirReference;
    }[];

    @Prop({ type: [Object] })
    communication?: {
        language: CodeableConcept;
        preferred?: boolean;
    }[];

    // Additional fields for specialty and linking with user accounts
    @Prop({ type: [Object] })
    specialty?: CodeableConcept[];

    @Prop({ type: String })
    userId?: string;
}

export const PractitionerSchema = SchemaFactory.createForClass(Practitioner);

// Create indexes for common search parameters
PractitionerSchema.index({ 'name.family': 'text', 'name.given': 'text' });
PractitionerSchema.index({ 'identifier.value': 1 });
PractitionerSchema.index({ active: 1 });
PractitionerSchema.index({ 'qualification.code.coding.code': 1 });
PractitionerSchema.index({ 'specialty.coding.code': 1 });
PractitionerSchema.index({ userId: 1 });

// Method to convert to FHIR format
PractitionerSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 