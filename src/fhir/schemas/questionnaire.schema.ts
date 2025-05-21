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

export type QuestionnaireDocument = Questionnaire & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'questionnaires',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class Questionnaire extends BaseResource {
    @Prop({ default: 'Questionnaire' })
    resourceType: string;

    @Prop({ type: String })
    url?: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: String })
    version?: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String })
    status: 'draft' | 'active' | 'retired' | 'unknown';

    @Prop({ type: Boolean })
    experimental?: boolean;

    @Prop({ type: Date })
    date?: Date;

    @Prop({ type: String })
    publisher?: string;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: String })
    purpose?: string;

    @Prop({ type: Date })
    approvalDate?: Date;

    @Prop({ type: Date })
    lastReviewDate?: Date;

    @Prop({ type: Object })
    effectivePeriod?: Period;

    @Prop({ type: [String] })
    useContext?: string[];

    @Prop({ type: [Object] })
    jurisdiction?: CodeableConcept[];

    @Prop({ type: [Object] })
    contact?: {
        name?: string;
        telecom?: {
            system?: string;
            value?: string;
            use?: string;
            rank?: number;
            period?: Period;
        }[];
    }[];

    @Prop({ type: String })
    copyright?: string;

    @Prop({ type: [Object] })
    code?: CodeableConcept[];

    @Prop({ type: String })
    subjectType?: string;

    @Prop({ type: [Object] })
    item?: QuestionnaireItemType[];

    // Additional custom fields
    @Prop({ type: String })
    category?: string;

    @Prop({ type: [String] })
    tags?: string[];

    @Prop({ type: Boolean })
    isPublic?: boolean;

    @Prop({ type: String })
    targetPopulation?: string;

    @Prop({ type: Number })
    estimatedTimeToComplete?: number; // in minutes

    @Prop({ type: String })
    createdBy?: string;
}

// Define complex QuestionnaireItem type
export class QuestionnaireItemType {
    @Prop({ type: String })
    linkId: string;

    @Prop({ type: Boolean })
    required?: boolean;

    @Prop({ type: [Object] })
    code?: CodeableConcept[];

    @Prop({ type: String })
    prefix?: string;

    @Prop({ type: String, required: true })
    text: string;

    @Prop({ type: String })
    type: 'group' | 'display' | 'boolean' | 'decimal' | 'integer' | 'date' | 'dateTime' |
        'time' | 'string' | 'text' | 'url' | 'choice' | 'open-choice' | 'attachment' |
        'reference' | 'quantity';

    @Prop({ type: [Object] })
    enableWhen?: {
        question: string;
        operator: string;
        answerBoolean?: boolean;
        answerDecimal?: number;
        answerInteger?: number;
        answerDate?: Date;
        answerDateTime?: Date;
        answerTime?: string;
        answerString?: string;
        answerReference?: FhirReference;
    }[];

    @Prop({ type: String })
    enableBehavior?: 'all' | 'any';

    @Prop({ type: Boolean })
    repeats?: boolean;

    @Prop({ type: Boolean })
    readOnly?: boolean;

    @Prop({ type: Number })
    maxLength?: number;

    @Prop({ type: Object })
    answerValueSet?: FhirReference;

    @Prop({ type: [Object] })
    answerOption?: {
        valueInteger?: number;
        valueDate?: Date;
        valueTime?: string;
        valueString?: string;
        valueBoolean?: boolean;
        valueDecimal?: number;
        valueReference?: FhirReference;
    }[];

    @Prop({ type: [Object] })
    initial?: {
        valueBoolean?: boolean;
        valueDecimal?: number;
        valueInteger?: number;
        valueDate?: Date;
        valueDateTime?: Date;
        valueTime?: string;
        valueString?: string;
        valueUri?: string;
    }[];

    @Prop({ type: [Object] })
    item?: QuestionnaireItemType[];
}

export const QuestionnaireSchema = SchemaFactory.createForClass(Questionnaire);

// Create indexes for common search parameters
QuestionnaireSchema.index({ title: 'text', description: 'text' });
QuestionnaireSchema.index({ status: 1 });
QuestionnaireSchema.index({ publisher: 1 });
QuestionnaireSchema.index({ name: 1 });
QuestionnaireSchema.index({ category: 1 });
QuestionnaireSchema.index({ tags: 1 });
QuestionnaireSchema.index({ isPublic: 1 });
QuestionnaireSchema.index({ date: 1 });

// Method to convert to FHIR format
QuestionnaireSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 