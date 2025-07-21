// Real context.js that connects to your FastAPI backend
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Alert } from 'react-native';
import { api } from './api_service';

// Simple storage for web compatibility
const storage = {
  getItem: async (key) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return true;
    } catch (e) {
      return false;
    }
  },
  removeItem: async (key) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};

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
      
      if (userToken && userData) {
        const user = JSON.parse(userData);
        api.setAuthToken(userToken);
        dispatch({
          type: 'RESTORE_TOKEN',
          token: userToken,
          user: user,
        });
      } else {
        dispatch({
          type: 'RESTORE_TOKEN',
          token: null,
          user: null,
        });
      }
    } catch (error) {
      console.error('Error restoring token:', error);
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
      
      // Check backend connection first
      const isConnected = await api.checkConnection();
      if (!isConnected) {
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return { 
          success: false, 
          message: 'Unable to connect to the server. Make sure your backend is running on http://localhost:5000' 
        };
      }
      
      const result = await api.login(email, password);
      
      if (result.success) {
        await storage.setItem('userToken', result.token);
        await storage.setItem('userData', JSON.stringify(result.user));
        
        api.setAuthToken(result.token);
        
        dispatch({
          type: 'SIGN_IN',
          token: result.token,
          user: result.user,
        });
        
        return { success: true };
      } else {
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return { success: false, message: result.message };
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      console.error('Sign in error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your connection and try again.' 
      };
    }
  };

  const signUp = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      // Check backend connection first
      const isConnected = await api.checkConnection();
      if (!isConnected) {
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return { 
          success: false, 
          message: 'Unable to connect to the server. Make sure your backend is running on http://localhost:5000' 
        };
      }
      
      const result = await api.register(userData);
      
      if (result.success) {
        // Auto-login after successful registration
        const loginResult = await api.login(userData.email, userData.password);
        
        if (loginResult.success) {
          await storage.setItem('userToken', loginResult.token);
          await storage.setItem('userData', JSON.stringify(loginResult.user));
          
          api.setAuthToken(loginResult.token);
          
          dispatch({
            type: 'SIGN_IN',
            token: loginResult.token,
            user: loginResult.user,
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
        lastSync: new Date().toISOString(),
        isLoading: false,
        error: null,
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
      return {
        ...healthInitialState,
      };
    default:
      return state;
  }
};

export const HealthProvider = ({ children }) => {
  const [healthState, dispatch] = useReducer(healthReducer, healthInitialState);

  const fetchHealthData = async (timeframe = 'day') => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      const healthData = await api.getHealthData(timeframe);
      
      dispatch({
        type: 'SET_HEALTH_DATA',
        data: healthData,
      });
      
      return healthData;
    } catch (error) {
      console.error('Error fetching health data:', error);
      dispatch({
        type: 'SET_ERROR',
        error: 'Failed to fetch health data',
      });
      throw error;
    }
  };

  const connectDevice = async (deviceInfo) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      const result = await api.connectSmartwatch(deviceInfo);
      
      if (result.success) {
        dispatch({
          type: 'SET_CONNECTED_DEVICE',
          device: result.device_info,
        });
      }
      
      return result;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error.message || 'Failed to connect device',
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  };

  const disconnectDevice = async () => {
    try {
      await api.disconnectDevice();
      
      dispatch({
        type: 'SET_CONNECTED_DEVICE',
        device: null,
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', error: null });
  };

  const value = {
    healthState,
    fetchHealthData,
    connectDevice,
    disconnectDevice,
    clearError,
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