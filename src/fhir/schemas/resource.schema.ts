import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

/**
 * Base Resource schema following FHIR resource structure
 * All FHIR resources inherit from this base structure
 */
export class BaseResource {
    @Prop({ required: true, index: true })
    resourceType: string;

    @Prop({ type: String })
    id?: string;

    @Prop({ type: Object })
    meta?: {
        versionId?: string;
        lastUpdated?: Date;
        source?: string;
        profile?: string[];
        security?: {
            system: string;
            code: string;
            display?: string;
        }[];
        tag?: {
            system?: string;
            code: string;
            display?: string;
        }[];
    };

    @Prop({ type: String })
    implicitRules?: string;

    @Prop({ type: String })
    language?: string;

    @Prop({ type: Object })
    text?: {
        status: 'generated' | 'extensions' | 'additional' | 'empty';
        div: string; // XHTML content
    };

    @Prop({ type: [Object] })
    contained?: any[];

    @Prop({ type: [Object] })
    extension?: {
        url: string;
        valueString?: string;
        valueInteger?: number;
        valueBoolean?: boolean;
        valueDateTime?: Date;
        valueReference?: {
            reference: string;
            display?: string;
        };
        // Other value types can be added as needed
    }[];

    @Prop({ type: [Object] })
    modifierExtension?: {
        url: string;
        valueString?: string;
        valueInteger?: number;
        valueBoolean?: boolean;
        valueDateTime?: Date;
        valueReference?: {
            reference: string;
            display?: string;
        };
    }[];
}

/**
 * Common interface for all FHIR resource documents
 */
export interface FhirResourceDocument extends Document {
    id: string;
    resourceType: string;
    meta?: {
        versionId?: string;
        lastUpdated?: Date;
    };
    // Common methods
    toFhirResource(): any;
}

/**
 * FHIR Reference type for linking resources
 */
export class FhirReference {
    @Prop({ type: String })
    reference: string; // e.g., "Patient/123" or "Practitioner/456"

    @Prop({ type: String })
    type?: string;

    @Prop({ type: String })
    display?: string;
}

/**
 * FHIR Human Name type
 */
export class HumanName {
    @Prop({ type: String })
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';

    @Prop({ type: String })
    text?: string;

    @Prop({ type: String })
    family?: string;

    @Prop({ type: [String] })
    given?: string[];

    @Prop({ type: [String] })
    prefix?: string[];

    @Prop({ type: [String] })
    suffix?: string[];

    @Prop({ type: Object })
    period?: {
        start?: Date;
        end?: Date;
    };
}

/**
 * FHIR ContactPoint type
 */
export class ContactPoint {
    @Prop({ type: String })
    system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';

    @Prop({ type: String })
    value?: string;

    @Prop({ type: String })
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';

    @Prop({ type: Number })
    rank?: number;

    @Prop({ type: Object })
    period?: {
        start?: Date;
        end?: Date;
    };
}

/**
 * FHIR Address type
 */
export class Address {
    @Prop({ type: String })
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';

    @Prop({ type: String })
    type?: 'postal' | 'physical' | 'both';

    @Prop({ type: String })
    text?: string;

    @Prop({ type: [String] })
    line?: string[];

    @Prop({ type: String })
    city?: string;

    @Prop({ type: String })
    district?: string;

    @Prop({ type: String })
    state?: string;

    @Prop({ type: String })
    postalCode?: string;

    @Prop({ type: String })
    country?: string;

    @Prop({ type: Object })
    period?: {
        start?: Date;
        end?: Date;
    };
}

/**
 * FHIR CodeableConcept type
 */
export class CodeableConcept {
    @Prop({ type: [Object] })
    coding?: {
        system?: string;
        version?: string;
        code?: string;
        display?: string;
        userSelected?: boolean;
    }[];

    @Prop({ type: String })
    text?: string;
}

/**
 * FHIR Period type
 */
export class Period {
    @Prop({ type: Date })
    start?: Date;

    @Prop({ type: Date })
    end?: Date;
}

/**
 * FHIR Identifier type
 */
export class Identifier {
    @Prop({ type: String })
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';

    @Prop({ type: Object })
    type?: CodeableConcept;

    @Prop({ type: String })
    system?: string;

    @Prop({ type: String })
    value?: string;

    @Prop({ type: Object })
    period?: Period;

    @Prop({ type: Object })
    assigner?: FhirReference;
} 