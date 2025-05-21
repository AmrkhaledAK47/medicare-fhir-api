// Export all schema types
export * from './fhir-resource.schema';
export * from './patient.schema';
export * from './practitioner.schema';
export * from './organization.schema';
export * from './encounter.schema';
export * from './observation.schema';
export * from './diagnostic-report.schema';
export * from './medication.schema';
export * from './questionnaire.schema';
export * from './payment.schema';

// Map resource types to their document types for easier typing in services
import { PatientDocument } from './patient.schema';
import { PractitionerDocument } from './practitioner.schema';
import { OrganizationDocument } from './organization.schema';
import { EncounterDocument } from './encounter.schema';
import { ObservationDocument } from './observation.schema';
import { DiagnosticReportDocument } from './diagnostic-report.schema';
import { MedicationDocument } from './medication.schema';
import { QuestionnaireDocument } from './questionnaire.schema';
import { PaymentDocument } from './payment.schema';

// Resource type to document type mapping
export type MapToFhirResource<T extends string> =
    T extends 'Patient' ? PatientDocument :
    T extends 'Practitioner' ? PractitionerDocument :
    T extends 'Organization' ? OrganizationDocument :
    T extends 'Encounter' ? EncounterDocument :
    T extends 'Observation' ? ObservationDocument :
    T extends 'DiagnosticReport' ? DiagnosticReportDocument :
    T extends 'Medication' ? MedicationDocument :
    T extends 'Questionnaire' ? QuestionnaireDocument :
    T extends 'Payment' ? PaymentDocument :
    never;

// Utility type to get all resource types
export type FhirResourceType =
    | 'Patient'
    | 'Practitioner'
    | 'Organization'
    | 'Encounter'
    | 'Observation'
    | 'DiagnosticReport'
    | 'Medication'
    | 'Questionnaire'
    | 'Payment'; 