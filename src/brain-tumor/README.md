# Brain Tumor Detection Module

This module provides brain tumor detection capabilities for the MediCare application using AI-powered image analysis.

## Features

- Upload brain MRI scans for tumor detection
- Automatic processing using Roboflow's Brain Tumor Detection API
- Storage of results in both MongoDB and FHIR format
- Role-based access control for patients, practitioners, and admins
- Thumbnail generation for quick previews
- Caching of results for improved performance

## API Endpoints

### Upload Brain Scan

```
POST /api/brain-tumor/upload
```

**Authentication:** Required (JWT Token)  
**Authorization:** All authenticated users  
**Content-Type:** `multipart/form-data`

**Request Parameters:**
- `file`: The brain MRI scan image file (JPEG, PNG)
- `patientId`: (Optional) FHIR Patient resource ID. If not provided and the user is a patient, their own ID will be used.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6123456789abcdef12345678",
    "patientId": "123456",
    "scanImagePath": "/brain-scans/1234567890-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1234567890-brain-scan.jpg",
    "status": "pending",
    "tumorDetected": false,
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-01T12:00:00.000Z"
  }
}
```

### Get Brain Scan by ID

```
GET /api/brain-tumor/:id
```

**Authentication:** Required (JWT Token)  
**Authorization:** Admins, practitioners, and the patient who owns the scan

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6123456789abcdef12345678",
    "patientId": "123456",
    "scanImagePath": "/brain-scans/1234567890-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1234567890-brain-scan.jpg",
    "status": "completed",
    "detectedAt": "2023-01-01T12:05:00.000Z",
    "tumorDetected": true,
    "tumorType": "glioma",
    "confidence": 0.95,
    "fhirObservationId": "789012",
    "fhirDiagnosticReportId": "345678",
    "tumorBoundingBox": [
      { "x": 100, "y": 120 },
      { "x": 150, "y": 120 },
      { "x": 150, "y": 170 },
      { "x": 100, "y": 170 }
    ],
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-01T12:05:00.000Z"
  }
}
```

### Get Brain Scans for a Patient

```
GET /api/brain-tumor/patient/:patientId
```

**Authentication:** Required (JWT Token)  
**Authorization:** Admins, practitioners, and the patient who owns the scans

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6123456789abcdef12345678",
      "patientId": "123456",
      "scanImagePath": "/brain-scans/1234567890-brain-scan.jpg",
      "thumbnailPath": "/brain-scans/thumbnails/thumb-1234567890-brain-scan.jpg",
      "status": "completed",
      "detectedAt": "2023-01-01T12:05:00.000Z",
      "tumorDetected": true,
      "tumorType": "glioma",
      "confidence": 0.95,
      "fhirObservationId": "789012",
      "fhirDiagnosticReportId": "345678",
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:05:00.000Z"
    }
  ]
}
```

### Delete Brain Scan

```
DELETE /api/brain-tumor/:id
```

**Authentication:** Required (JWT Token)  
**Authorization:** Admins and practitioners only

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Brain scan deleted successfully"
  }
}
```

## FHIR Integration

The module creates the following FHIR resources for each brain scan:

1. **Observation** - Contains the tumor detection results:
   - `valueBoolean`: Whether a tumor was detected
   - `component`: Tumor type and confidence score
   
2. **DiagnosticReport** - Contains the overall diagnostic report:
   - Links to the Observation resource
   - Includes a conclusion based on the detection results
   - References the brain scan image URL

## Setup

1. Ensure you have set the `ROBOFLOW_API_KEY` in your `.env` file:
   ```
   ROBOFLOW_API_KEY=your_api_key_here
   ```

2. Install the required dependencies:
   ```bash
   npm install sharp form-data @nestjs/axios axios
   ```
   
   Or run the provided update script:
   ```bash
   ./update-dependencies.sh
   ```

3. Restart the NestJS API service:
   ```bash
   docker-compose restart nest-api
   ```

## Tumor Types

The module can detect the following tumor types:

- **Glioma**: A type of tumor that occurs in the brain and spinal cord
- **Meningioma**: A tumor that forms on membranes that cover the brain and spinal cord
- **Pituitary**: A tumor that forms in the pituitary gland
- **No Tumor**: No tumor detected in the scan

## Technical Implementation

- Images are stored in the `/uploads/brain-scans` directory
- Thumbnails are stored in the `/uploads/brain-scans/thumbnails` directory
- Results are cached in Redis with a TTL of 1 hour
- Detection is performed asynchronously to avoid blocking the API
- FHIR resources are created automatically when detection is complete 