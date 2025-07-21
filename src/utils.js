import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// ============= Responsive Utils =============
// Scale based on screen size
export const scale = (size) => {
  const baseWidth = 375; // Standard iPhone width
  return (width / baseWidth) * size;
};

// Vertical scale for paddings/margins
export const verticalScale = (size) => {
  const baseHeight = 812; // Standard iPhone height
  return (height / baseHeight) * size;
};

// Scale for font sizes
export const fontScale = (size) => {
  const factor = PixelRatio.getFontScale();
  return size / factor;
};

// ============= Date Utils =============
// Format date to readable format
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format date to time
export const formatTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now - d) / 1000);
  
  // Seconds
  if (seconds < 60) {
    return 'just now';
  }
  
  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Days
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Months
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  
  // Years
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

// ============= Color Utils =============
// Lighten or darken a color
export const adjustColor = (color, amount) => {
  let usePound = false;
  
  if (color[0] === '#') {
    color = color.slice(1);
    usePound = true;
  }
  
  const num = parseInt(color, 16);
  
  let r = (num >> 16) + amount;
  r = Math.max(Math.min(r, 255), 0);
  
  let g = ((num >> 8) & 0x00FF) + amount;
  g = Math.max(Math.min(g, 255), 0);
  
  let b = (num & 0x0000FF) + amount;
  b = Math.max(Math.min(b, 255), 0);
  
  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

// Convert hex to rgba for transparency
export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ============= Validation Utils =============
// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (minimum 8 characters, at least one letter and one number)
export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  
  return hasLetter && hasNumber && hasUppercase;
};

// Password strength checker
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'None' };
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character diversity check
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Calculate final score (0-5)
  const finalScore = Math.min(5, Math.floor(score / 2));
  
  // Return score and label
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  return {
    score: finalScore,
    label: labels[finalScore]
  };
};

// ============= Network Utils =============
// Check if device is online
export const isOnline = async () => {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// ============= Health Data Utils =============
// Format health values based on metric type
export const formatHealthValue = (value, metric) => {
  if (value === undefined || value === null) return 'N/A';
  
  switch (metric) {
    case 'steps':
      return Math.round(value).toLocaleString();
    case 'heartRate':
      return Math.round(value);
    case 'sleep':
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}h ${minutes}m`;
    case 'caloriesBurned':
      return Math.round(value).toLocaleString();
    case 'bloodOxygen':
      return `${Math.round(value)}%`;
    case 'hrv':
      return `${Math.round(value)}ms`;
    default:
      return typeof value === 'number' && !Number.isInteger(value) 
        ? value.toFixed(1) 
        : value.toString();
  }
};

export const getUnitForMetric = (metric) => {
  const units = {
    steps: 'steps',
    heartRate: 'bpm',
    sleep: 'hrs',
    caloriesBurned: 'kcal',
    bloodOxygen: '%',
    hrv: 'ms'
  };
  return units[metric] || '';
};

// Get color based on health metric status
export const getMetricStatusColor = (status) => {
  switch (status) {
    case 'low':
      return '#F59E0B'; // Amber
    case 'normal':
      return '#10B981'; // Green
    case 'high':
      return '#EF4444'; // Red
    case 'good':
      return '#10B981'; // Green
    case 'bad':
      return '#EF4444'; // Red
    default:
      return '#718096'; // Gray
  }
};

// Export all utils
export default {
  scale,
  verticalScale,
  fontScale,
  formatDate,
  formatTime,
  getRelativeTime,
  adjustColor,
  hexToRgba,
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  isOnline,
  formatHealthValue,
  getMetricStatusColor
};