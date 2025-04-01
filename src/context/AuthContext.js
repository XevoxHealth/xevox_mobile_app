import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../api/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    authenticated: false,
    user: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        
        if (token && userData) {
          setAuthState({
            authenticated: true,
            user: JSON.parse(userData),
            token,
          });
          
          // Set auth header for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.log('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/api/login`, { email, password });
      
      if (response.data.success) {
        // Mock token since your API doesn't seem to return one
        const token = 'mock-session-token';
        
        // Get user info
        const userResponse = await axios.get(`${API_URL}/api/user-info`, {
          headers: { 'Cookie': `session_token=${token}` }
        });
        
        const user = {
          email,
          name: userResponse.data.name || email,
        };
        
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Set auth header for all requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setAuthState({
          authenticated: true,
          user,
          token,
        });
        
        return { success: true };
      } else {
        return { 
          success: false,
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error) {
      return { 
        success: false,
        message: error.response?.data?.message || 'Network error'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password, confirmPassword) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/api/register`, {
        name,
        email,
        password,
        confirm_password: confirmPassword
      });
      
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      return { 
        success: false,
        message: error.response?.data?.message || 'Network error'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Remove auth header
      delete axios.defaults.headers.common['Authorization'];
      
      setAuthState({
        authenticated: false,
        user: null,
        token: null,
      });
      
      // Call logout endpoint
      await axios.get(`${API_URL}/logout`);
      
      return { success: true };
    } catch (error) {
      console.log('Logout error:', error);
      return { success: false, message: 'Error during logout' };
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      // Update user data in AsyncStorage
      const currentUser = JSON.parse(await AsyncStorage.getItem('user'));
      const updatedUser = { ...currentUser, ...userData };
      
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      setAuthState({
        ...authState,
        user: updatedUser
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to update profile' };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    authState,
    isLoading,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};