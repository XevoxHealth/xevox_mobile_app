import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, ENDPOINTS } from './api/config';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    authenticated: false,
    user: null,
    loading: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if the user is already logged in on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // Load user data from AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        
        if (userData) {
          const user = JSON.parse(userData);
          
          // Setup axios with credentials
          axios.defaults.withCredentials = true;
          
          // Check if the session is still valid
          try {
            const response = await axios.get(`${API_URL}${ENDPOINTS.USER_INFO}`);
            if (response.data) {
              // Session is valid, update user data if needed
              const updatedUser = { ...user, ...response.data };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              
              setAuthState({
                authenticated: true,
                user: updatedUser,
                loading: false,
              });
            } else {
              // Session is invalid, clear storage
              await AsyncStorage.removeItem('user');
              setAuthState({
                authenticated: false,
                user: null,
                loading: false,
              });
            }
          } catch (error) {
            // API error, assume session expired
            await AsyncStorage.removeItem('user');
            setAuthState({
              authenticated: false,
              user: null,
              loading: false,
            });
          }
        } else {
          setAuthState({
            authenticated: false,
            user: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error loading authentication state:', error);
        setAuthState({
          authenticated: false,
          user: null,
          loading: false,
        });
      }
      
      setIsLoading(false);
    };

    loadStoredAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      // Set axios to send cookies
      axios.defaults.withCredentials = true;
      
      const response = await axios.post(`${API_URL}${ENDPOINTS.LOGIN}`, {
        email,
        password,
      });
      
      if (response.data.success) {
        // Get user info after login
        const userInfoResponse = await axios.get(`${API_URL}${ENDPOINTS.USER_INFO}`);
        
        const user = {
          id: response.data.id || null,
          email: email,
          name: userInfoResponse.data?.name || email.split('@')[0], // Fallback to email username
        };
        
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setAuthState({
          authenticated: true,
          user,
          loading: false,
        });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Network error'
      };
    }
  };

  // Register function
  const register = async (name, email, password, confirmPassword) => {
    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.REGISTER}`, {
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      
      return { 
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Network error'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint
      await axios.get(`${API_URL}${ENDPOINTS.LOGOUT}`);
      
      // Clear local storage
      await AsyncStorage.removeItem('user');
      
      // Update state
      setAuthState({
        authenticated: false,
        user: null,
        loading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if API fails, clear local state
      await AsyncStorage.removeItem('user');
      setAuthState({
        authenticated: false,
        user: null,
        loading: false,
      });
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      // Update locally first
      const updatedUser = { ...authState.user, ...profileData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      setAuthState({
        ...authState,
        user: updatedUser,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  };

  // Provide auth context value
  const authContextValue = {
    authState,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};