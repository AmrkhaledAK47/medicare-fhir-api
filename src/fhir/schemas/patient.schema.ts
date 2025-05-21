import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
    BaseResource,
    FhirResourceDocument,
    HumanName,
    ContactPoint,
    Address,
    CodeableConcept,
    FhirReference,
    Identifier
} from './resource.schema';

export type PatientDocument = Patient & Document;

@Schema({
    timestamps: true,
    collection: 'patients',
})
export class Patient {
    _id?: any;

    @Prop({ required: true, default: 'Patient' })
    resourceType: string;

    @Prop({ type: String })
    userId?: string;

    @Prop({ type: Boolean, default: true })
    active: boolean;

    @Prop({
        type: [{
            use: String,
            family: String,
            given: [String],
            prefix: [String],
            suffix: [String]
        }]
    })
    name: Array<{
        use?: string;
        family?: string;
        given?: string[];
        prefix?: string[];
        suffix?: string[];
    }>;

    @Prop({ type: String })
    gender?: string;

    @Prop({ type: Date })
    birthDate?: Date;

    @Prop({
        type: [{
            use: String,
            type: {
                coding: [{
                    system: String,
                    code: String,
                    display: String
                }]
            },
            value: String,
            period: {
                start: Date,
                end: Date
            }
        }]
    })
    telecom?: Array<{
        use?: string;
        type?: {
            coding?: Array<{
                system?: string;
                code?: string;
                display?: string;
            }>;
        };
        value?: string;
        period?: {
            start?: Date;
            end?: Date;
        };
    }>;

    @Prop({
        type: [{
            use: String,
            type: String,
            line: [String],
            city: String,
            state: String,
            postalCode: String,
            country: String,
            period: {
                start: Date,
                end: Date
            }
        }]
    })
    address?: Array<{
        use?: string;
        type?: string;
        line?: string[];
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        period?: {
            start?: Date;
            end?: Date;
        };
    }>;

    @Prop({
        type: [{
            relationship: [{
                coding: [{
                    system: String,
                    code: String,
                    display: String
                }]
            }],
            name: {
                use: String,
                family: String,
                given: [String]
            },
            telecom: [{
                system: String,
                value: String
            }],
            address: {
                use: String,
                line: [String],
                city: String,
                state: String,
                postalCode: String,
                country: String
            },
            gender: String,
            period: {
                start: Date,
                end: Date
            }
        }]
    })
    contact?: Array<{
        relationship?: Array<{
            coding?: Array<{
                system?: string;
                code?: string;
                display?: string;
            }>;
        }>;
        name?: {
            use?: string;
            family?: string;
            given?: string[];
        };
        telecom?: Array<{
            system?: string;
            value?: string;
        }>;
        address?: {
            use?: string;
            line?: string[];
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
        };
        gender?: string;
        period?: {
            start?: Date;
            end?: Date;
        };
    }>;

    @Prop({ type: MongooseSchema.Types.Mixed })
    extension?: any[];

    /**
     * Convert to FHIR format
     */
    toFhirResource(): any {
        const id = (this as any)._id?.toString();

        const resource = {
            resourceType: 'Patient',
            id,
            active: this.active,
            name: this.name,
            gender: this.gender,
            birthDate: this.birthDate ? this.birthDate.toISOString().split('T')[0] : undefined,
            telecom: this.telecom,
            address: this.address,
            contact: this.contact,
            extension: this.extension,
            meta: {
                lastUpdated: new Date().toISOString()
            }
        };

        // Remove undefined fields
        return JSON.parse(JSON.stringify(resource));
    }
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Create indexes for common queries
PatientSchema.index({ 'name.family': 1, 'name.given': 1 });
PatientSchema.index({ birthDate: 1 });
PatientSchema.index({ gender: 1 });
PatientSchema.index({ userId: 1 }, { unique: true, sparse: true }); 