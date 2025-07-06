import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum DetectionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum TumorType {
    NO_TUMOR = 'no_tumor',
    GLIOMA = 'glioma',
    MENINGIOMA = 'meningioma',
    PITUITARY = 'pituitary',
    OTHER = 'other',
}

@Schema({ timestamps: true })
export class BrainScan extends Document {
    @Prop({ required: true })
    patientId: string;

    @Prop({ required: true })
    scanImagePath: string;

    @Prop()
    thumbnailPath?: string;

    @Prop({ default: DetectionStatus.PENDING })
    status: DetectionStatus;

    @Prop()
    detectedAt?: Date;

    @Prop({ type: Boolean, default: false })
    tumorDetected: boolean;

    @Prop({ type: String, enum: Object.values(TumorType) })
    tumorType?: TumorType;

    @Prop({ type: Number, min: 0, max: 1 })
    confidence?: number;

    @Prop({ type: Object })
    detectionResult?: Record<string, any>;

    @Prop()
    fhirObservationId?: string;

    @Prop()
    fhirDiagnosticReportId?: string;

    @Prop()
    errorMessage?: string;

    @Prop({ type: [{ x: Number, y: Number }] })
    tumorBoundingBox?: { x: number; y: number }[];

    @Prop({ type: MongooseSchema.Types.Mixed })
    metadata?: Record<string, any>;
}

export const BrainScanSchema = SchemaFactory.createForClass(BrainScan); 