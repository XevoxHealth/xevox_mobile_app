import axios from 'axios';

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
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
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
      const response = await axiosInstance.post('/api/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await axiosInstance.post('/api/logout');
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

  // Device connection endpoints
  async connectDevice(provider = 'default') {
    try {
      const response = await axiosInstance.post('/connect-device', { provider });
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  // Error handling
  _handleError(error) {
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      console.error('API Error Response:', error.response.data);
      
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