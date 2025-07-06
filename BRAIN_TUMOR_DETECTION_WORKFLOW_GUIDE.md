# Brain Tumor Detection Workflow Guide

This guide provides visual workflows for both patients and practitioners using the Brain Tumor Detection API. It illustrates the step-by-step process for uploading, analyzing, and reviewing brain MRI scans.

## Patient Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│   Patient       │     │   Upload        │     │   Processing    │     │   View          │
│   Login         │────▶│   Brain Scan    │────▶│   (Automatic)   │────▶│   Results       │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                                              │
                                                                              │
                                                                              ▼
                                                                        ┌─────────────────┐
                                                                        │                 │
                                                                        │   View Scan     │
                                                                        │   History       │
                                                                        │                 │
                                                                        └─────────────────┘
```

### 1. Patient Login
- Patient logs in with their credentials
- System authenticates and retrieves their FHIR Patient resource ID
- JWT token is stored for subsequent API calls

### 2. Upload Brain Scan
- Patient accesses the upload interface
- Selects a brain MRI scan image from their device
- Submits the image for analysis
- System automatically associates the scan with the patient's ID

### 3. Processing (Automatic)
- System processes the image using the AI model
- Detects presence of tumors and classifies them into types:
  - Glioma
  - Meningioma
  - Pituitary
  - No tumor (normal)
- Creates FHIR Observation and DiagnosticReport resources
- Updates the brain scan record with results

### 4. View Results
- Patient views the detailed analysis results
- Results include:
  - Tumor detection status
  - Tumor type (if detected)
  - Confidence level
  - Visualization of tumor location
  - Links to FHIR resources

### 5. View Scan History
- Patient can access their historical scan records
- Compare results over time
- Track changes in tumor status

## Practitioner Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│   Practitioner  │     │   Select        │     │   Upload        │     │   Processing    │
│   Login         │────▶│   Patient       │────▶│   Brain Scan    │────▶│   (Automatic)   │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                                              │
                                                                              │
                                                                              ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│   Manage        │◀────│   View Patient  │◀────│   Review FHIR   │◀────│   Review        │
│   Scans         │     │   History       │     │   Resources     │     │   Results       │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1. Practitioner Login
- Practitioner logs in with their credentials
- System authenticates and grants appropriate permissions
- JWT token is stored for subsequent API calls

### 2. Select Patient
- Practitioner searches for or selects a patient from their list
- System retrieves the patient's FHIR resource ID
- Practitioner can view patient's medical history and previous scans

### 3. Upload Brain Scan
- Practitioner uploads a brain MRI scan for the selected patient
- System associates the scan with the specified patient ID
- Initial response includes a scan ID with pending status

### 4. Processing (Automatic)
- Same as patient workflow
- System processes the image using the AI model
- Classifies tumors and creates FHIR resources

### 5. Review Results
- Practitioner views the detailed analysis results
- Results include the same information as in the patient workflow
- Practitioner can add notes or interpretations

### 6. Review FHIR Resources
- Practitioner can access the generated FHIR resources
- View Observation and DiagnosticReport details
- Integrate findings with other patient data

### 7. View Patient History
- Practitioner can view all historical scans for the patient
- Compare results across different scans
- Track progression or regression of tumors

### 8. Manage Scans
- Practitioner can delete scans if needed
- Update metadata or add clinical notes
- Organize patient's scan records

## Implementation Sequence Diagram

### Upload and Processing Flow

```
┌─────────┐          ┌─────────┐          ┌─────────────┐          ┌──────────┐          ┌──────────┐
│         │          │         │          │             │          │          │          │          │
│ Client  │          │ API     │          │ AI Model    │          │ MongoDB  │          │ FHIR     │
│         │          │         │          │             │          │          │          │ Server   │
└────┬────┘          └────┬────┘          └──────┬──────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                      │                     │
     │ POST /brain-tumor/upload                  │                      │                     │
     │ with image file     │                     │                      │                     │
     │ & patientId         │                     │                      │                     │
     │ ─────────────────────>                    │                      │                     │
     │                     │                     │                      │                     │
     │                     │ Create brain scan   │                      │                     │
     │                     │ record (pending)    │                      │                     │
     │                     │ ──────────────────────────────────────────>│                     │
     │                     │                     │                      │                     │
     │ 200 OK with scanId  │                     │                      │                     │
     │ <─────────────────────                    │                      │                     │
     │                     │                     │                      │                     │
     │                     │ Process image       │                      │                     │
     │                     │ asynchronously      │                      │                     │
     │                     │ ────────────────────>                      │                     │
     │                     │                     │                      │                     │
     │                     │                     │ Analyze image        │                     │
     │                     │                     │ Detect tumor         │                     │
     │                     │                     │ Classify type        │                     │
     │                     │                     │ ──────┐              │                     │
     │                     │                     │       │              │                     │
     │                     │                     │ <─────┘              │                     │
     │                     │                     │                      │                     │
     │                     │ Return results      │                      │                     │
     │                     │ <────────────────────                      │                     │
     │                     │                     │                      │                     │
     │                     │ Update brain scan   │                      │                     │
     │                     │ record (completed)  │                      │                     │
     │                     │ ──────────────────────────────────────────>│                     │
     │                     │                     │                      │                     │
     │                     │ Create FHIR         │                      │                     │
     │                     │ Observation         │                      │                     │
     │                     │ ───────────────────────────────────────────────────────────────>│
     │                     │                     │                      │                     │
     │                     │ Return ObservationId│                      │                     │
     │                     │ <───────────────────────────────────────────────────────────────│
     │                     │                     │                      │                     │
     │                     │ Create FHIR         │                      │                     │
     │                     │ DiagnosticReport    │                      │                     │
     │                     │ ───────────────────────────────────────────────────────────────>│
     │                     │                     │                      │                     │
     │                     │ Return DiagnosticReportId                  │                     │
     │                     │ <───────────────────────────────────────────────────────────────│
     │                     │                     │                      │                     │
     │                     │ Update brain scan   │                      │                     │
     │                     │ with FHIR IDs       │                      │                     │
     │                     │ ──────────────────────────────────────────>│                     │
     │                     │                     │                      │                     │
     │ GET /brain-tumor/:id│                     │                      │                     │
     │ (poll for results)  │                     │                      │                     │
     │ ─────────────────────>                    │                      │                     │
     │                     │                     │                      │                     │
     │                     │ Fetch brain scan    │                      │                     │
     │                     │ ──────────────────────────────────────────>│                     │
     │                     │                     │                      │                     │
     │                     │ Return scan data    │                      │                     │
     │                     │ <──────────────────────────────────────────│                     │
     │                     │                     │                      │                     │
     │ 200 OK with results │                     │                      │                     │
     │ <─────────────────────                    │                      │                     │
     │                     │                     │                      │                     │
