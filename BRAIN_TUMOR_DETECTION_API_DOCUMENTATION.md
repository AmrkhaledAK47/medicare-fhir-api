# Brain Tumor Detection API Documentation

## Overview

The Brain Tumor Detection API provides a comprehensive solution for uploading, analyzing, and managing brain MRI scans. The API leverages artificial intelligence to detect potential brain tumors in uploaded images and stores the results in both MongoDB and FHIR formats for seamless integration with healthcare systems.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
   - [Upload Brain Scan](#upload-brain-scan)
   - [Get Brain Scan by ID](#get-brain-scan-by-id)
   - [Get Patient Brain Scans](#get-patient-brain-scans)
   - [Delete Brain Scan](#delete-brain-scan)
3. [Role-Based Access Control](#role-based-access-control)
4. [FHIR Integration](#fhir-integration)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [Error Handling](#error-handling)
7. [Examples](#examples)
   - [Patient Workflow](#patient-workflow)
   - [Practitioner Workflow](#practitioner-workflow)

## Authentication

All API endpoints require authentication using JWT tokens. To authenticate:

1. Make a POST request to `/api/auth/login` with email and password
2. Store the returned JWT token
3. Include the token in the Authorization header for all subsequent requests

```javascript
// Authentication example
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store the token for future requests
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data;
  } else {
    throw new Error('Authentication failed');
  }
};
```

## API Endpoints

### Upload Brain Scan

**Endpoint:** `POST /api/brain-tumor/upload`

**Description:** Upload a brain MRI scan image for tumor detection.

**Authentication:** Required

**Request Parameters:**
- `patientId` (query parameter): FHIR Patient resource ID. For patients, this is optional as the system will use their own ID.

**Request Body:**
- `file` (form-data): The brain MRI scan image file (JPEG, PNG)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6868a12e5efd7c3bd784a0c5",
    "patientId": "422",
    "scanImagePath": "/brain-scans/1751687470534-test-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-test-brain-scan.jpg",
    "status": "pending",
    "tumorDetected": false,
    "tumorBoundingBox": [],
    "createdAt": "2025-07-05T03:51:10.553Z",
    "updatedAt": "2025-07-05T03:51:10.553Z",
    "__v": 0
  }
}
```

**Frontend Example:**
```javascript
const uploadBrainScan = async (file, patientId = null) => {
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
  
  return await response.json();
};
```

### Get Brain Scan by ID

**Endpoint:** `GET /api/brain-tumor/:id`

**Description:** Retrieve a specific brain scan by its ID.

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
    "scanImagePath": "/brain-scans/1751687470534-test-brain-scan.jpg",
    "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-test-brain-scan.jpg",
    "status": "completed",
    "tumorDetected": false,
    "tumorBoundingBox": [],
    "createdAt": "2025-07-05T03:51:10.553Z",
    "updatedAt": "2025-07-05T03:51:14.209Z",
    "__v": 0,
    "detectedAt": "2025-07-05T03:51:13.743Z",
    "tumorType": "no_tumor",
    "confidence": 0,
    "detectionResult": {
      "inference_id": "a9831a23-84ed-4e87-befc-eec66be8aab6",
      "time": 0.02918933500041021,
      "image": {
        "width": 3002,
        "height": 1343
      },
      "predictions": []
    },
    "fhirObservationId": "1104",
    "fhirDiagnosticReportId": "1105"
  }
}
```

**Frontend Example:**
```javascript
const getBrainScan = async (scanId) => {
  const response = await fetch(`http://localhost:3000/api/brain-tumor/${scanId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
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
      "scanImagePath": "/brain-scans/1751687470534-test-brain-scan.jpg",
      "thumbnailPath": "/brain-scans/thumbnails/thumb-1751687470534-test-brain-scan.jpg",
      "status": "completed",
      "tumorDetected": false,
      "tumorBoundingBox": [],
      "createdAt": "2025-07-05T03:51:10.553Z",
      "updatedAt": "2025-07-05T03:51:14.209Z",
      "__v": 0,
      "confidence": 0,
      "detectedAt": "2025-07-05T03:51:13.743Z",
      "detectionResult": {
        "inference_id": "a9831a23-84ed-4e87-befc-eec66be8aab6",
        "time": 0.02918933500041021,
        "image": {
          "width": 3002,
          "height": 1343
        },
        "predictions": []
      },
      "fhirDiagnosticReportId": "1105",
      "fhirObservationId": "1104",
      "tumorType": "no_tumor"
    }
  ]
}
```

**Frontend Example:**
```javascript
const getPatientBrainScans = async (patientId) => {
  const response = await fetch(`http://localhost:3000/api/brain-tumor/patient/${patientId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
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

**Frontend Example:**
```javascript
const deleteBrainScan = async (scanId) => {
  const response = await fetch(`http://localhost:3000/api/brain-tumor/${scanId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
```

## Role-Based Access Control

The API implements role-based access control to ensure that users can only access data they are authorized to view:

1. **Patients**:
   - Can upload brain scans for themselves
   - Can view only their own brain scans
   - Cannot delete brain scans

2. **Practitioners**:
   - Can upload brain scans for any patient
   - Can view brain scans for all patients
   - Can delete brain scans

3. **Administrators**:
   - Have all practitioner permissions
   - Can manage system-wide settings

## FHIR Integration

The Brain Tumor Detection API integrates with FHIR to ensure interoperability with healthcare systems:

1. **Observation Resource**:
   - Created for each brain scan
   - Contains tumor detection results
   - References the patient

2. **DiagnosticReport Resource**:
   - Created for each brain scan
   - Contains a conclusion based on the detection results
   - References the Observation resource and the patient

To access these resources directly from the FHIR server:

```
GET http://localhost:9090/fhir/Observation/{fhirObservationId}
GET http://localhost:9090/fhir/DiagnosticReport/{fhirDiagnosticReportId}
```

## Frontend Integration Guide

### Setting Up Authentication

1. **Login Component**:
   ```jsx
   import React, { useState } from 'react';
   
   const Login = ({ onLogin }) => {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [error, setError] = useState('');
     
     const handleSubmit = async (e) => {
       e.preventDefault();
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
           localStorage.setItem('accessToken', data.data.accessToken);
           localStorage.setItem('userRole', data.data.user.role);
           localStorage.setItem('userId', data.data.user.id);
           localStorage.setItem('fhirResourceId', data.data.user.fhirResourceId);
           onLogin(data.data.user);
         } else {
           setError('Login failed');
         }
       } catch (error) {
         setError('An error occurred during login');
       }
     };
     
     return (
       <form onSubmit={handleSubmit}>
         <h2>Login</h2>
         {error && <p className="error">{error}</p>}
         <div>
           <label>Email:</label>
           <input
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
           />
         </div>
         <div>
           <label>Password:</label>
           <input
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
           />
         </div>
         <button type="submit">Login</button>
       </form>
     );
   };
   
   export default Login;
   ```

### Brain Scan Upload Component

```jsx
import React, { useState } from 'react';

const BrainScanUpload = ({ patientId }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
        setResult(data.data);
        // Poll for results if status is pending
        if (data.data.status === 'pending') {
          pollForResults(data.data._id);
        }
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (error) {
      setError('An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };
  
  const pollForResults = async (scanId) => {
    // Poll every 5 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 24;
    
    const interval = setInterval(async () => {
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
          setResult(data.data);
          
          // If processing is complete or failed, stop polling
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling for results:', error);
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setError('Processing timed out');
      }
    }, 5000);
  };
  
  return (
    <div>
      <h2>Upload Brain Scan</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Select MRI Scan:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Upload Scan'}
        </button>
      </form>
      
      {error && <p className="error">{error}</p>}
      
      {result && (
        <div className="result">
          <h3>Upload Status: {result.status}</h3>
          {result.thumbnailPath && (
            <img 
              src={`http://localhost:3000${result.thumbnailPath}`} 
              alt="Brain Scan Thumbnail" 
            />
          )}
          
          {result.status === 'pending' && <p>Processing scan... Please wait.</p>}
          
          {result.status === 'completed' && (
            <div>
              <h4>Detection Results:</h4>
              <p>Tumor Detected: {result.tumorDetected ? 'Yes' : 'No'}</p>
              {result.tumorDetected && (
                <>
                  <p>Tumor Type: {result.tumorType}</p>
                  <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
                </>
              )}
              <p>FHIR Resources:</p>
              <ul>
                <li>Observation ID: {result.fhirObservationId}</li>
                <li>Diagnostic Report ID: {result.fhirDiagnosticReportId}</li>
              </ul>
            </div>
          )}
          
          {result.status === 'failed' && (
            <p>Processing failed: {result.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BrainScanUpload;
```

### Brain Scan List Component

```jsx
import React, { useState, useEffect } from 'react';

const BrainScanList = ({ patientId }) => {
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
          setError(data.message || 'Failed to fetch scans');
        }
      } catch (error) {
        setError('An error occurred while fetching scans');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScans();
  }, [patientId]);
  
  const handleDelete = async (scanId) => {
    if (window.confirm('Are you sure you want to delete this scan?')) {
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
          // Remove the deleted scan from the list
          setScans(scans.filter(scan => scan._id !== scanId));
        } else {
          setError(data.message || 'Failed to delete scan');
        }
      } catch (error) {
        setError('An error occurred while deleting the scan');
      }
    }
  };
  
  if (loading) {
    return <p>Loading scans...</p>;
  }
  
  if (error) {
    return <p className="error">{error}</p>;
  }
  
  if (scans.length === 0) {
    return <p>No brain scans found for this patient.</p>;
  }
  
  return (
    <div>
      <h2>Brain Scans</h2>
      <div className="scan-list">
        {scans.map(scan => (
          <div key={scan._id} className="scan-card">
            <img 
              src={`http://localhost:3000${scan.thumbnailPath}`} 
              alt="Brain Scan Thumbnail" 
            />
            <div className="scan-details">
              <p>Date: {new Date(scan.createdAt).toLocaleString()}</p>
              <p>Status: {scan.status}</p>
              {scan.status === 'completed' && (
                <p>Result: {scan.tumorDetected ? `Tumor detected (${scan.tumorType})` : 'No tumor detected'}</p>
              )}
              <div className="scan-actions">
                <a href={`http://localhost:3000${scan.scanImagePath}`} target="_blank" rel="noopener noreferrer">
                  View Full Image
                </a>
                {localStorage.getItem('userRole') === 'practitioner' && (
                  <button onClick={() => handleDelete(scan._id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrainScanList;
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

## Examples

### Patient Workflow

1. **Patient Login**:
   ```javascript
   const patientCredentials = {
     email: 'patient@example.com',
     password: 'Patient123!'
   };
   
   const patientData = await login(patientCredentials.email, patientCredentials.password);
   const patientId = patientData.user.fhirResourceId;
   ```

2. **Upload Brain Scan**:
   ```javascript
   // The patient doesn't need to specify patientId as the API will use their own ID
   const fileInput = document.querySelector('input[type="file"]');
   const file = fileInput.files[0];
   
   const uploadResult = await uploadBrainScan(file);
   const scanId = uploadResult.data._id;
   ```

3. **Check Scan Results**:
   ```javascript
   // Poll for results
   const checkResults = async () => {
     const scanData = await getBrainScan(scanId);
     
     if (scanData.data.status === 'completed') {
       displayResults(scanData.data);
     } else if (scanData.data.status === 'failed') {
       displayError(scanData.data.errorMessage);
     } else {
       // Still processing, check again in 5 seconds
       setTimeout(checkResults, 5000);
     }
   };
   
   checkResults();
   ```

4. **View All Scans**:
   ```javascript
   // For patients, they can only view their own scans
   const allScans = await getPatientBrainScans(patientId);
   displayScanList(allScans.data);
   ```

### Practitioner Workflow

1. **Practitioner Login**:
   ```javascript
   const practitionerCredentials = {
     email: 'doctor@med.com',
     password: 'Doctor123!'
   };
   
   const practitionerData = await login(practitionerCredentials.email, practitionerCredentials.password);
   ```

2. **Upload Brain Scan for Patient**:
   ```javascript
   // Practitioners need to specify the patientId
   const patientId = '422'; // Patient's FHIR resource ID
   const fileInput = document.querySelector('input[type="file"]');
   const file = fileInput.files[0];
   
   const uploadResult = await uploadBrainScan(file, patientId);
   const scanId = uploadResult.data._id;
   ```

3. **View Patient's Scans**:
   ```javascript
   // Practitioners can view any patient's scans
   const patientId = '422'; // Patient's FHIR resource ID
   const patientScans = await getPatientBrainScans(patientId);
   displayScanList(patientScans.data);
   ```

4. **Delete a Scan**:
   ```javascript
   // Only practitioners and admins can delete scans
   const scanId = '6868a12e5efd7c3bd784a0c5';
   const deleteResult = await deleteBrainScan(scanId);
   
   if (deleteResult.success) {
     removeFromUI(scanId);
   } else {
     displayError(deleteResult.error.message);
   }
   ```

---

This documentation provides a comprehensive guide for integrating the Brain Tumor Detection API into frontend applications. For additional support or questions, please contact the backend development team. 