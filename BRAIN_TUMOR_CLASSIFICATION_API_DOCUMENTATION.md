# Brain Tumor Classification API Documentation

## Overview

The Brain Tumor Classification API provides a sophisticated solution for detecting and classifying brain tumors from MRI scans. This API leverages state-of-the-art artificial intelligence to identify four specific types of brain conditions:

1. **Glioma** - A type of tumor that occurs in the brain and spinal cord
2. **Meningioma** - A tumor that arises from the meninges (membranes surrounding the brain and spinal cord)
3. **Pituitary** - A tumor that forms in the pituitary gland
4. **No Tumor** - Normal brain tissue with no tumor detected

The API integrates seamlessly with FHIR (Fast Healthcare Interoperability Resources) standards, storing results as proper medical observations and diagnostic reports for interoperability with healthcare systems.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
   - [Upload Brain Scan](#upload-brain-scan)
   - [Get Brain Scan by ID](#get-brain-scan-by-id)
   - [Get Patient Brain Scans](#get-patient-brain-scans)
   - [Delete Brain Scan](#delete-brain-scan)
3. [Role-Based Access](#role-based-access)
4. [FHIR Integration](#fhir-integration)
5. [Implementation Guide](#implementation-guide)
   - [Patient Workflow](#patient-workflow)
   - [Practitioner Workflow](#practitioner-workflow)
6. [Frontend Integration Examples](#frontend-integration-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Authentication

All API endpoints require authentication using JWT tokens. Authentication follows these steps:

1. Obtain a JWT token by logging in through the `/api/auth/login` endpoint
2. Include the token in the Authorization header for all subsequent requests
3. Different user roles (patient, practitioner, admin) have different access permissions

**Example: Authentication Request**

```javascript
const authenticate = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token for future requests
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('userRole', data.data.user.role);
      localStorage.setItem('userId', data.data.user.id);
      localStorage.setItem('fhirResourceId', data.data.user.fhirResourceId);
      return data.data;
    } else {
      throw new Error(data.error?.message || 'Authentication failed');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};
```

## API Endpoints

### Upload Brain Scan

**Endpoint:** `POST /api/brain-tumor/upload`

**Description:** Upload a brain MRI scan for tumor detection and classification.

**Authentication:** Required

**Request Parameters:**
- `patientId` (query parameter): FHIR Patient resource ID. Required for practitioners uploading on behalf of patients. For patients, this is optional as the system will use their own ID.

**Request Body:**
- `file` (form-data): The brain MRI scan image file (JPEG, PNG)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6868a12e5efd7c3bd784a0c5",
    "patientId": "422",
    "scanImagePath": "/brain-scans/1751687470534-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-brain-scan.jpg",
    "status": "pending",
    "tumorDetected": false,
    "tumorBoundingBox": [],
    "createdAt": "2025-07-05T03:51:10.553Z",
    "updatedAt": "2025-07-05T03:51:10.553Z"
  }
}
```

**Notes:**
- The initial response will have `status: "pending"` as the image analysis happens asynchronously
- The frontend should poll the Get Brain Scan by ID endpoint to check for completion

### Get Brain Scan by ID

**Endpoint:** `GET /api/brain-tumor/:id`

**Description:** Retrieve a specific brain scan by its ID, including detection results if processing is complete.

**Authentication:** Required

**Path Parameters:**
- `id`: The brain scan ID

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6868a12e5efd7c3bd784a0c5",
    "patientId": "422",
    "scanImagePath": "/brain-scans/1751687470534-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-brain-scan.jpg",
    "status": "completed",
    "tumorDetected": true,
    "tumorType": "glioma",
    "confidence": 0.9958773851394653,
    "tumorBoundingBox": [
      {"x": 120, "y": 145},
      {"x": 180, "y": 145},
      {"x": 180, "y": 210},
      {"x": 120, "y": 210}
    ],
    "detectedAt": "2025-07-05T03:51:13.743Z",
    "createdAt": "2025-07-05T03:51:10.553Z",
    "updatedAt": "2025-07-05T03:51:14.209Z",
    "fhirObservationId": "1252",
    "fhirDiagnosticReportId": "1253"
  }
}
```

### Get Patient Brain Scans

**Endpoint:** `GET /api/brain-tumor/patient/:patientId`

**Description:** Retrieve all brain scans for a specific patient.

**Authentication:** Required

**Path Parameters:**
- `patientId`: The FHIR Patient resource ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6868a12e5efd7c3bd784a0c5",
      "patientId": "422",
      "scanImagePath": "/brain-scans/1751687470534-brain-scan.jpg",
      "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-brain-scan.jpg",
      "status": "completed",
      "tumorDetected": true,
      "tumorType": "glioma",
      "confidence": 0.9958773851394653,
      "detectedAt": "2025-07-05T03:51:13.743Z",
      "createdAt": "2025-07-05T03:51:10.553Z",
      "updatedAt": "2025-07-05T03:51:14.209Z",
      "fhirObservationId": "1252",
      "fhirDiagnosticReportId": "1253"
    },
    {
      "_id": "6868b24f5efd7c3bd784a0c7",
      "patientId": "422",
      "scanImagePath": "/brain-scans/1751687890123-brain-scan2.jpg",
      "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687890123-brain-scan2.jpg",
      "status": "completed",
      "tumorDetected": true,
      "tumorType": "meningioma",
      "confidence": 0.8876543210987654,
      "detectedAt": "2025-07-05T04:12:23.456Z",
      "createdAt": "2025-07-05T04:11:30.123Z",
      "updatedAt": "2025-07-05T04:12:25.789Z",
      "fhirObservationId": "1254",
      "fhirDiagnosticReportId": "1255"
    }
  ]
}
```

### Delete Brain Scan

**Endpoint:** `DELETE /api/brain-tumor/:id`

**Description:** Delete a brain scan and its associated FHIR resources.

**Authentication:** Required (Practitioner or Admin role only)

**Path Parameters:**
- `id`: The brain scan ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Brain scan deleted successfully"
  }
}
```

## Role-Based Access

The API implements role-based access control to ensure data privacy and security:

### Patient Role
- Can upload brain scans for themselves only
- Can view only their own brain scans
- Cannot delete brain scans

### Practitioner Role
- Can upload brain scans for any patient
- Can view brain scans for all patients
- Can delete brain scans

### Admin Role
- Has all practitioner permissions
- Can manage system-wide settings

## FHIR Integration

The Brain Tumor Classification API automatically creates standardized FHIR resources for each processed scan:

### Observation Resource
- Contains detailed tumor detection results
- Includes tumor type (glioma, meningioma, pituitary, or no_tumor)
- Includes confidence score
- References the patient

**Example FHIR Observation:**
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "59772-4",
        "display": "Brain MRI Tumor Detection"
      }
    ],
    "text": "Brain MRI Tumor Detection"
  },
  "subject": {
    "reference": "Patient/422"
  },
  "effectiveDateTime": "2025-07-05T15:19:35.336Z",
  "issued": "2025-07-05T15:19:35.336Z",
  "performer": [
    {
      "display": "AI Tumor Detection System"
    }
  ],
  "valueBoolean": true,
  "interpretation": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          "code": "A",
          "display": "Abnormal"
        }
      ],
      "text": "Tumor detected"
    }
  ],
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "59776-5",
            "display": "Tumor Type"
          }
        ],
        "text": "Tumor Type"
      },
      "valueString": "glioma"
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "59777-3",
            "display": "Detection Confidence"
          }
        ],
        "text": "Detection Confidence"
      },
      "valueQuantity": {
        "value": 0.9958773851394653,
        "unit": "score",
        "system": "http://unitsofmeasure.org",
        "code": "1"
      }
    }
  ]
}
```

### DiagnosticReport Resource
- References the Observation resource
- Provides a clinical conclusion based on the detection results
- Includes links to the original image
- References the patient

**Example FHIR DiagnosticReport:**
```json
{
  "resourceType": "DiagnosticReport",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
          "code": "RAD",
          "display": "Radiology"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "42273-0",
        "display": "Brain MRI Diagnostic Report"
      }
    ],
    "text": "Brain MRI Diagnostic Report"
  },
  "subject": {
    "reference": "Patient/422"
  },
  "effectiveDateTime": "2025-07-05T15:19:35.336Z",
  "issued": "2025-07-05T15:19:35.657Z",
  "performer": [
    {
      "display": "AI Tumor Detection System"
    }
  ],
  "result": [
    {
      "reference": "Observation/1252"
    }
  ],
  "conclusion": "Brain tumor detected with 100% confidence. Type: glioma",
  "conclusionCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "429040005",
          "display": "Brain tumor finding"
        }
      ]
    }
  ],
  "media": [
    {
      "comment": "Brain MRI Scan"
    }
  ]
}
```

## Implementation Guide

### Patient Workflow

1. **Patient Login**
   - Patient authenticates using their credentials
   - System retrieves their FHIR Patient resource ID

2. **Upload Brain Scan**
   - Patient uploads their brain MRI scan
   - System automatically associates the scan with the patient's ID
   - Initial response includes a pending status

3. **Check Results**
   - Patient polls for results or receives notification when processing completes
   - Results show tumor detection status, type, and confidence level

4. **View History**
   - Patient can view all their previous brain scans
   - Results are displayed chronologically with thumbnails

### Practitioner Workflow

1. **Practitioner Login**
   - Practitioner authenticates using their credentials
   - System grants them access to patient data based on role

2. **Select Patient**
   - Practitioner searches for or selects a patient
   - System retrieves the patient's FHIR resource ID

3. **Upload Brain Scan**
   - Practitioner uploads a brain MRI scan for the selected patient
   - System associates the scan with the specified patient ID
   - Initial response includes a pending status

4. **Review Results**
   - Practitioner checks results after processing completes
   - Results show tumor detection status, type, and confidence level
   - FHIR resources are automatically created and linked

5. **Patient Management**
   - Practitioner can view all scans for a patient
   - Practitioner can delete scans if needed

## Frontend Integration Examples

### Upload Component

```jsx
import React, { useState } from 'react';

