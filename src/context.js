import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import API service
import { api } from './api_service';

// Create contexts
const AuthContext = createContext();
const HealthContext = createContext();

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    authenticated: false,
    isLoading: true,
    isLoggingOut: false,
    user: null,
    token: null,
  });

  // Check for existing auth on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('Checking existing auth state...');
      
      let token, userData;
      
      if (Platform.OS === 'web') {
        token = typeof localStorage !== 'undefined' ? localStorage.getItem('userToken') : null;
        userData = typeof localStorage !== 'undefined' ? localStorage.getItem('userData') : null;
      } else {
        token = await AsyncStorage.getItem('userToken');
        userData = await AsyncStorage.getItem('userData');
      }

      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('Found existing auth:', user.email);
        
        // Set API token
        api.setAuthToken(token);
        
        setAuthState({
          authenticated: true,
          isLoading: false,
          isLoggingOut: false,
          user: user,
          token: token,
        });
      } else {
        console.log('No existing auth found');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('SignIn attempt:', email);
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await api.login(email, password);
      console.log('Login result:', result);

      if (result.success) {
        const userData = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        };

        // Store auth data
        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(userData));
          }
        } else {
          await AsyncStorage.setItem('userToken', result.token);
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        }

        setAuthState({
          authenticated: true,
          isLoading: false,
          isLoggingOut: false,
          user: userData,
          token: result.token,
        });

        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('SignIn error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: error.message };
    }
  };

  const signUp = async (userData) => {
    try {
      console.log('SignUp attempt:', userData.email);
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await api.register(userData);
      console.log('Register result:', result);

      if (result.success) {
        // Auto sign in after successful registration
        const loginResult = await api.login(userData.email, userData.password);
        
        if (loginResult.success) {
          const userInfo = {
            id: loginResult.user.id,
            name: loginResult.user.name,
            email: loginResult.user.email,
          };

          // Store auth data
          if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('userToken', loginResult.token);
              localStorage.setItem('userData', JSON.stringify(userInfo));
            }
          } else {
            await AsyncStorage.setItem('userToken', loginResult.token);
            await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
          }

          setAuthState({
            authenticated: true,
            isLoading: false,
            isLoggingOut: false,
            user: userInfo,
            token: loginResult.token,
          });

          return { success: true };
        }
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: result.message };
    } catch (error) {
      console.error('SignUp error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('SignOut initiated');
      setAuthState(prev => ({ ...prev, isLoggingOut: true }));

      // Call API logout
      await api.logout();

      // Clear stored auth data
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
      } else {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      }

      // Clear API token
      api.setAuthToken(null);

      setAuthState({
        authenticated: false,
        isLoading: false,
        isLoggingOut: false,
        user: null,
        token: null,
      });

      console.log('SignOut completed');
    } catch (error) {
      console.error('SignOut error:', error);
      // Even if API call fails, clear local state
      setAuthState({
        authenticated: false,
        isLoading: false,
        isLoggingOut: false,
        user: null,
        token: null,
      });
    }
  };

  const value = {
    authState,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Health Provider
export const HealthProvider = ({ children }) => {
  const [healthState, setHealthState] = useState({
    isLoading: false,
    healthData: {},
    connectedDevice: null,
    lastSyncTime: null,
  });

  const fetchHealthData = async (timeframe = 'day') => {
    try {
      console.log('Fetching health data:', timeframe);
      setHealthState(prev => ({ ...prev, isLoading: true }));

      const data = await api.getHealthData(timeframe);
      
      setHealthState(prev => ({
        ...prev,
        isLoading: false,
        healthData: data,
        lastSyncTime: new Date().toISOString(),
      }));

      return { success: true, data };
    } catch (error) {
      console.error('Fetch health data error:', error);
      setHealthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: error.message };
    }
  };

  const connectDevice = async (deviceInfo) => {
    try {
      console.log('Connecting device:', deviceInfo.device_name);
      
      const result = await api.connectSmartwatch(deviceInfo);
      
      if (result.success) {
        setHealthState(prev => ({
          ...prev,
          connectedDevice: deviceInfo,
        }));
      }

      return result;
    } catch (error) {
      console.error('Connect device error:', error);
      return { success: false, message: error.message };
    }
  };

  const disconnectDevice = async () => {
    try {
      console.log('Disconnecting device');
      
      const result = await api.disconnectDevice();
      
      if (result.success) {
        setHealthState(prev => ({
          ...prev,
          connectedDevice: null,
        }));
      }

      return result;
    } catch (error) {
      console.error('Disconnect device error:', error);
      return { success: false, message: error.message };
    }
  };

  const value = {
    healthState,
    fetchHealthData,
    connectDevice,
    disconnectDevice,
  };

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  );
};

// Hooks
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};