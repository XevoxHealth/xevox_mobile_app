// Replace with your actual backend API URL
// During development with the Python app, this might be something like:
// 'http://10.0.2.2:5000' for Android emulator or 'http://localhost:5000' for iOS
export const API_URL = 'http://10.0.2.2:5000';

// API endpoints
export const ENDPOINTS = {
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  LOGOUT: '/logout',
  CHAT: '/api/chat',
  USER_INFO: '/api/user-info',
  CONNECT_DEVICE: '/api/connect-device',
  HEALTH_DATA: '/api/get-health-data',
  HEALTH_ADVICE: '/api/get-health-advice',
  OBSERVATIONS: '/api/get-observations',
  RECOMMENDATIONS: '/api/get-recommendations',
};

// Health metrics available from SpikeAPI
export const HEALTH_METRICS = [
  { id: 'steps', title: 'Steps', icon: 'footsteps', unit: 'steps', description: 'Total daily steps' },
  { id: 'heartRate', title: 'Heart Rate', icon: 'heart', unit: 'BPM', description: 'Average heart rate' },
  { id: 'sleep', title: 'Sleep', icon: 'bed', unit: 'hours', description: 'Total sleep duration' },
  { id: 'stress', title: 'Stress', icon: 'fitness', unit: 'level', description: 'Stress level' },
  { id: 'hrv', title: 'HRV', icon: 'pulse', unit: 'ms', description: 'Heart rate variability' },
  { id: 'bloodPressure', title: 'Blood Pressure', icon: 'speedometer', unit: 'mmHg', description: 'Blood pressure' },
  { id: 'caloriesBurned', title: 'Calories', icon: 'flame', unit: 'kcal', description: 'Total calories burned' },
  { id: 'activities', title: 'Activities', icon: 'bicycle', unit: 'count', description: 'Activity sessions' },
  { id: 'bodyTemperature', title: 'Body Temp', icon: 'thermometer', unit: '°F', description: 'Body temperature' },
];

// Available device providers for SpikeAPI
export const DEVICE_PROVIDERS = [
  { id: 'fitbit', name: 'Fitbit', icon: 'fitness' },
  { id: 'garmin', name: 'Garmin', icon: 'watch' },
  { id: 'apple_health', name: 'Apple Health', icon: 'heart' },
  { id: 'google_fit', name: 'Google Fit', icon: 'walk' },
];