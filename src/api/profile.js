import axios from 'axios';
import { API_URL, ENDPOINTS, DEVICE_PROVIDERS } from './config';

// Get user info
export const getUserInfo = async () => {
  try {
    const response = await axios.get(`${API_URL}${ENDPOINTS.USER_INFO}`, {
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
};

// Connect a health device using SpikeAPI
export const connectDevice = async (provider) => {
  try {
    const response = await axios.post(
      `${API_URL}${ENDPOINTS.CONNECT_DEVICE}`, 
      { provider },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error connecting device:', error);
    throw error;
  }
};

// Get available device providers (for UI selection)
export const getAvailableProviders = () => {
  return DEVICE_PROVIDERS;
};

// Check if a device is connected
export const checkDeviceConnection = async (userId) => {
  try {
    // We can use the user info endpoint to check if device_id exists
    const userInfo = await getUserInfo();
    return {
      isConnected: !!userInfo.device_id,
      provider: userInfo.device_id || null,
      status: userInfo.device_connection_status || 'disconnected'
    };
  } catch (error) {
    console.error('Error checking device connection:', error);
    return { isConnected: false, provider: null, status: 'error' };
  }
};

// Upload avatar (mock implementation)
export const uploadAvatar = async (imageUri) => {
  try {
    const formData = new FormData();
    
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    
    // Note: Your API doesn't seem to have an endpoint for this yet
    // This is a placeholder implementation
    console.log('Would upload avatar to API if endpoint existed');
    
    // Return a mock success response
    return {
      success: true,
      avatarUrl: imageUri
    };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};