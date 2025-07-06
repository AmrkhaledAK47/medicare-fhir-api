# Frontend Integration Guide for MediCare FHIR API

This guide provides instructions and best practices for integrating frontend applications with the MediCare FHIR API.

## Table of Contents

1. [Authentication](#authentication)
2. [API Base URL](#api-base-url)
3. [Making Requests](#making-requests)
4. [Error Handling](#error-handling)
5. [Role-Based Access](#role-based-access)
6. [Common Patterns](#common-patterns)
7. [Sample Code](#sample-code)

## Authentication

### Authentication Flow

1. **Registration**: New users register with an access code
2. **Login**: Users authenticate to receive a JWT token
3. **API Requests**: Include the token in all subsequent requests
4. **Token Expiration**: Handle token expiration gracefully

### Login Example

```javascript
// Using fetch API
async function login(email, password) {
  try {
    const response = await fetch('http://your-api-url/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store token in localStorage or secure cookie
    localStorage.setItem('authToken', data.accessToken);
    
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### Registration with Access Code

```javascript
async function register(userData, accessCode) {
  try {
    const response = await fetch('http://your-api-url/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        accessCode,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
```

## API Base URL

Configure your API base URL as an environment variable in your frontend application:

```javascript
// .env file
REACT_APP_API_URL=http://localhost:3000/api

// or for Vue.js
VUE_APP_API_URL=http://localhost:3000/api

// or for Angular
environment.apiUrl = 'http://localhost:3000/api';
```

## Making Requests

### Authenticated Requests

Create a utility function for making authenticated requests:

```javascript
async function authFetch(url, options = {}) {
  // Get token from storage
  const token = localStorage.getItem('authToken');
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized (token expired or invalid)
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  
  return response;
}
```

### FHIR Resource Requests

Example of fetching FHIR resources:

```javascript
async function getPatients(page = 1, limit = 10) {
  try {
    const response = await authFetch(`${API_URL}/fhir/Patient?_count=${limit}&page=${page}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch patients');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
}
```

## Error Handling

The API returns standardized error responses. Here's how to handle them:

```javascript
async function handleApiRequest(promise) {
  try {
    const result = await promise;
    return { data: result, error: null };
  } catch (error) {
    // Extract error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // The request was made and the server responded with an error status
      const errorData = await error.response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } else if (error.message) {
      // Client-side error
      errorMessage = error.message;
    }
    
    return { data: null, error: errorMessage };
  }
}

// Usage
const { data, error } = await handleApiRequest(getPatients());
if (error) {
  showErrorNotification(error);
} else {
  displayPatients(data);
}
```

## Role-Based Access

The API enforces role-based access control. Your frontend should adapt its UI based on the user's role:

```javascript
function setupRoleBasedUI(user) {
  const { role } = user;
  
  // Hide/show elements based on role
  document.querySelectorAll('[data-role]').forEach(element => {
    const allowedRoles = element.dataset.role.split(',');
    if (allowedRoles.includes(role) || allowedRoles.includes('*')) {
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  });
}
```

HTML example:

```html
<!-- Only visible to admin -->
<div data-role="admin">
  <h2>Admin Dashboard</h2>
  <button id="createAccessCode">Create Access Code</button>
</div>

<!-- Visible to practitioners -->
<div data-role="practitioner,admin">
  <h2>Patient Management</h2>
</div>

<!-- Visible to patients -->
<div data-role="patient">
  <h2>My Health Records</h2>
</div>
```

## Common Patterns

### Pagination

The API supports pagination for list endpoints:

```javascript
async function fetchPaginatedData(resourceType, page = 1, limit = 10, searchParams = {}) {
  // Convert search params to query string
  const queryParams = new URLSearchParams({
    _count: limit,
    page,
    ...searchParams
  }).toString();
  
  const response = await authFetch(`${API_URL}/fhir/${resourceType}?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${resourceType}`);
  }
  
  const data = await response.json();
  
  return {
    items: data.entry ? data.entry.map(entry => entry.resource) : [],
    total: data.total || 0,
    page,
    limit,
    totalPages: Math.ceil((data.total || 0) / limit)
  };
}
```

### Handling ID Format

The API automatically converts purely numeric IDs to alphanumeric format (e.g., `123` becomes `res-123`). Your frontend should be aware of this when constructing URLs:

```javascript
function getResourceUrl(resourceType, id) {
  // If ID is purely numeric, the API will handle the conversion
  return `${API_URL}/fhir/${resourceType}/${id}`;
}
```

## Sample Code

### React Integration Example

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Create axios instance with auth header
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add auth interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Patient list component
function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true);
        const response = await api.get(`/fhir/Patient?_count=10&page=${page}`);
        
        const patientResources = response.data.entry 
          ? response.data.entry.map(entry => entry.resource) 
          : [];
          
        setPatients(patientResources);
        setTotalPages(Math.ceil((response.data.total || 0) / 10));
        setError(null);
      } catch (err) {
        setError('Failed to fetch patients');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPatients();
  }, [page]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>Patients</h1>
      <ul>
        {patients.map(patient => (
          <li key={patient.id}>
            {patient.name?.[0]?.family}, {patient.name?.[0]?.given?.join(' ')}
          </li>
        ))}
      </ul>
      
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        
        <span>Page {page} of {totalPages}</span>
        
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default PatientList;
```

### Vue.js Integration Example

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// PatientList.vue
<template>
  <div>
    <h1>Patients</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <ul v-else>
      <li v-for="patient in patients" :key="patient.id">
        {{ getPatientName(patient) }}
      </li>
    </ul>
    
    <div class="pagination">
      <button 
        @click="prevPage" 
        :disabled="page === 1"
      >
        Previous
      </button>
      
      <span>Page {{ page }} of {{ totalPages }}</span>
      
      <button 
        @click="nextPage" 
        :disabled="page >= totalPages"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
import api from '@/services/api';

export default {
  data() {
    return {
      patients: [],
      loading: true,
      error: null,
      page: 1,
      totalPages: 1
    };
  },
  
  created() {
    this.fetchPatients();
  },
  
  methods: {
    async fetchPatients() {
      try {
        this.loading = true;
        const response = await api.get(`/fhir/Patient?_count=10&page=${this.page}`);
        
        this.patients = response.data.entry 
          ? response.data.entry.map(entry => entry.resource) 
          : [];
          
        this.totalPages = Math.ceil((response.data.total || 0) / 10);
        this.error = null;
      } catch (err) {
        this.error = 'Failed to fetch patients';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    
    getPatientName(patient) {
      if (!patient.name || !patient.name.length) return 'Unknown';
      const name = patient.name[0];
      return `${name.family || ''}, ${(name.given || []).join(' ')}`;
    },
    
    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.fetchPatients();
      }
    },
    
    nextPage() {
      this.page++;
      this.fetchPatients();
    }
  }
};
</script>
```

## Conclusion

This guide covers the basics of integrating a frontend application with the MediCare FHIR API. For more detailed information, refer to the API documentation available at `/api/docs` endpoint. 