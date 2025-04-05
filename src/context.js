import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api_service';

// =========== Auth Context ===========
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
      token: null,
      authenticated: false,
      user: null,
      id: null,
      name: null,
    });
    const [isLoading, setIsLoading] = useState(true);
  
    // Check for token on app load
    useEffect(() => {
      const loadToken = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const userData = await AsyncStorage.getItem('user');
          
          if (token && userData) {
            const user = JSON.parse(userData);
            
            // Set token in API service first
            api.setAuthToken(token);
            
            // Verify token is still valid by making a quick API call
            try {
              const userInfo = await api.getUserInfo();
              
              // If successful, set auth state
              setAuthState({
                token,
                authenticated: true,
                user,
                id: user.id,
                name: user.name || userInfo.name, // Use server data if available
              });
            } catch (e) {
              // Token might be invalid, clear everything
              console.warn('Stored token appears invalid, clearing auth state');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              api.clearAuthToken();
            }
          }
        } catch (error) {
          console.error('Error loading auth info', error);
        } finally {
          setIsLoading(false);
        }
      };
  
      loadToken();
    }, []);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const response = await api.login(email, password);
      
      if (response.success) {
        const { token, id, name } = response;
        const user = { id, name };
        
        // Save to storage
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Update auth state
        setAuthState({
          token,
          authenticated: true,
          user,
          id,
          name,
        });
        
        // Set default header for future API calls
        api.setAuthToken(token);
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error', error);
      return { success: false, message: error.message || 'An error occurred' };
    }
  };

  // Sign up function
  const signUp = async (name, email, password, confirmPassword) => {
    try {
      const response = await api.register(name, email, password, confirmPassword);
      return response;
    } catch (error) {
      console.error('Registration error', error);
      return { success: false, message: error.message || 'An error occurred' };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await api.logout();
      
      // Clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Reset auth state
      setAuthState({
        token: null,
        authenticated: false,
        user: null,
        id: null,
        name: null,
      });
      
      // Clear auth header
      api.clearAuthToken();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error', error);
      return { success: false, message: error.message || 'An error occurred' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// =========== Health Data Context ===========
const HealthContext = createContext();

export const HealthProvider = ({ children }) => {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();

  const fetchHealthData = async (timeframe = 'day') => {
    if (!authState.authenticated) return;
    
    setIsLoading(true);
    try {
      const data = await api.getHealthData(timeframe);
      setHealthData(data);
      return data;
    } catch (error) {
      console.error('Error fetching health data', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount or auth change
  useEffect(() => {
    if (authState.authenticated) {
      fetchHealthData();
    }
  }, [authState.authenticated]);

  return (
    <HealthContext.Provider
      value={{
        healthData,
        isLoading,
        fetchHealthData,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => useContext(HealthContext);

// Combined provider for easy import
export const AppProviders = ({ children }) => (
  <AuthProvider>
    <HealthProvider>
      {children}
    </HealthProvider>
  </AuthProvider>
);