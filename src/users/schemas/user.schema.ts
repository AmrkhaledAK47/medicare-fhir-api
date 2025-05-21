import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    DOCTOR = 'doctor',
    PATIENT = 'patient',
}

@Schema({
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password;
            return ret;
        },
    },
})
export class User extends Document {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ enum: UserRole, default: UserRole.USER })
    role: UserRole;
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