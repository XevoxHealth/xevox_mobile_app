// Real API service that connects to your FastAPI backend
class ApiService {
  constructor() {
    this.authToken = null;
    this.baseURL = 'http://localhost:5000'; // Your FastAPI server
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  // Authentication API calls
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          confirm_password: userData.confirmPassword,
        }),
      });

      const result = await response.json();
      
      return {
        success: result.success || false,
        message: result.message || 'Registration failed',
        user: result.user,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: `Registration failed: ${error.message}`,
      };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          token: result.token,
          user: {
            id: result.id,
            name: result.name,
            email: email,
          },
        };
      } else {
        return {
          success: false,
          message: result.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: `Login failed: ${error.message}`,
      };
    }
  }

  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      return { success: response.ok };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  async getUserInfo() {
    try {
      const response = await fetch(`${this.baseURL}/api/user-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to get user info');
      }
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  }

  // Health Data API calls
  async getHealthData(timeframe = 'day') {
    try {
      const response = await fetch(`${this.baseURL}/api/get-health-data?timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to get health data');
      }
    } catch (error) {
      console.error('Get health data error:', error);
      throw error;
    }
  }

  async syncHealthData(healthData) {
    try {
      const response = await fetch(`${this.baseURL}/api/sync-health-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(healthData),
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to sync health data');
      }
    } catch (error) {
      console.error('Sync health data error:', error);
      throw error;
    }
  }

  // Device Connection API calls
  async connectSmartwatch(deviceInfo) {
    try {
      const response = await fetch(`${this.baseURL}/api/connect-smartwatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(deviceInfo),
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to connect smartwatch');
      }
    } catch (error) {
      console.error('Connect smartwatch error:', error);
      throw error;
    }
  }

  async getConnectedDevices() {
    try {
      const response = await fetch(`${this.baseURL}/api/device-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          devices: data.connected ? [data] : []
        };
      } else {
        return { devices: [] };
      }
    } catch (error) {
      console.error('Get connected devices error:', error);
      return { devices: [] };
    }
  }

  async disconnectDevice(deviceId) {
    try {
      const response = await fetch(`${this.baseURL}/api/disconnect-smartwatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to disconnect device');
      }
    } catch (error) {
      console.error('Disconnect device error:', error);
      throw error;
    }
  }

  // Chat API calls
  async sendChatMessage(message) {
    try {
      const formData = new FormData();
      formData.append('message', message);

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to send chat message');
      }
    } catch (error) {
      console.error('Send chat message error:', error);
      return {
        success: false,
        user_message: message,
        assistant_response: "Sorry, I'm having trouble responding right now. Please try again.",
      };
    }
  }

  // Chronic Conditions monitoring
  async getChronicConditions() {
    try {
      const response = await fetch(`${this.baseURL}/api/get-chronic-conditions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.conditions || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('Get chronic conditions error:', error);
      return [];
    }
  }

  async getObservations() {
    try {
      const response = await fetch(`${this.baseURL}/api/get-observations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          observations: data.observations || "No observations available"
        };
      } else {
        return { observations: "Unable to load observations" };
      }
    } catch (error) {
      console.error('Get observations error:', error);
      return { observations: "Unable to load observations" };
    }
  }

  async getRecommendations() {
    try {
      const response = await fetch(`${this.baseURL}/api/get-recommendations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          recommendations: data.recommendations || "No recommendations available"
        };
      } else {
        return { recommendations: "Unable to load recommendations" };
      }
    } catch (error) {
      console.error('Get recommendations error:', error);
      return { recommendations: "Unable to load recommendations" };
    }
  }

  async getHealthAdvice() {
    try {
      const response = await fetch(`${this.baseURL}/api/get-health-advice`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.advice || 'Keep maintaining a healthy lifestyle.';
      } else {
        return 'Keep maintaining a healthy lifestyle.';
      }
    } catch (error) {
      console.error('Get health advice error:', error);
      return 'Keep maintaining a healthy lifestyle.';
    }
  }

  // Utility method to check backend connection
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseURL}/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      return response.ok;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const api = new ApiService();