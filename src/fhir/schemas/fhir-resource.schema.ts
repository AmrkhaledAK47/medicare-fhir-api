import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FhirResourceType =
    | 'Patient'
    | 'Practitioner'
    | 'Organization'
    | 'Encounter'
    | 'Observation'
    | 'DiagnosticReport'
    | 'Medication'
    | 'MedicationRequest'
    | 'Condition'
    | 'Procedure'
    | 'Immunization'
    | 'AllergyIntolerance'
    | 'CarePlan'
    | 'Goal'
    | 'Questionnaire'
    | 'QuestionnaireResponse'
    | 'PaymentNotice';

export type FhirResourceDocument = FhirResource & Document;

// Define the resource types as an array for enum validation
const RESOURCE_TYPES = [
    'Patient',
    'Practitioner',
    'Organization',
    'Encounter',
    'Observation',
    'DiagnosticReport',
    'Medication',
    'MedicationRequest',
    'Condition',
    'Procedure',
    'Immunization',
    'AllergyIntolerance',
    'CarePlan',
    'Goal',
    'Questionnaire',
    'QuestionnaireResponse',
    'PaymentNotice'
];

@Schema({
    timestamps: true,
    collection: 'fhir_resources',
})
export class FhirResource {
    @Prop({ required: true, enum: RESOURCE_TYPES })
    resourceType: FhirResourceType;

    @Prop({ required: true })
    resourceId: string;

    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
    data: any;

    @Prop({ type: String })
    userId?: string;

    @Prop({ required: true })
    version: string;

    @Prop({ required: true })
    lastUpdated: Date;

    /**
     * Convert to FHIR format
     */
    toFhirResource(): any {
        return this.data;
    }
}

export const FhirResourceSchema = SchemaFactory.createForClass(FhirResource);

// Create compound index for efficient lookups
FhirResourceSchema.index({ resourceType: 1, resourceId: 1 }, { unique: true });

// Create index for user-based queries
FhirResourceSchema.index({ userId: 1 }); 