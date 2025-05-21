import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum FhirResourceType {
    PATIENT = 'Patient',
    PRACTITIONER = 'Practitioner',
    OBSERVATION = 'Observation',
    MEDICATION = 'Medication',
    CONDITION = 'Condition',
    ORGANIZATION = 'Organization',
    ENCOUNTER = 'Encounter',
    PROCEDURE = 'Procedure',
    DIAGNOSTIC_REPORT = 'DiagnosticReport',
    CARE_PLAN = 'CarePlan',
}

@Schema({ timestamps: true })
export class FhirResource extends Document {
    @Prop({
        required: true,
        enum: Object.values(FhirResourceType),
        index: true,
    })
    resourceType: FhirResourceType;

    @Prop({ required: true, index: true })
    resourceId: string;

    @Prop({ type: Object, required: true })
    data: Record<string, any>;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    userId: User;

    @Prop({ required: true })
    version: string;

    @Prop({ required: true })
    lastUpdated: Date;
}

export const FhirResourceSchema = SchemaFactory.createForClass(FhirResource); 