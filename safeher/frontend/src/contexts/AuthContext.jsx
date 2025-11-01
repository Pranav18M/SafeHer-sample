import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = API_URL;
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [API_URL]);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // REGISTER FUNCTION
  const register = async (name, email, password, phone) => {
    try {
      setError(null);
      console.log('Registering user:', { name, email, phone });
      
      const response = await axios.post('/auth/register', {
        name,
        email,
        password,
        phone
      });

      console.log('Registration response:', response.data);

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error.response || error);
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  // LOGIN FUNCTION - FIXED
  const login = async (email, password) => {
    try {
      setError(null);
      console.log('Login attempt for:', email);
      console.log('API URL:', API_URL);
      
      // Make sure email is lowercase and trimmed
      const loginData = {
        email: email.toLowerCase().trim(),
        password: password
      };
      
      console.log('Sending login request to:', `${API_URL}/auth/login`);
      
      const response = await axios.post('/auth/login', loginData);

      console.log('Login response:', response.data);

      const { token, user } = response.data;
      
      // Save token
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let message = 'Login failed';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 400) {
          message = error.response.data?.message || 'Invalid email or password format';
        } else if (error.response.status === 401) {
          message = 'Invalid email or password';
        } else {
          message = error.response.data?.message || 'Login failed';
        }
      } else if (error.request) {
        // Request made but no response
        message = 'Cannot connect to server. Please check if backend is running.';
      } else {
        // Something else happened
        message = error.message || 'An unexpected error occurred';
      }
      
      setError(message);
      return { success: false, error: message };
    }
  };

  // LOGOUT FUNCTION
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // UPDATE USER FUNCTION
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};