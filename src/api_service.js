import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL from environment or default
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service with all endpoints
class ApiService {
  // Auth token management
  setAuthToken(token) {
    if (!token) {
      console.warn('Attempted to set empty auth token');
      return;
    }
    console.log('Setting auth token');
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    console.log('Clearing auth token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  }

  // Auth endpoints
  async register(name, email, password, confirmPassword) {
    try {
      const response = await axiosInstance.post('/api/register', {
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      const response = await axiosInstance.post('/api/login', {
        email,
        password,
      });
      
      // If login successful and token received, set it immediately
      if (response.data && response.data.token) {
        console.log('Login successful, setting token');
        this.setAuthToken(response.data.token);
      } else {
        console.warn('Login response missing token:', response.data);
      }
      
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await axiosInstance.post('/api/logout');
      this.clearAuthToken();
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async getUserInfo() {
    try {
      const response = await axiosInstance.get('/api/user-info');
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  // Health data endpoints
  async getHealthData(timeframe = 'day') {
    try {
      const response = await axiosInstance.get('/api/get-health-data', {
        params: { timeframe },
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async getObservations() {
    try {
      const response = await axiosInstance.get('/api/get-observations');
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async getRecommendations() {
    try {
      const response = await axiosInstance.get('/api/get-recommendations');
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async getHealthAdvice() {
    try {
      const response = await axiosInstance.get('/api/get-health-advice');
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  // Chat endpoints
  async sendChatMessage(message) {
    try {
      const formData = new FormData();
      formData.append('message', message);
      
      const response = await axiosInstance.post('/api/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  // Device connection endpoints - FIXED ENDPOINT
  async connectDevice(provider = 'default') {
    try {
      // Ensure we have a token set
      const token = await AsyncStorage.getItem('token');
      if (token) {
        this.setAuthToken(token);
      }
      
      console.log('Connecting device...');
      console.log('Auth header:', axiosInstance.defaults.headers.common['Authorization'] ? 'Present' : 'Missing');
      
      const response = await axiosInstance.post('/api/connect-device', { provider });
      console.log('Connect device response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error connecting device:', error);
      // Log more details if available
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      this._handleError(error);
      throw error;
    }
  }

  // Add a method to verify the token is valid
  async verifyToken() {
    try {
      console.log('Verifying auth token...');
      const response = await axiosInstance.get('/api/user-info');
      console.log('Token is valid');
      return { valid: true, user: response.data };
    } catch (error) {
      console.error('Token verification failed:', error.response?.status);
      return { valid: false, error };
    }
  }

  // Error handling
  _handleError(error) {
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      console.error('API Error Response:', error.response.status, error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        // You could trigger a logout here if needed
        console.warn('Authentication failed, user should re-login');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('API Request Error:', error.message);
    }
  }
}

// Create a singleton instance
export const api = new ApiService();

export default api;