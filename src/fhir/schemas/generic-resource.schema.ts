import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FhirResourceDocument } from './resource.schema';

export type GenericResourceDocument = GenericResource & FhirResourceDocument;

/**
 * Generic schema for FHIR resources that don't have a specific schema defined
 * This allows for storing any FHIR resource type without predefined schema
 */
@Schema({
    timestamps: true,
    collection: 'fhir_resources',
    strict: false, // Allow for any fields to be stored
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class GenericResource {
    @Prop({ required: true, index: true })
    resourceType: string;

    @Prop({ type: Object })
    data: any;

    // Additional metadata for the resource
    @Prop({ type: Date })
    lastSyncedAt?: Date;

    @Prop({ type: String })
    sourceSystem?: string;

    @Prop({ type: Boolean, default: false })
    isDeleted?: boolean;
}

export const GenericResourceSchema = SchemaFactory.createForClass(GenericResource);

// Create indexes for common search parameters
GenericResourceSchema.index({ resourceType: 1 });
GenericResourceSchema.index({ 'data.name': 'text' });
GenericResourceSchema.index({ 'data.identifier.value': 1 });
GenericResourceSchema.index({ 'data.status': 1 });
GenericResourceSchema.index({ createdAt: 1 });
GenericResourceSchema.index({ updatedAt: 1 });

// Method to convert to FHIR format
GenericResourceSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();

    // If stored as data property, merge with root
    if (obj.data) {
        // Merge data fields with root object
        const result = { ...obj, ...obj.data };
        // Remove the data property itself
        delete result.data;
        return result;
    }

    // Otherwise return as is
    return obj;
}; 