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

export type DiagnosticReportDocument = DiagnosticReport & FhirResourceDocument;

@Schema({
    timestamps: true,
    collection: 'diagnostic_reports',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
})
export class DiagnosticReport extends BaseResource {
    @Prop({ default: 'DiagnosticReport' })
    resourceType: string;

    @Prop({ type: [Object] })
    identifier?: Identifier[];

    @Prop({ type: [Object] })
    basedOn?: FhirReference[];

    @Prop({ type: String, required: true })
    status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';

    @Prop({ type: [Object] })
    category?: CodeableConcept[];

    @Prop({ type: Object, required: true })
    code: CodeableConcept;

    @Prop({ type: Object, required: true })
    subject: FhirReference;

    @Prop({ type: Object })
    encounter?: FhirReference;

    @Prop({ type: Date })
    effectiveDateTime?: Date;

    @Prop({ type: Object })
    effectivePeriod?: Period;

    @Prop({ type: Date })
    issued?: Date;

    @Prop({ type: [Object] })
    performer?: FhirReference[];

    @Prop({ type: [Object] })
    resultsInterpreter?: FhirReference[];

    @Prop({ type: [Object] })
    specimen?: FhirReference[];

    @Prop({ type: [Object] })
    result?: FhirReference[];

    @Prop({ type: [Object] })
    imagingStudy?: FhirReference[];

    @Prop({ type: [Object] })
    media?: {
        comment?: string;
        link: FhirReference;
    }[];

    @Prop({ type: String })
    conclusion?: string;

    @Prop({ type: [Object] })
    conclusionCode?: CodeableConcept[];

    @Prop({ type: [Object] })
    presentedForm?: {
        contentType?: string;
        language?: string;
        data?: string; // Base64
        url?: string;
        size?: number;
        hash?: string;
        title?: string;
        creation?: Date;
    }[];

    // Additional custom fields for quick access
    @Prop({ type: String })
    reportType?: string;

    @Prop({ type: String })
    urgencyLevel?: 'routine' | 'urgent' | 'stat' | 'asap';

    @Prop({ type: Boolean })
    abnormalFlag?: boolean;

    @Prop({ type: [String] })
    tags?: string[];
}

export const DiagnosticReportSchema = SchemaFactory.createForClass(DiagnosticReport);

// Create indexes for common search parameters
DiagnosticReportSchema.index({ status: 1 });
DiagnosticReportSchema.index({ 'subject.reference': 1 });
DiagnosticReportSchema.index({ 'encounter.reference': 1 });
DiagnosticReportSchema.index({ 'code.coding.code': 1 });
DiagnosticReportSchema.index({ 'category.coding.code': 1 });
DiagnosticReportSchema.index({ effectiveDateTime: 1 });
DiagnosticReportSchema.index({ issued: 1 });
DiagnosticReportSchema.index({ 'performer.reference': 1 });
DiagnosticReportSchema.index({ urgencyLevel: 1 });
DiagnosticReportSchema.index({ abnormalFlag: 1 });
DiagnosticReportSchema.index({ tags: 1 });
DiagnosticReportSchema.index({ conclusion: 'text' });

// Method to convert to FHIR format
DiagnosticReportSchema.methods.toFhirResource = function () {
    const obj = this.toJSON();
    // Add any transformations needed for FHIR compliance
    return obj;
}; 