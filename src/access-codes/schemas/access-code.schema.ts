import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AccessCodeRole {
    ADMIN = 'admin',
    PRACTITIONER = 'practitioner',
    PATIENT = 'patient'
}

export type AccessCodeDocument = AccessCode & Document;

@Schema({ timestamps: true })
export class AccessCode {
    @Prop({ required: true, unique: true })
    code: string;

    @Prop({ required: true, enum: AccessCodeRole })
    role: string;

    @Prop({ required: true, default: false })
    used: boolean;

    @Prop({ required: true, type: Date })
    expiresAt: Date;

    @Prop({ type: String, required: false })
    resourceId: string;

    @Prop({ type: String, required: false })
    resourceType: string;

    @Prop({ type: Date, required: false })
    usedAt: Date;

    @Prop({ type: String, required: false })
    usedBy: string;

    @Prop({ type: String, required: false })
    recipientEmail: string;
}

export const AccessCodeSchema = SchemaFactory.createForClass(AccessCode); 