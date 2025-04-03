import axios from 'axios';
import { API_URL, ENDPOINTS } from './config';

// Get health data from SpikeAPI backend
export const getHealthData = async (timeframe = 'day', userId) => {
  try {
    const response = await axios.get(`${API_URL}${ENDPOINTS.HEALTH_DATA}`, {
      params: {
        timeframe,
        user_id: userId
      },
      withCredentials: true,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting health data:', error);
    throw error;
  }
};

// Helper function to process health data for charts
export const processHealthDataForCharts = (healthData) => {
  const chartData = {};
  
  // Process data for each metric
  Object.keys(healthData).forEach(metric => {
    if (healthData[metric] && healthData[metric].values && healthData[metric].timestamps) {
      chartData[metric] = healthData[metric].values.map((value, index) => ({
        value,
        timestamp: healthData[metric].timestamps[index]
      }));
    }
  });
  
  return chartData;
};

// Format health status with appropriate color and icon
export const formatHealthStatus = (metric, status) => {
  const statusMap = {
    normal: { color: '#4CAF50', icon: 'checkmark-circle' },
    good: { color: '#4CAF50', icon: 'checkmark-circle' },
    low: { color: '#FFC107', icon: 'alert-circle' },
    high: { color: '#FFC107', icon: 'alert-circle' },
    bad: { color: '#F44336', icon: 'close-circle' },
    unknown: { color: '#9E9E9E', icon: 'help-circle' }
  };
  
  return statusMap[status] || statusMap.unknown;
};

// Filter available metrics based on what's returned from the API
export const getAvailableMetrics = (healthData, allMetrics) => {
  if (!healthData) return allMetrics;
  
  return allMetrics.filter(metric => 
    healthData[metric.id] && 
    healthData[metric.id].values && 
    healthData[metric.id].values.length > 0
  );
};