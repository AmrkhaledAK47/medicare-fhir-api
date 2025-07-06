# MediCare FHIR API Frontend Integration

## Overview

This package contains documentation and examples for integrating the MediCare FHIR API authentication system with frontend applications. It includes comprehensive documentation, test scripts, and React code examples to help you quickly implement authentication in your frontend application.

## Contents

1. **AUTHENTICATION_DOCUMENTATION.md** - Comprehensive documentation of the authentication flow and API endpoints
2. **test_frontend_auth.js** - Node.js script to test the authentication flow
3. **useAuth.js** - React hook for implementing authentication in React applications

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Access to the MediCare FHIR API backend (running on http://localhost:3000 by default)
- Axios (`npm install axios`)
- For React examples: React (v16.8+ with Hooks support)

### Running the Test Script

The test script demonstrates the complete authentication flow from admin login to patient/practitioner registration and resource access.

```bash
# Install dependencies
npm install axios

# Run the test script
node test_frontend_auth.js
```

### Using the React Authentication Hook

1. Copy the `useAuth.js` file to your React project
2. Import and use the hook in your components:

```jsx
import { AuthProvider, useAuth } from './useAuth';

// Wrap your app with the AuthProvider
function App() {
  return (
    <AuthProvider>
      <YourAppComponents />
    </AuthProvider>
  );
}

// Use the hook in your components
function LoginComponent() {
  const { login, isLoading, error } = useAuth();
  
  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      // Redirect or show success message
    } catch (err) {
      // Error handling is done by the hook
    }
  };
  
  return (
    // Your login form
  );
}
```

## Test Accounts

For development and testing purposes, you can use the following accounts:

### Admin User
```
Email: admin@test.com
Password: Admin123
```

### Patient User
```
Email: patient@med.com
Password: Patient123!
```

### Practitioner User
```
Email: doctor@med.com
Password: Doctor123!
```

## Authentication Flow

The MediCare platform uses a role-based authentication system with JWT tokens. The basic flow is:

1. Admin creates a FHIR resource (Patient or Practitioner) with an access code
2. User receives the access code (typically via email)
3. User registers with the access code, which links their account to the FHIR resource
4. User can then log in with their credentials and access resources based on their role

For more details, see the full documentation in `AUTHENTICATION_DOCUMENTATION.md`.

## Common Integration Tasks

### Implementing Protected Routes

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, hasRole } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Outlet />;
};

// Usage in your routes
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
  <Route element={<ProtectedRoute requiredRole="admin" />}>
    <Route path="/admin" element={<AdminPanel />} />
  </Route>
</Routes>
```

### Making Authenticated API Calls

```jsx
import { useAuth } from './useAuth';
import axios from 'axios';

function PatientProfile() {
  const { user, token } = useAuth();
  const [patientData, setPatientData] = useState(null);
  
  useEffect(() => {
    const fetchPatientData = async () => {
      if (user?.fhirResourceId) {
        try {
          const response = await axios.get(
            `http://localhost:3000/api/fhir/Patient/${user.fhirResourceId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          setPatientData(response.data);
        } catch (error) {
          console.error('Error fetching patient data:', error);
        }
      }
    };
    
    fetchPatientData();
  }, [user, token]);
  
  return (
    // Render patient data
  );
}
```

## Support

If you encounter any issues or have questions about integrating with the MediCare FHIR API, please contact the backend team at backend@medicare-example.com. 