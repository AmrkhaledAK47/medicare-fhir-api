# Brain Tumor Detection API Technical Reference

## Overview

This technical reference provides detailed implementation guidance for integrating with the Brain Tumor Detection API. It includes authentication methods, API endpoint specifications, data models, and code examples for common integration patterns.

## API Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.medicare.example.com/api`

## Authentication

The API uses JWT (JSON Web Token) authentication. All requests must include a valid token in the Authorization header.

### Obtaining a Token

```javascript
const getToken = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Authentication failed');
  }
  
  return data.data.accessToken;
};
```

### Using the Token

```javascript
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const options = {
    method,
    headers
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:3000/api${endpoint}`, options);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }
  
  return data.data;
};
```

## Data Models

### Brain Scan Model

| Field | Type | Description |
|-------|------|-------------|
| _id | String | Unique identifier for the brain scan |
| patientId | String | FHIR Patient resource ID |
| scanImagePath | String | Path to the uploaded scan image |
| thumbnailPath | String | Path to the generated thumbnail image |
| status | Enum | Status of the scan processing: 'pending', 'completed', 'failed' |
| detectedAt | Date | Timestamp when detection was completed |
| tumorDetected | Boolean | Whether a tumor was detected |
| tumorType | Enum | Type of tumor detected: 'no_tumor', 'glioma', 'meningioma', 'pituitary', 'other' |
| confidence | Number | Confidence score of the detection (0-1) |
| detectionResult | Object | Raw detection result from the AI model |
| fhirObservationId | String | ID of the created FHIR Observation resource |
| fhirDiagnosticReportId | String | ID of the created FHIR DiagnosticReport resource |
| errorMessage | String | Error message if detection failed |
| tumorBoundingBox | Array | Array of coordinates defining the tumor bounding box |
| createdAt | Date | Timestamp when the record was created |
| updatedAt | Date | Timestamp when the record was last updated |

### Tumor Types

```typescript
enum TumorType {
  NO_TUMOR = 'no_tumor',
  GLIOMA = 'glioma',
  MENINGIOMA = 'meningioma',
  PITUITARY = 'pituitary',
  OTHER = 'other'
}
```

### Detection Status

```typescript
enum DetectionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

## API Endpoints

### Upload Brain Scan

**Endpoint:** `POST /brain-tumor/upload`

**Description:** Upload a brain MRI scan image for tumor detection.

**Authentication:** Required

**Request:**
- Content-Type: `multipart/form-data`
- Query Parameters:
  - `patientId`: FHIR Patient resource ID (optional for patients, required for practitioners)
- Body:
  - `file`: The brain MRI scan image file

**Response:**
- Status: 201 Created
- Body: Brain scan object with initial status 'pending'

**Example:**

```javascript
const uploadBrainScan = async (file, patientId = null) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const url = patientId 
    ? `http://localhost:3000/api/brain-tumor/upload?patientId=${patientId}`
    : 'http://localhost:3000/api/brain-tumor/upload';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Upload failed');
  }
  
  return data.data;
};
```

### Get Brain Scan by ID

**Endpoint:** `GET /brain-tumor/:id`

**Description:** Retrieve a specific brain scan by its ID.

**Authentication:** Required

**Path Parameters:**
- `id`: The brain scan ID

**Response:**
- Status: 200 OK
- Body: Brain scan object with current status and results if available

**Example:**

```javascript
const getBrainScan = async (scanId) => {
  return apiRequest(`/brain-tumor/${scanId}`);
};
```

### Get Patient Brain Scans

**Endpoint:** `GET /brain-tumor/patient/:patientId`

**Description:** Retrieve all brain scans for a specific patient.

**Authentication:** Required

**Path Parameters:**
- `patientId`: The FHIR Patient resource ID

**Response:**
- Status: 200 OK
- Body: Array of brain scan objects

**Example:**

```javascript
const getPatientBrainScans = async (patientId) => {
  return apiRequest(`/brain-tumor/patient/${patientId}`);
};
```

### Delete Brain Scan

**Endpoint:** `DELETE /brain-tumor/:id`

**Description:** Delete a brain scan and its associated FHIR resources.

**Authentication:** Required (Practitioner or Admin role only)

**Path Parameters:**
- `id`: The brain scan ID

**Response:**
- Status: 200 OK
- Body: Success message

**Example:**

```javascript
const deleteBrainScan = async (scanId) => {
  return apiRequest(`/brain-tumor/${scanId}`, 'DELETE');
};
```

## Integration Patterns

### Complete Upload and Results Polling

```javascript
const uploadAndPollForResults = async (file, patientId = null) => {
  try {
    // Step 1: Upload the scan
    const scan = await uploadBrainScan(file, patientId);
    console.log('Scan uploaded successfully:', scan);
    
    // Step 2: Poll for results
    return pollForResults(scan._id);
  } catch (error) {
    console.error('Error in upload and poll process:', error);
    throw error;
  }
};

