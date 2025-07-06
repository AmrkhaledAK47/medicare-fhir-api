# Biomarker LOINC Codes Reference

This document provides a reference for the LOINC codes used for biomarker data in the MediCare dashboard.

## Overview

The dashboard displays biomarker data in several categories. Each category maps to specific LOINC codes that are used to retrieve data from the FHIR server.

## Biomarker Categories and LOINC Codes

| Biomarker Type | Description | LOINC Codes | Normal Range | Unit |
|---------------|-------------|-------------|--------------|------|
| **heart** | Blood Pressure | 8480-6 (Systolic)<br>8462-4 (Diastolic) | 90-120<br>60-80 | mmHg<br>mmHg |
| **kidney** | Kidney Function | 2160-0 (Creatinine) | 0.7-1.3 | mg/dL |
| **liver** | Liver Function | 1920-8 (AST)<br>1742-6 (ALT) | 10-40<br>7-56 | U/L<br>U/L |
| **sugar** | Blood Sugar | 2345-7 (Glucose) | 70-100 | mg/dL |
| **blood** | Blood Count | 718-7 (Hemoglobin)<br>789-8 (RBC) | 12-16<br>4.2-5.4 | g/dL<br>10^12/L |
| **thyroid** | Thyroid Function | 3024-7 (Thyroxine)<br>3016-3 (TSH) | 5.0-12.0<br>0.4-4.0 | ug/dL<br>mIU/L |
| **bone** | Bone Density | 38483-4 (Bone Density) | > -1.0 | SD |

## Implementation Details

### Retrieving Biomarker Data

The biomarker data is retrieved from the FHIR server using the following search parameters:

```
GET /Observation?patient=[patientId]&code=[loincCodes]&_sort=-date&_count=10&status=final,amended,corrected
```

### Mapping to UI Components

The biomarker data is mapped to UI components based on the LOINC code. Each biomarker card in the UI corresponds to one or more LOINC codes.

### Status Determination

The status of a biomarker is determined by comparing the value to the normal range:

- **normal**: Value is within the normal range
- **high**: Value is above the normal range
- **low**: Value is below the normal range
- **critical**: Value is significantly outside the normal range
- **unknown**: No data available or status cannot be determined

## Example Biomarker Response

```json
{
  "type": "heart",
  "name": "Systolic blood pressure",
  "value": "128",
  "unit": "mmHg",
  "referenceRange": "90-120",
  "status": "normal",
  "date": "2025-07-01T08:30:00Z"
}
```

## Additional Resources

- [LOINC Official Website](https://loinc.org/)
- [FHIR Observation Resource](https://www.hl7.org/fhir/observation.html) 