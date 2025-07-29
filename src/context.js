import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';

// Simple auth context for fallback
const AuthContext = createContext();
const HealthContext = createContext();

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    authenticated: false,
    isLoading: false,
    user: null,
    token: null,
  });

  const signIn = async (email, password) => {
    console.log('Simple signIn called');
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simple mock authentication
    setTimeout(() => {
      setAuthState({
        authenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Demo User',
          email: email,
        },
        token: 'demo-token',
      });
    }, 1000);

    return { success: true };
  };

  const signUp = async (userData) => {
    console.log('Simple signUp called');
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simple mock registration
    setTimeout(() => {
      setAuthState({
        authenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: userData.name,
          email: userData.email,
        },
        token: 'demo-token',
      });
    }, 1000);

    return { success: true };
  };

  const signOut = () => {
    setAuthState({
      authenticated: false,
      isLoading: false,
      user: null,
      token: null,
    });
    Alert.alert('Signed Out', 'You have been signed out successfully');
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
    healthData: null,
    connectedDevice: null,
  });

  const fetchHealthData = async () => {
    console.log('Simple fetchHealthData called');
    setHealthState(prev => ({ ...prev, isLoading: true }));
    
    // Mock health data
    setTimeout(() => {
      setHealthState(prev => ({
        ...prev,
        isLoading: false,
        healthData: {
          steps: 8543,
          heartRate: 78,
          sleep: 7.5,
          calories: 324,
        },
      }));
    }, 1000);
  };

  const connectDevice = async (device) => {
    console.log('Simple connectDevice called');
    setHealthState(prev => ({
      ...prev,
      connectedDevice: device,
    }));
    return { success: true };
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