const pollForResults = async (scanId, maxAttempts = 30, interval = 2000) => {
  let attempts = 0;
  
  // Create a promise that resolves when results are ready
  return new Promise((resolve, reject) => {
    const checkResults = async () => {
      try {
        // Get current scan status
        const scan = await getBrainScan(scanId);
        
        // If processing is complete or failed, return the results
        if (scan.status === 'completed' || scan.status === 'failed') {
          return resolve(scan);
        }
        
        // If still processing and under max attempts, try again
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkResults, interval);
        } else {
          // If max attempts reached, reject with timeout error
          reject(new Error('Processing timed out'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    // Start checking
    checkResults();
  });
};

// Usage example
const handleFileUpload = async (event, patientId = null) => {
  const file = event.target.files[0];
  
  if (!file) {
    return;
  }
  
  try {
    setLoading(true);
    setError(null);
    
    // Upload and wait for results
    const results = await uploadAndPollForResults(file, patientId);
    
    // Update UI with results
    setResults(results);
    
    if (results.tumorDetected) {
      console.log(`Tumor detected: ${results.tumorType} with ${results.confidence * 100}% confidence`);
    } else {
      console.log('No tumor detected');
    }
  } catch (error) {
    setError(error.message);
    console.error('Upload error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Practitioner Patient Management

```javascript
const PractitionerDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientScans, setPatientScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load patients on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        // Fetch patients from FHIR API
        const patientData = await apiRequest('/fhir/Patient?_count=100');
        setPatients(patientData.entry.map(e => e.resource));
      } catch (error) {
        setError('Failed to load patients');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, []);
  
  // Load patient scans when a patient is selected
  useEffect(() => {
    if (!selectedPatient) return;
    
    const fetchPatientScans = async () => {
      try {
        setLoading(true);
        const scans = await getPatientBrainScans(selectedPatient.id);
        setPatientScans(scans);
      } catch (error) {
        setError('Failed to load patient scans');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatientScans();
  }, [selectedPatient]);
  
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
  };
  
  const handleScanUpload = async (file) => {
    if (!selectedPatient || !file) return;
    
    try {
      setLoading(true);
      await uploadAndPollForResults(file, selectedPatient.id);
      
      // Refresh scan list after upload
      const scans = await getPatientBrainScans(selectedPatient.id);
      setPatientScans(scans);
    } catch (error) {
      setError('Failed to upload scan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleScanDelete = async (scanId) => {
    try {
      setLoading(true);
      await deleteBrainScan(scanId);
      
      // Remove deleted scan from state
      setPatientScans(patientScans.filter(scan => scan._id !== scanId));
    } catch (error) {
      setError('Failed to delete scan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Component rendering...
};
```

### Patient Self-Service Portal

```javascript
const PatientPortal = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  // Load user data and scans on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Get user profile
        const userData = await apiRequest('/users/profile');
        setUser(userData);
        
        // Get patient scans using FHIR resource ID
        if (userData.fhirResourceId) {
          const scanData = await getPatientBrainScans(userData.fhirResourceId);
          setScans(scanData);
        }
      } catch (error) {
        setError('Failed to initialize patient portal');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  const handleScanUpload = async (file) => {
    if (!file) return;
    
    try {
      setLoading(true);
      
      // Upload scan (patientId is not needed as the API will use the user's ID)
      const scan = await uploadBrainScan(file);
      
      // Add the new scan to the list
      setScans([scan, ...scans]);
      
      // Start polling for results
      pollForResults(scan._id).then(updatedScan => {
        // Update the scan in the list when results are ready
        setScans(prevScans => 
          prevScans.map(s => 
            s._id === updatedScan._id ? updatedScan : s
          )
        );
      }).catch(error => {
        console.error('Polling error:', error);
      });
    } catch (error) {
      setError('Failed to upload scan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Component rendering...
};
```

## FHIR Resource Examples

### Observation Resource

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

## Error Handling

### Common Error Codes

| HTTP Status | Error Code | Description | Handling Strategy |
|-------------|------------|-------------|-------------------|
| 400 | INVALID_REQUEST | Missing or invalid parameters | Validate inputs before sending |
| 401 | UNAUTHORIZED | Authentication required | Redirect to login or refresh token |
| 403 | FORBIDDEN | Insufficient permissions | Check user role before action |
| 404 | NOT_FOUND | Resource not found | Show user-friendly message |
| 413 | PAYLOAD_TOO_LARGE | File size exceeds limit | Validate file size before upload |
| 415 | UNSUPPORTED_MEDIA_TYPE | Invalid file format | Validate file type before upload |
| 500 | INTERNAL_ERROR | Server error | Retry with exponential backoff |

### Error Handling Example

```javascript
const safeApiCall = async (apiFunction, ...args) => {
  try {
    return await apiFunction(...args);
  } catch (error) {
    // Handle based on error type
    if (error.message.includes('401') || error.message.includes('UNAUTHORIZED')) {
      // Authentication error - redirect to login
      window.location.href = '/login';
      return null;
    }
    
    if (error.message.includes('403') || error.message.includes('FORBIDDEN')) {
      // Permission error
      alert('You do not have permission to perform this action');
      return null;
    }
    
    if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
      // Resource not found
      return null;
    }
    
    // General error handling
    console.error('API error:', error);
    throw error;
  }
};

// Usage
const handleGetScan = async (scanId) => {
  const scan = await safeApiCall(getBrainScan, scanId);
  
  if (scan) {
    // Process scan data
  } else {
    // Handle null result
  }
};
```

## Performance Optimization

### Image Optimization

Before uploading large MRI scans, consider optimizing them client-side:

```javascript
const optimizeImage = async (file, maxWidth = 2048, maxHeight = 2048, quality = 0.9) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
  });
};

// Usage
const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  
  if (file && file.size > 5 * 1024 * 1024) { // If larger than 5MB
    try {
      const optimizedFile = await optimizeImage(file);
      console.log(`Reduced file size from ${file.size} to ${optimizedFile.size} bytes`);
      uploadBrainScan(optimizedFile);
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Fall back to original file
      uploadBrainScan(file);
    }
  } else {
    uploadBrainScan(file);
  }
};
```

### Caching Results

Implement a simple cache for brain scan results:

```javascript
class ScanCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(scanId) {
    const cached = this.cache.get(scanId);
    
    if (cached) {
      // Check if cache is still valid (10 minutes)
      const now = Date.now();
      if (now - cached.timestamp < 10 * 60 * 1000) {
        return cached.data;
      } else {
        // Remove expired cache
        this.cache.delete(scanId);
        return null;
      }
    }
    
    return null;
  }
  
  set(scanId, data) {
    // Ensure cache doesn't grow too large
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(scanId, {
      data,
      timestamp: Date.now()
    });
  }
}

// Create a singleton instance
const scanCache = new ScanCache();

// Enhanced get function with caching
const getCachedBrainScan = async (scanId) => {
  // Try to get from cache first
  const cachedScan = scanCache.get(scanId);
  
  if (cachedScan) {
    return cachedScan;
  }
  
  // If not in cache, fetch from API
  const scan = await getBrainScan(scanId);
  
  // Only cache completed scans
  if (scan.status === 'completed') {
    scanCache.set(scanId, scan);
  }
  
  return scan;
};
```

## Versioning and Backward Compatibility

The API follows semantic versioning (MAJOR.MINOR.PATCH). The current version is v1.0.0.

### API Version Headers

```javascript
const apiRequestWithVersion = async (endpoint, method = 'GET', body = null, version = 'v1') => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Version': version
  };
  
  const options = {
    method,
    headers
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:3000/api/${endpoint}`, options);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }
  
  return data.data;
};
```

## Conclusion

This technical reference provides comprehensive guidance for integrating with the Brain Tumor Detection API. By following these patterns and examples, frontend developers can efficiently implement the necessary functionality for both patient and practitioner workflows.

For additional support or questions, please contact the backend development team. 