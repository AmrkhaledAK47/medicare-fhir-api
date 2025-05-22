# FHIR Resources Reference

This document provides a comprehensive reference of FHIR resources, their usage within the MediCare application, and implementation status.

## Resource Categories

FHIR resources are organized into the following categories:

- **Foundation Resources**: Infrastructure resources that support other resources
- **Base Resources**: General-purpose resources with significant use
- **Clinical Resources**: Resources related to clinical care
- **Financial Resources**: Resources related to financial/billing concerns
- **Specialized Resources**: Resources for specific domains/use cases
- **Custom Resources**: Custom resources defined for our application

## Implementation Status

Each resource is marked with one of the following implementation statuses:

- **✅ Local**: Implemented as a local schema in MongoDB
- **🔄 External**: Managed by the external FHIR server
- **🔄/✅ Hybrid**: Can be managed locally or externally based on configuration
- **⏳ Planned**: Planned for future implementation
- **❌ Not Planned**: Not currently planned for implementation

## Foundation Resources

| Resource Name | Status | Description |
|---------------|--------|-------------|
| CapabilityStatement | 🔄 External | Represents server capabilities |
| OperationDefinition | 🔄 External | Defines operations supported by the server |
| StructureDefinition | 🔄 External | Defines the structure of resources |
| ValueSet | 🔄 External | Defines a set of codes from different systems |
| CodeSystem | 🔄 External | Defines a set of codes and their meanings |
| SearchParameter | 🔄 External | Defines search parameters for resources |

## Base Resources

| Resource Name | Status | Description |
|---------------|--------|-------------|
| Patient | ✅ Local | Person receiving healthcare services |
| Practitioner | ✅ Local | Person with a formal responsibility in healthcare |
| Organization | ✅ Local | Group of people or organizations with a common purpose |
| Encounter | ✅ Local | Interaction between patient and healthcare provider(s) |
| Observation | ✅ Local | Measurements and assertions about a patient |
| DiagnosticReport | ✅ Local | Results of diagnostic investigations |
| Medication | ✅ Local | Definition of a medication |
| MedicationRequest | ⏳ Planned | Prescription of a medication |
| AllergyIntolerance | 🔄 External | Records of allergies and intolerances |
| Condition | 🔄 External | Clinical conditions, problems, diagnoses |
| Procedure | 🔄 External | Record of procedures performed |
| Immunization | 🔄 External | Record of immunizations given |
| CarePlan | 🔄 External | Healthcare plan for a patient |
| Goal | 🔄 External | Desired outcome for a patient |
| ServiceRequest | 🔄 External | Request for a service to be performed |
| Device | 🔄 External | Physical objects used in healthcare |

## Clinical Resources

| Resource Name | Status | Description |
|---------------|--------|-------------|
| AdverseEvent | 🔄 External | Undesirable events that occur during care |
| ClinicalImpression | 🔄 External | Assessment and plan for a patient |
| FamilyMemberHistory | 🔄 External | Family health history |
| MedicationAdministration | 🔄 External | Record of medication being administered |
| MedicationDispense | 🔄 External | Record of medication being dispensed |
| MedicationStatement | 🔄 External | Record of medication being taken |
| RiskAssessment | 🔄 External | Assessment of risk for a patient |
| CareTeam | 🔄 External | Group of practitioners caring for a patient |
| DocumentReference | 🔄 External | Reference to a document |
| ImagingStudy | 🔄 External | Details of an imaging study |

## Financial Resources

| Resource Name | Status | Description |
|---------------|--------|-------------|
| Coverage | 🔄 External | Insurance or payment information |
| ClaimResponse | 🔄 External | Response to a claim |
| ExplanationOfBenefit | 🔄 External | Claims and adjudication details |
| Account | 🔄 External | Financial account for charges/payments |
| ChargeItem | 🔄 External | Item charging to be performed |
| Invoice | 🔄 External | List of charge items |
| Payment | ✅ Local | Custom resource for payments |
| PaymentReconciliation | 🔄 External | Details of payments |

## Specialized Resources

| Resource Name | Status | Description |
|---------------|--------|-------------|
| Questionnaire | ✅ Local | Organized collection of questions |
| QuestionnaireResponse | ⏳ Planned | Response to a questionnaire |
| Schedule | ⏳ Planned | Container for slots of time |
| Slot | ⏳ Planned | Time slot when a service is available |
| Appointment | ⏳ Planned | Booking of a healthcare event |
| AppointmentResponse | ⏳ Planned | Response to an appointment request |
| Consent | 🔄 External | Privacy consent statements |
| ResearchStudy | ❌ Not Planned | Research study definition |
| ResearchSubject | ❌ Not Planned | Subject in a research study |

## API Implementation Details

### Local Resource Access

Local resources are accessible through standard RESTful endpoints:

```
GET /api/fhir/Patient
GET /api/fhir/Patient/{id}
POST /api/fhir/Patient
PUT /api/fhir/Patient/{id}
DELETE /api/fhir/Patient/{id}
```

### External Resource Access

External resources are accessed through the same API interface, but requests are proxied to the configured FHIR server:

```
GET /api/fhir/AllergyIntolerance
GET /api/fhir/AllergyIntolerance/{id}
POST /api/fhir/AllergyIntolerance
PUT /api/fhir/AllergyIntolerance/{id}
DELETE /api/fhir/AllergyIntolerance/{id}
```

### Transaction Support

Bundle transactions are supported for both local and external resources:

```
POST /api/fhir
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [...]
}
```

## Search Parameters

Each resource supports standard FHIR search parameters. The most common parameters include:

- `_id`: Resource logical ID
- `_lastUpdated`: Date last updated
- `_tag`: Resource tags
- `_profile`: Profiles the resource claims to conform to
- `_security`: Security labels applied to the resource
- `_text`: Text search against the narrative

Resource-specific search parameters are available based on the resource type. For example:

- Patient: `name`, `family`, `given`, `identifier`, `gender`, `birthdate`, etc.
- Encounter: `status`, `patient`, `date`, `type`, etc.

## Extensions

Custom extensions are supported for all resources. Key extensions include:

- `http://healthcare.example.org/fhir/StructureDefinition/payment-method`: Payment method extension
- `http://healthcare.example.org/fhir/StructureDefinition/recurring-appointment`: Recurring appointment pattern

## Resource Validation

Resources are validated against:

1. Base FHIR structural requirements
2. Profile-specific requirements when applicable
3. Business rules implemented in the application

## Notes on Custom Resources

Custom resources like `Payment` follow FHIR resource patterns but may not be compatible with all FHIR servers. They are primarily designed for internal use within the MediCare application. 