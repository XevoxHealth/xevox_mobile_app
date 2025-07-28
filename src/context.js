// Updated context.js - Fix user data storage structure
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Alert } from 'react-native';
import { api } from './api_service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage utility for cross-platform compatibility
const storage = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } else {
        // React Native
        return await AsyncStorage.getItem(key);
      }
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return true;
      } else {
        // React Native
        await AsyncStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.error('Storage setItem error:', e);
      return false;
    }
  },
  
  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        return true;
      } else {
        // React Native
        await AsyncStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.error('Storage removeItem error:', e);
      return false;
    }
  }
};

export { storage };

// Auth Context
const AuthContext = createContext();

const authInitialState = {
  authenticated: false,
  user: null,
  token: null,
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...state,
        user: action.user,
        token: action.token,
        authenticated: action.token !== null,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...state,
        authenticated: true,
        user: action.user,
        token: action.token,
        isLoading: false,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        authenticated: false,
        user: null,
        token: null,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.user },
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, authInitialState);

  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      const userToken = await storage.getItem('userToken');
      const userData = await storage.getItem('userData');
      
      console.log('🔄 Restoring auth state...');
      console.log('Token exists:', !!userToken);
      console.log('User data exists:', !!userData);
      
      if (userToken && userData) {
        const user = JSON.parse(userData);
        console.log('✅ Restored user:', { id: user.id, email: user.email });
        
        // Set the token in API service
        api.setAuthToken(userToken);
        
        dispatch({
          type: 'RESTORE_TOKEN',
          token: userToken,
          user: user,
        });
      } else {
        console.log('❌ No stored auth data found');
        dispatch({
          type: 'RESTORE_TOKEN',
          token: null,
          user: null,
        });
      }
    } catch (error) {
      console.error('❌ Error restoring token:', error);
      dispatch({
        type: 'RESTORE_TOKEN',
        token: null,
        user: null,
      });
    }
  };

  const signIn = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      console.log('🔐 Attempting login for:', email);
      
      const result = await api.login(email, password);
      console.log('🔐 Login result:', { success: result.success, hasToken: !!result.token });
      
      if (result.success && result.token) {
        const user = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email
        };
        
        console.log('✅ Storing auth data:', { userId: user.id, email: user.email });
        
        // Store both token and user data
        await storage.setItem('userToken', result.token);
        await storage.setItem('userData', JSON.stringify(user));
        
        // Verify storage worked
        const storedToken = await storage.getItem('userToken');
        const storedUser = await storage.getItem('userData');
        console.log('🔍 Verification - Token stored:', !!storedToken);
        console.log('🔍 Verification - User stored:', !!storedUser);
        
        // Set token in API service
        api.setAuthToken(result.token);
        
        dispatch({
          type: 'SIGN_IN',
          token: result.token,
          user: user,
        });
        
        console.log('✅ Sign in completed successfully');
        return { success: true };
      } else {
        console.log('❌ Login failed:', result.message);
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      dispatch({ type: 'SET_LOADING', isLoading: false });
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your connection and try again.' 
      };
    }
  };

  const signUp = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      const result = await api.register(userData);
      
      if (result.success) {
        // Auto-login after successful registration
        const loginResult = await api.login(userData.email, userData.password);
        
        if (loginResult.success && loginResult.token) {
          const user = {
            id: loginResult.user.id,
            name: loginResult.user.name,
            email: loginResult.user.email
          };
          
          await storage.setItem('userToken', loginResult.token);
          await storage.setItem('userData', JSON.stringify(user));
          
          api.setAuthToken(loginResult.token);
          
          dispatch({
            type: 'SIGN_IN',
            token: loginResult.token,
            user: user,
          });
          
          return { success: true };
        } else {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          return { success: false, message: 'Registration successful but login failed. Please login manually.' };
        }
      } else {
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return { success: false, message: result.message };
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      console.error('Sign up error:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please check your connection and try again.' 
      };
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await storage.removeItem('userToken');
      await storage.removeItem('userData');
      api.setAuthToken(null);
      
      dispatch({ type: 'SIGN_OUT' });
      
      Alert.alert('Success', 'You have been signed out successfully');
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', user: userData });
  };

  // DEBUG: Log current auth state
  useEffect(() => {
    console.log('🔍 AUTH STATE UPDATED:');
    console.log('  Authenticated:', authState.authenticated);
    console.log('  User ID:', authState.user?.id);
    console.log('  User Email:', authState.user?.email);
    console.log('  Token exists:', !!authState.token);
    console.log('  Loading:', authState.isLoading);
  }, [authState]);

  const value = {
    authState,
    signIn,
    signUp,
    signOut,
    updateUser,
    isLoading: authState.isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Health Context
const HealthContext = createContext();

const healthInitialState = {
  healthData: null,
  isLoading: false,
  error: null,
  connectedDevice: null,
  lastSync: null,
};

const healthReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
        error: action.isLoading ? null : state.error,
      };
    case 'SET_HEALTH_DATA':
      return {
        ...state,
        healthData: action.data,
        isLoading: false,
        error: null,
        lastSync: new Date().toISOString(),
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };
    case 'SET_CONNECTED_DEVICE':
      return {
        ...state,
        connectedDevice: action.device,
      };
    case 'CLEAR_HEALTH_DATA':
      return healthInitialState;
    default:
      return state;
  }
};

export const HealthProvider = ({ children }) => {
  const [healthState, dispatch] = useReducer(healthReducer, healthInitialState);

  const fetchHealthData = async (timeframe = 'day') => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      const data = await api.getHealthData(timeframe);
      dispatch({ type: 'SET_HEALTH_DATA', data });
      return data;
    } catch (error) {
      console.error('Error fetching health data:', error);
      dispatch({ type: 'SET_ERROR', error: error.message });
      throw error;
    }
  };

  const connectDevice = async (deviceInfo) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      const result = await api.connectSmartwatch(deviceInfo);
      if (result.success) {
        dispatch({ type: 'SET_CONNECTED_DEVICE', device: deviceInfo });
      }
      return result;
    } catch (error) {
      console.error('Error connecting device:', error);
      dispatch({ type: 'SET_ERROR', error: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  };

  const value = {
    healthState,
    fetchHealthData,
    connectDevice,
  };

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};