```

## Tumor Type Classification

The Brain Tumor Detection API can identify the following types of brain conditions:

### 1. Glioma
- **Description**: A tumor that occurs in the brain and spinal cord, beginning in glial cells that surround and support neurons
- **Characteristics**: Can be low-grade (slow-growing) or high-grade (fast-growing)
- **Visual Appearance**: Often appears as an irregular, infiltrative mass with surrounding edema

### 2. Meningioma
- **Description**: A tumor that arises from the meninges — the membranes that surround the brain and spinal cord
- **Characteristics**: Usually benign and slow-growing
- **Visual Appearance**: Typically appears as a well-defined, extra-axial mass with a broad dural base

### 3. Pituitary Tumor
- **Description**: A tumor that forms in the pituitary gland at the base of the brain
- **Characteristics**: Usually benign and may cause hormonal imbalances
- **Visual Appearance**: Appears as a well-defined mass in the sellar/suprasellar region

### 4. No Tumor (Normal)
- **Description**: Normal brain tissue with no detectable tumor
- **Characteristics**: Normal brain anatomy and signal intensity
- **Visual Appearance**: Regular brain structures without abnormal masses or signal changes

## Integration Checklist

### Frontend Development
- [ ] Implement authentication flow
- [ ] Create scan upload component
- [ ] Build results polling mechanism
- [ ] Develop results visualization interface
- [ ] Create patient history view
- [ ] Implement practitioner patient selection
- [ ] Add scan management features
- [ ] Integrate error handling

### Testing
- [ ] Test with various image types and sizes
- [ ] Verify tumor detection accuracy
- [ ] Test role-based access control
- [ ] Validate FHIR resource creation
- [ ] Test error scenarios and handling
- [ ] Perform end-to-end workflow testing

### Deployment
- [ ] Configure API endpoints for production
- [ ] Set up proper authentication
- [ ] Implement secure token storage
- [ ] Configure image upload limits
- [ ] Set up monitoring for API calls
- [ ] Document API versioning and changes 