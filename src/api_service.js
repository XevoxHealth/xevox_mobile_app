// Fixed api_service.js - Real Device Data Validation and No Demo Data
class ApiService {
  constructor() {
    this.authToken = null;
    this.baseURL = 'http://192.168.1.107:5000';
    this.isLoggingOut = false;
    this.realDeviceConnected = false;
    this.deviceInfo = null;
  }

  setAuthToken(token) {
    this.authToken = token;
    console.log('🔑 Auth token set:', token ? 'Token exists' : 'Token cleared');
  }

  setLoggingOut(isLoggingOut) {
    this.isLoggingOut = isLoggingOut;
    console.log('🚪 Logout state:', isLoggingOut ? 'Logging out' : 'Normal operation');
  }

  setRealDeviceConnected(isConnected, deviceInfo = null) {
    this.realDeviceConnected = isConnected;
    this.deviceInfo = deviceInfo;
    console.log('📱 Real device status:', isConnected ? 'Connected' : 'Disconnected');
    if (deviceInfo) {
      console.log('📱 Device info:', deviceInfo);
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('🔑 Including auth header with token');
    } else {
      if (!this.isLoggingOut) {
        console.warn('⚠️ No auth token available');
      }
    }
    
    return headers;
  }

  async login(email, password) {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        this.setAuthToken(result.token);
        
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

  async register(userData) {
    try {
      console.log('📝 Attempting registration for:', userData.email);
      
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

  async logout() {
    try {
      this.setLoggingOut(true);
      
      const response = await fetch(`${this.baseURL}/api/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      this.setRealDeviceConnected(false, null);

      return { success: response.ok };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    } finally {
      this.setLoggingOut(false);
    }
  }

  async getUserInfo() {
    if (this.isLoggingOut) {
      console.log('👤 Skipping getUserInfo during logout');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/user-info`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to get user info');
      }
    } catch (error) {
      console.error('Get user info error:', error);
      
      if (this.isLoggingOut) {
        console.log('👤 getUserInfo failed during logout (expected)');
        return null;
      }
      
      throw error;
    }
  }

  async getHealthData(timeframe = 'day') {
    if (this.isLoggingOut) {
      console.log('👤 Skipping getHealthData during logout');
      return {};
    }

    if (!this.authToken) {
      console.log('👤 No auth token for getHealthData');
      return {};
    }

    try {
      console.log('📊 Fetching REAL health data from API, timeframe:', timeframe);
      
      const response = await fetch(`${this.baseURL}/api/get-health-data?timeframe=${timeframe}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      console.log('📊 Health data response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Health data received:', Object.keys(data));
        
        const validatedData = this.validateRealHealthData(data);
        console.log('📊 Validated real data keys:', Object.keys(validatedData));
        
        return validatedData;
      } else {
        const errorText = await response.text();
        console.error('📊 Health data fetch failed:', response.status, errorText);
        
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 Health data fetch failed during logout/auth error (expected)');
          return {};
        }
        
        throw new Error(`Failed to get health data: ${response.status}`);
      }
    } catch (error) {
      console.error('📊 Get health data error:', error);
      
      if (this.isLoggingOut) {
        console.log('👤 getHealthData error during logout (expected)');
        return {};
      }
      
      throw error;
    }
  }

  validateRealHealthData(data) {
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Invalid health data received');
      return {};
    }

    const validatedData = {};
    let realDataCount = 0;

    for (const [key, value] of Object.entries(data)) {
      if (key === '_metadata') {
        validatedData[key] = value;
        continue;
      }

      if (value && typeof value === 'object') {
        if (value.is_real === true) {
          validatedData[key] = value;
          realDataCount++;
          console.log(`✅ Validated real data for ${key}`);
        } else {
          validatedData[key] = {
            values: [],
            timestamps: [],
            average: 0,
            status: "normal",
            current_value: 0,
            last_updated: null,
            is_real: false
          };
          console.log(`❌ Rejected non-real data for ${key}`);
        }
      } else {
        validatedData[key] = {
          values: [],
          timestamps: [],
          average: 0,
          status: "normal", 
          current_value: 0,
          last_updated: null,
          is_real: false
        };
      }
    }

    console.log(`📊 Validated ${realDataCount} real health metrics out of ${Object.keys(data).length} total`);
    
    validatedData._validation = {
      real_metrics_count: realDataCount,
      validated_at: new Date().toISOString(),
      source: 'real_device_only'
    };

    return validatedData;
  }

  async syncHealthData(healthData) {
    if (this.isLoggingOut) {
      console.log('👤 Skipping syncHealthData during logout');
      return { success: false, message: 'Logging out' };
    }

    try {
      console.log('🔄 Syncing REAL health data with validation...');
      console.log('📊 Health data payload keys:', Object.keys(healthData.data || {}));
      
      if (!this.authToken) {
        throw new Error('No authentication token available. Please login again.');
      }

      if (!this.validateHealthDataPayload(healthData)) {
        throw new Error('Invalid health data payload. Only real device data is accepted.');
      }
      
      const response = await fetch(`${this.baseURL}/api/sync-health-data`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(healthData),
      });

      console.log('📡 Sync response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ REAL health data synced successfully:', result);
        return result;
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        
        console.error('❌ Sync failed:', response.status, errorData);
        
        if (this.isLoggingOut) {
          console.log('👤 Sync failed during logout (expected)');
          return { success: false, message: 'Logged out' };
        }
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          throw new Error('User ID mismatch. Please logout and login again.');
        } else {
          throw new Error(errorData.detail || `HTTP ${response.status}: Failed to sync health data`);
        }
      }
    } catch (error) {
      console.error('❌ Sync REAL health data error:', error);
      
      if (this.isLoggingOut) {
        console.log('👤 syncHealthData error during logout (expected)');
        return { success: false, message: 'Logged out' };
      }
      
      throw error;
    }
  }

  validateHealthDataPayload(healthData) {
    if (!healthData || typeof healthData !== 'object') {
      console.error('❌ Invalid health data payload structure');
      return false;
    }

    if (!healthData.data || typeof healthData.data !== 'object') {
      console.error('❌ Health data payload missing data field');
      return false;
    }

    const data = healthData.data;
    
    if (!data.isRealData) {
      console.error('❌ Health data payload not marked as real data');
      return false;
    }

    if (!data.deviceValidated) {
      console.error('❌ Health data payload device not validated');
      return false;
    }

    const deviceType = healthData.device_type;
    if (!deviceType || !this.isValidRealDeviceType(deviceType)) {
      console.error('❌ Invalid or unsupported device type:', deviceType);
      return false;
    }

    const deviceId = healthData.device_id;
    if (!deviceId || deviceId === 'unknown' || deviceId.length < 6) {
      console.error('❌ Invalid device ID:', deviceId);
      return false;
    }

    console.log('✅ Health data payload validated as real device data');
    return true;
  }

  isValidRealDeviceType(deviceType) {
    const validRealDevices = [
      'et475', 'et-475', 'et_475',
      'hband', 'h-band', 'h_band',
      'amazfit', 'mi_band', 'veepoo',
      'smartwatch', 'fitness_tracker'
    ];
    
    return validRealDevices.includes(deviceType.toLowerCase());
  }

  async connectSmartwatch(deviceInfo) {
    if (this.isLoggingOut) {
      console.log('👤 Skipping connectSmartwatch during logout');
      return { success: false, message: 'Logging out' };
    }

    try {
      console.log('📱 Connecting real smartwatch:', deviceInfo);
      
      if (!this.validateRealDeviceInfo(deviceInfo)) {
        throw new Error('Device validation failed. Only real ET475 and compatible devices are supported.');
      }

      const response = await fetch(`${this.baseURL}/api/connect-smartwatch`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...deviceInfo,
          is_real_device: true,
          validated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real device connected:', result);
        
        this.setRealDeviceConnected(true, deviceInfo);
        
        return result;
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 connectSmartwatch failed during logout (expected)');
          return { success: false, message: 'Not authenticated' };
        }
        throw new Error('Failed to connect real smartwatch to backend');
      }
    } catch (error) {
      console.error('Connect real smartwatch error:', error);
      
      if (this.isLoggingOut) {
        return { success: false, message: 'Logged out' };
      }
      
      throw error;
    }
  }

  validateRealDeviceInfo(deviceInfo) {
    if (!deviceInfo || typeof deviceInfo !== 'object') {
      console.error('❌ Invalid device info structure');
      return false;
    }

    if (!deviceInfo.device_name || deviceInfo.device_name.trim() === '') {
      console.error('❌ Device name is required');
      return false;
    }

    if (!deviceInfo.device_address || deviceInfo.device_address.length < 6) {
      console.error('❌ Valid device address is required');
      return false;
    }

    if (!deviceInfo.device_type || !this.isValidRealDeviceType(deviceInfo.device_type)) {
      console.error('❌ Valid device type is required');
      return false;
    }

    const deviceName = deviceInfo.device_name.toLowerCase();
    const validNamePatterns = [
      'et475', 'et-475', 'et 475',
      'hband', 'h-band', 'h band',
      'amazfit', 'mi band', 'veepoo',
      'fitness', 'smart', 'health'
    ];

    const hasValidName = validNamePatterns.some(pattern => deviceName.includes(pattern));
    if (!hasValidName) {
      console.error('❌ Device name does not match real device patterns:', deviceName);
      return false;
    }

    console.log('✅ Real device info validated:', deviceInfo.device_name);
    return true;
  }

  async getConnectedDevices() {
    if (this.isLoggingOut) {
      console.log('👤 Skipping getConnectedDevices during logout');
      return { devices: [] };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/device-status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.connected && this.validateConnectedDeviceResponse(data)) {
          return { devices: [data] };
        } else {
          console.log('⚠️ Connected device is not validated as real device');
          return { devices: [] };
        }
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 getConnectedDevices failed during logout (expected)');
        }
        return { devices: [] };
      }
    } catch (error) {
      console.error('Get connected devices error:', error);
      return { devices: [] };
    }
  }

  validateConnectedDeviceResponse(deviceData) {
    if (!deviceData || typeof deviceData !== 'object') {
      return false;
    }

    if (!deviceData.device_type || !this.isValidRealDeviceType(deviceData.device_type)) {
      console.warn('⚠️ Connected device has invalid type:', deviceData.device_type);
      return false;
    }

    if (!deviceData.device_name) {
      console.warn('⚠️ Connected device has no name');
      return false;
    }

    console.log('✅ Connected device validated as real device');
    return true;
  }

  async disconnectDevice(deviceId) {
    if (this.isLoggingOut) {
      console.log('👤 Skipping disconnectDevice during logout');
      return { success: true, message: 'Logged out' };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/disconnect-smartwatch`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        this.setRealDeviceConnected(false, null);
        
        return result;
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 disconnectDevice failed during logout (expected)');
          return { success: true, message: 'Logged out' };
        }
        throw new Error('Failed to disconnect device');
      }
    } catch (error) {
      console.error('Disconnect device error:', error);
      
      if (this.isLoggingOut) {
        return { success: true, message: 'Logged out' };
      }
      
      throw error;
    }
  }

  async sendChatMessage(message) {
    if (this.isLoggingOut) {
      console.log('👤 Skipping sendChatMessage during logout');
      return {
        success: false,
        user_message: message,
        assistant_response: "I'm currently unavailable as you're logging out.",
      };
    }

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
        const result = await response.json();
        
        if (result.success && result.assistant_response) {
          const hasRealData = result.health_context_used === true;
          if (hasRealData) {
            result.assistant_response += "\n\n(Based on your real device data ✓)";
          } else if (this.realDeviceConnected) {
            result.assistant_response += "\n\n(Connect your ET475 for personalized insights)";
          }
        }
        
        return result;
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 sendChatMessage failed during logout (expected)');
          return {
            success: false,
            user_message: message,
            assistant_response: "I'm currently unavailable. Please try again after logging in.",
          };
        }
        throw new Error('Failed to send chat message');
      }
    } catch (error) {
      console.error('Send chat message error:', error);
      
      if (this.isLoggingOut) {
        return {
          success: false,
          user_message: message,
          assistant_response: "I'm currently unavailable as you're logging out.",
        };
      }
      
      return {
        success: false,
        user_message: message,
        assistant_response: "Sorry, I'm having trouble responding right now. Please ensure your real device is connected and try again.",
      };
    }
  }

  async getChronicConditions() {
    if (this.isLoggingOut || !this.authToken) {
      console.log('👤 Skipping getChronicConditions (logout or no auth)');
      return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/api/get-chronic-conditions`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const conditions = data.conditions || [];
        
        const realConditions = conditions.filter(condition => 
          condition.data_source === 'real_device'
        );
        
        console.log(`📊 Returning ${realConditions.length} conditions based on real data`);
        return realConditions;
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 getChronicConditions failed during logout (expected)');
        }
        return [];
      }
    } catch (error) {
      console.error('Get chronic conditions error:', error);
      return [];
    }
  }

  async getObservations() {
    if (this.isLoggingOut || !this.authToken) {
      console.log('👤 Skipping getObservations (logout or no auth)');
      return { observations: "Please log in and connect your real ET475 device to get health observations" };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/get-observations`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        let observations = data.observations || "No observations available";
        
        if (observations && !observations.includes("real data") && !observations.includes("Real data")) {
          if (this.realDeviceConnected) {
            observations += " (Connect your ET475 for real-time insights)";
          } else {
            observations = "Connect your real ET475 or compatible device to get health observations based on actual measurements.";
          }
        }
        
        return { observations };
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 getObservations failed during logout (expected)');
          return { observations: "Please log in and connect your real device to get health observations" };
        }
        return { observations: "Unable to load observations. Please ensure your real device is connected." };
      }
    } catch (error) {
      console.error('Get observations error:', error);
      return { observations: "Unable to load observations. Please ensure your real ET475 device is connected." };
    }
  }

  async getRecommendations() {
    if (this.isLoggingOut || !this.authToken) {
      console.log('👤 Skipping getRecommendations (logout or no auth)');
      return { recommendations: "Please log in and connect your real ET475 device to get health recommendations" };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/get-recommendations`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        let recommendations = data.recommendations || "No recommendations available";
        
        if (recommendations && !recommendations.includes("real data") && !recommendations.includes("Real data")) {
          if (this.realDeviceConnected) {
            recommendations += " (Based on your real device data when available)";
          } else {
            recommendations = "Connect your real ET475 or compatible device to receive personalized recommendations based on actual measurements.";
          }
        }
        
        return { recommendations };
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 getRecommendations failed during logout (expected)');
          return { recommendations: "Please log in and connect your real device to get health recommendations" };
        }
        return { recommendations: "Unable to load recommendations. Please ensure your real device is connected." };
      }
    } catch (error) {
      console.error('Get recommendations error:', error);
      return { recommendations: "Unable to load recommendations. Please ensure your real ET475 device is connected." };
    }
  }

  async getHealthAdvice() {
    if (this.isLoggingOut || !this.authToken) {
      console.log('👤 Skipping getHealthAdvice (logout or no auth)');
      return 'Please log in and connect your real ET475 device to get personalized health advice.';
    }

    try {
      const response = await fetch(`${this.baseURL}/api/get-health-advice`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        let advice = data.advice || 'Keep maintaining a healthy lifestyle.';
        
        if (advice && !advice.includes("real data") && !advice.includes("Real data")) {
          if (this.realDeviceConnected) {
            advice += " (Personalized advice will improve with more real device data)";
          } else {
            advice = "Connect your real ET475 or compatible device to receive personalized health advice based on your actual health measurements.";
          }
        }
        
        return advice;
      } else {
        if (this.isLoggingOut || response.status === 401) {
          console.log('👤 getHealthAdvice failed during logout (expected)');
          return 'Please log in and connect your real device to get personalized health advice.';
        }
        return 'Unable to provide health advice. Please ensure your real ET475 device is connected.';
      }
    } catch (error) {
      console.error('Get health advice error:', error);
      return 'Unable to provide health advice. Please ensure your real ET475 device is connected and syncing data.';
    }
  }

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

  getRealDeviceStatus() {
    return {
      connected: this.realDeviceConnected,
      deviceInfo: this.deviceInfo,
      lastCheck: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const api = new ApiService();