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