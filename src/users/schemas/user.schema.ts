import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcrypt';

export enum UserRole {
    ADMIN = 'admin',
    PATIENT = 'patient',
    PRACTITIONER = 'practitioner',
}

export enum UserStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

// Define interface for User methods
export interface UserMethods {
    verifyAccessCode(accessCode: string): boolean;
    verifyResetCode(resetCode: string): boolean;
}

// Combine Document with our methods
export type UserDocument = User & Document & UserMethods;

@Schema({
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password;
            delete ret.accessCode;
            delete ret.resetCode;
            return ret;
        },
    },
})
export class User {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ enum: UserRole, default: UserRole.PATIENT })
    role: UserRole;

    @Prop({ enum: UserStatus, default: UserStatus.PENDING })
    status: UserStatus;

    @Prop({ type: String, required: false })
    accessCode: string;

    @Prop({ type: String, required: false })
    phone: string;

    @Prop({ type: String, required: false })
    profileImageUrl: string;

    @Prop({ type: String, required: false })
    fhirResourceId: string;

    @Prop({ type: String, required: false })
    fhirResourceType: string;

    @Prop({ type: Date, required: false })
    accessCodeExpires: Date;

    @Prop({ type: String, required: false })
    resetCode: string;

    @Prop({ type: Date, required: false })
    resetCodeExpires: Date;

    @Prop({ type: Boolean, default: false })
    isEmailVerified: boolean;

    @Prop({ type: [String], default: [] })
    permissions: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to verify access code
UserSchema.methods.verifyAccessCode = function (accessCode: string): boolean {
    return this.accessCode === accessCode &&
        this.accessCodeExpires > new Date();
};

// Method to verify reset code
UserSchema.methods.verifyResetCode = function (resetCode: string): boolean {
    return this.resetCode === resetCode &&
        this.resetCodeExpires > new Date();
}; 