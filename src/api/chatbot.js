import axios from 'axios';
import { API_URL, ENDPOINTS } from './config';

// Send a message to the chatbot
export const sendChatMessage = async (message) => {
  try {
    const formData = new FormData();
    formData.append('message', message);
    
    const response = await axios.post(`${API_URL}${ENDPOINTS.CHAT}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

// Get health advice from the chatbot
export const getHealthAdvice = async () => {
  try {
    const response = await axios.get(`${API_URL}${ENDPOINTS.HEALTH_ADVICE}`, {
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting health advice:', error);
    throw error;
  }
};

// Get health observations
export const getHealthObservations = async () => {
  try {
    const response = await axios.get(`${API_URL}${ENDPOINTS.OBSERVATIONS}`, {
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting health observations:', error);
    throw error;
  }
};

// Get health recommendations
export const getHealthRecommendations = async () => {
  try {
    const response = await axios.get(`${API_URL}${ENDPOINTS.RECOMMENDATIONS}`, {
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting health recommendations:', error);
    throw error;
  }
};