const BrainScanUpload = ({ patientId, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const url = patientId 
        ? `http://localhost:3000/api/brain-tumor/upload?patientId=${patientId}`
        : 'http://localhost:3000/api/brain-tumor/upload';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        onUploadComplete(data.data);
      } else {
        setError(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      setError('An error occurred during upload');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="brain-scan-upload">
      <h2>Upload Brain MRI Scan</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="scan-file">Select MRI Scan Image:</label>
          <input
            id="scan-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button 
          type="submit" 
          disabled={loading || !file}
          className="upload-button"
        >
          {loading ? 'Uploading...' : 'Upload for Analysis'}
        </button>
      </form>
    </div>
  );
};

export default BrainScanUpload;
```

### Results Polling Component

```jsx
import React, { useState, useEffect } from 'react';

const BrainScanResults = ({ scanId }) => {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchScanResults = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/brain-tumor/${scanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScan(data.data);
        return data.data;
      } else {
        setError(data.error?.message || 'Failed to fetch results');
        return null;
      }
    } catch (error) {
      setError('An error occurred while fetching results');
      console.error('Fetch error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Initial fetch
    fetchScanResults().then(scanData => {
      // If scan is still processing, poll every 5 seconds
      if (scanData && scanData.status === 'pending') {
        const interval = setInterval(() => {
          fetchScanResults().then(updatedScan => {
            if (updatedScan && updatedScan.status !== 'pending') {
              clearInterval(interval);
            }
          });
        }, 5000);
        
        // Clean up interval on unmount
        return () => clearInterval(interval);
      }
    });
  }, [scanId]);
  
  if (loading) {
    return <div className="loading">Loading results...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!scan) {
    return <div>No scan data available</div>;
  }
  
  return (
    <div className="brain-scan-results">
      <h2>Brain Scan Results</h2>
      
      <div className="scan-image">
        <img 
          src={`http://localhost:3000${scan.scanImagePath}`} 
          alt="Brain MRI Scan" 
        />
      </div>
      
      <div className="scan-details">
        <div className="status">
          Status: <span className={`status-${scan.status}`}>{scan.status}</span>
        </div>
        
        {scan.status === 'pending' && (
          <div className="processing-message">
            Your scan is being processed. This may take a few moments...
          </div>
        )}
        
        {scan.status === 'completed' && (
          <>
            <div className="result-summary">
              <h3>Analysis Results:</h3>
              <p className={scan.tumorDetected ? 'detected' : 'not-detected'}>
                {scan.tumorDetected 
                  ? `Tumor detected (${scan.tumorType})` 
                  : 'No tumor detected'}
              </p>
              
              {scan.tumorDetected && (
                <>
                  <div className="tumor-type">
                    <strong>Tumor Type:</strong> {formatTumorType(scan.tumorType)}
                  </div>
                  <div className="confidence">
                    <strong>Confidence:</strong> {(scan.confidence * 100).toFixed(2)}%
                  </div>
                </>
              )}
            </div>
            
            <div className="fhir-resources">
              <h3>FHIR Resources:</h3>
              <p>
                <strong>Observation ID:</strong> {scan.fhirObservationId}
              </p>
              <p>
                <strong>Diagnostic Report ID:</strong> {scan.fhirDiagnosticReportId}
              </p>
            </div>
          </>
        )}
        
        {scan.status === 'failed' && (
          <div className="error-message">
            <h3>Processing Failed</h3>
            <p>{scan.errorMessage || 'Unknown error occurred'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format tumor type for display
const formatTumorType = (type) => {
  switch (type) {
    case 'glioma':
      return 'Glioma';
    case 'meningioma':
      return 'Meningioma';
    case 'pituitary':
      return 'Pituitary Tumor';
    case 'no_tumor':
      return 'No Tumor';
    default:
      return 'Unknown';
  }
};

export default BrainScanResults;
```

### Patient Scan History Component

```jsx
import React, { useState, useEffect } from 'react';

const PatientScanHistory = ({ patientId }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchScans = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/brain-tumor/patient/${patientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setScans(data.data);
        } else {
          setError(data.error?.message || 'Failed to fetch scan history');
        }
      } catch (error) {
        setError('An error occurred while fetching scan history');
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchScans();
  }, [patientId]);
  
  const handleDelete = async (scanId) => {
    // Only practitioners and admins can delete scans
    if (!['practitioner', 'admin'].includes(localStorage.getItem('userRole'))) {
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this scan?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/api/brain-tumor/${scanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove deleted scan from state
        setScans(scans.filter(scan => scan._id !== scanId));
      } else {
        alert(data.error?.message || 'Failed to delete scan');
      }
    } catch (error) {
      alert('An error occurred while deleting the scan');
      console.error('Delete error:', error);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading scan history...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (scans.length === 0) {
    return <div className="no-scans">No brain scans found for this patient.</div>;
  }
  
  return (
    <div className="scan-history">
      <h2>Brain Scan History</h2>
      
      <div className="scan-list">
        {scans.map(scan => (
          <div key={scan._id} className="scan-card">
            <div className="scan-thumbnail">
              <img 
                src={`http://localhost:3000${scan.thumbnailPath}`} 
                alt="Brain Scan Thumbnail" 
              />
            </div>
            
            <div className="scan-info">
              <div className="scan-date">
                {new Date(scan.createdAt).toLocaleDateString()} at {new Date(scan.createdAt).toLocaleTimeString()}
              </div>
              
              <div className="scan-status">
                Status: <span className={`status-${scan.status}`}>{scan.status}</span>
              </div>
              
              {scan.status === 'completed' && (
                <div className="scan-result">
                  Result: {scan.tumorDetected 
                    ? <span className="detected">{formatTumorType(scan.tumorType)} ({(scan.confidence * 100).toFixed(0)}%)</span> 
                    : <span className="not-detected">No tumor detected</span>}
                </div>
              )}
              
              <div className="scan-actions">
                <a 
                  href={`/scans/${scan._id}`} 
                  className="view-button"
                >
                  View Details
                </a>
                
                {['practitioner', 'admin'].includes(localStorage.getItem('userRole')) && (
                  <button 
                    onClick={() => handleDelete(scan._id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format tumor type for display
const formatTumorType = (type) => {
  switch (type) {
    case 'glioma':
      return 'Glioma';
    case 'meningioma':
      return 'Meningioma';
    case 'pituitary':
      return 'Pituitary Tumor';
    case 'no_tumor':
      return 'No Tumor';
    default:
      return 'Unknown';
  }
};

export default PatientScanHistory;
```

## Error Handling

The API returns standardized error responses with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common error scenarios:

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid parameters |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

## Best Practices

1. **Image Quality**
   - Upload high-quality MRI scans for better detection accuracy
   - Supported formats: JPEG, PNG
   - Maximum file size: 10MB

2. **Polling Strategy**
   - Implement exponential backoff for polling results
   - Start with 2-second intervals, increasing up to 10 seconds
   - Set a reasonable timeout (e.g., 2 minutes)

3. **Error Handling**
   - Implement proper error handling for all API calls
   - Display user-friendly error messages
   - Log detailed errors for debugging

4. **User Experience**
   - Show loading indicators during upload and processing
   - Display clear results with visual indicators for tumor detection
   - Provide easy navigation between scan history and details

5. **Security**
   - Never store JWT tokens in cookies or local storage for production
   - Implement token refresh mechanisms
   - Validate user permissions client-side before showing sensitive actions

6. **Performance**
   - Implement caching for scan results
   - Use thumbnails for list views
   - Lazy load full-resolution images 