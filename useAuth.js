/**
 * MediCare FHIR API Authentication Hook
 * 
 * This is a React hook that provides authentication functionality for the MediCare FHIR API.
 * It can be used in a React application to handle user authentication.
 * 
 * Usage:
 * 
 * import { AuthProvider, useAuth } from './useAuth';
 * 
 * // In your app:
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * // In your components:
 * const { user, login, register, logout, isLoading, error } = useAuth();
 */

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create API instance
const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Create authentication context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Configure axios interceptor for authentication
    useEffect(() => {
        const interceptor = api.interceptors.request.use(
            config => {
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            error => Promise.reject(error)
        );

        // Clean up interceptor on unmount
        return () => api.interceptors.request.eject(interceptor);
    }, [token]);

    // Load user from token on mount
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    setIsLoading(true);
                    const response = await api.get('/auth/me');
                    setUser(response.data.data);
                } catch (err) {
                    console.error('Failed to load user:', err);
                    setError('Session expired. Please log in again.');
                    logout();
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadUser();
    }, [token]);

    // Login function
    const login = async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post('/auth/login', { email, password });
            const { accessToken, user } = response.data;

            // Store token and user info
            localStorage.setItem('token', accessToken);
            setToken(accessToken);
            setUser(user);

            return user;
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Register function
    const register = async (name, email, password, repeatPassword, accessCode) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post('/auth/register', {
                name,
                email,
                password,
                repeatPassword,
                accessCode
            });

            const { accessToken, user } = response.data;

            // Store token and user info
            localStorage.setItem('token', accessToken);
            setToken(accessToken);
            setUser(user);

            return user;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    // Check if user has a specific role
    const hasRole = (role) => {
        return user && user.role && user.role.toLowerCase() === role.toLowerCase();
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!token && !!user;
    };

    // Value to be provided to consumers
    const value = {
        user,
        login,
        register,
        logout,
        isLoading,
        error,
        hasRole,
        isAuthenticated,
        token
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Example usage in a login component:
/*
import { useAuth } from './useAuth';
import { useState } from 'react';

const LoginPage = () => {
  const { login, error, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect to dashboard or home page
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };
  
  return (
    <div>
      <h1>Login</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
*/ 