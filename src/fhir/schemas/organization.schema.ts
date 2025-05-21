import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    ContactPoint,
    Address,
    CodeableConcept,
    FhirReference,
    Identifier
} from './resource.schema';

export type OrganizationDocument = Organization & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'organizations',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Organization extends BaseResource {
    @Prop({ default: 'Organization' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: Boolean })
    active?: boolean;

    @Prop({ type: [Object] })
    type?: CodeableConcept[];

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: [String] })
    alias?: string[];

    @Prop({ type: [Object] })
    telecom?: ContactPoint[];

    @Prop({ type: [Object] })
    address?: Address[];

    @Prop({ type: Object })
    partOf?: FhirReference;

    @Prop({ type: [Object] })
    contact?: {
        purpose?: CodeableConcept;
        name?: {
            use?: string;
            text?: string;
            family?: string;
            given?: string[];
            prefix?: string[];
            suffix?: string[];
        };
        telecom?: ContactPoint[];
        address?: Address;
    }[];

    @Prop({ type: [Object] })
    endpoint?: FhirReference[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Create indexes for common search parameters
OrganizationSchema.index({ name: 'text', alias: 'text' });
OrganizationSchema.index({ 'identifier.value': 1 });
OrganizationSchema.index({ active: 1 });
OrganizationSchema.index({ 'type.coding.code': 1 });
OrganizationSchema.index({ 'partOf.reference': 1 });

// Method to convert to FHIR format
OrganizationSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 