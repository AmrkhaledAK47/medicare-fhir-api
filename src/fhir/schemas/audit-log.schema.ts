import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
    timestamps: true,
    collection: 'audit_logs',
})
export class AuditLog {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true, type: Date, default: Date.now })
    timestamp: Date;

    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true })
    userRole: string;

    @Prop({ required: true })
    ipAddress: string;

    @Prop({ required: true })
    action: string;

    @Prop({ required: true, index: true })
    resourceType: string;

    @Prop({ required: true, index: true })
    resourceId: string;

    @Prop({ required: true })
    status: number;

    @Prop({ required: true })
    details: string;

    @Prop({ type: Object, required: false })
    additionalData?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Create compound indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 }); 