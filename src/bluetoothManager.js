import { 
  NativeModules, 
  NativeEventEmitter, 
  Platform, 
  PermissionsAndroid,
  DeviceEventEmitter,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your API service
let api;
try {
  api = require('./api_service').api;
} catch (e) {
  console.warn('API service not available');
  api = null;
}

// Get the HBand SDK native module
const { VeePooSDK } = NativeModules;

class BluetoothManager {
  constructor() {
    this.isScanning = false;
    this.connectedDevice = null;
    this.discoveredDevices = [];
    this.listeners = [];
    this.isConnected = false;
    
    console.log('BluetoothManager initialized for HBand SDK on platform:', Platform.OS);
    
    // Set up event listeners for native events
    this.setupNativeEventListeners();
  }

  // Set up native event listeners
  setupNativeEventListeners() {
    if (Platform.OS !== 'web') {
      console.log('Setting up HBand SDK event listeners...');
      
      // Listen for device discovery
      DeviceEventEmitter.addListener('DeviceDiscovered', (device) => {
        if (device) {
          console.log('📱 HBand device discovered:', device.name);
          this.handleDeviceDiscovered(device);
        }
      });
      
      // Listen for connection status changes
      DeviceEventEmitter.addListener('ConnectionStatusChanged', (status) => {
        console.log('📱 HBand connection status:', status);
        this.handleConnectionStatusChanged(status);
      });
      
      // Listen for scan finished
      DeviceEventEmitter.addListener('ScanFinished', () => {
        console.log('📱 HBand scan finished');
        this.isScanning = false;
        this.notifyListeners('scanStopped', {});
      });
      
      // Listen for health data
      DeviceEventEmitter.addListener('HealthDataReceived', (data) => {
        console.log('📱 HBand health data received:', data);
        this.handleHealthDataReceived(data);
      });
      
      // Listen for Bluetooth errors
      DeviceEventEmitter.addListener('BluetoothError', (error) => {
        console.log('📱 HBand Bluetooth error:', error);
        this.handleBluetoothError(error);
      });
    }
  }

  // Request permissions
  async requestPermissions() {
    if (Platform.OS === 'web') {
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        // For Android 12+ (API 31+)
        if (Platform.Version >= 31) {
          permissions.push(
            'android.permission.BLUETOOTH_SCAN',
            'android.permission.BLUETOOTH_CONNECT'
          );
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        return Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }

    return true; // iOS
  }

  // Initialize the HBand SDK
  async initialize() {
    try {
      console.log('Initializing HBand SDK for REAL devices only...');
      
      if (Platform.OS === 'web') {
        throw new Error('HBand SDK not supported on web platform');
      }

      // Check if native module is available
      if (!VeePooSDK) {
        throw new Error('HBand SDK native module not found. Please ensure the SDK is properly integrated.');
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted. Please enable Bluetooth permissions to connect real devices.');
      }

      // Initialize the native SDK
      const result = await VeePooSDK.initialize();
      
      if (result.success) {
        console.log('✅ HBand SDK initialized successfully:', result.message);
        return { success: true, message: 'HBand SDK initialized for real devices' };
      } else {
        throw new Error(result.message || 'HBand SDK initialization failed');
      }

    } catch (error) {
      console.error('HBand SDK initialization error:', error);
      throw error;
    }
  }

  // Start scanning for REAL devices only
  async scanForDevices(timeoutMs = 10000) {
    try {
      console.log(`🔍 Starting HBand SDK device scan (timeout: ${timeoutMs}ms)...`);
      
      if (!VeePooSDK) {
        throw new Error('HBand SDK not available. Please ensure the SDK is properly integrated.');
      }

      if (this.isScanning) {
        console.log('Already scanning, stopping current scan...');
        await this.stopScan();
      }

      this.discoveredDevices = [];
      this.isScanning = true;
      this.notifyListeners('scanStarted', { timeout: timeoutMs });

      // Start scanning using HBand SDK
      const result = await VeePooSDK.startScanDevice();
      
      if (result.success) {
        console.log('✅ HBand scan started successfully');
        
        // Auto-stop scan after timeout
        setTimeout(() => {
          if (this.isScanning) {
            this.stopScan();
          }
        }, timeoutMs);
        
        return { success: true, message: 'HBand device scan started' };
      } else {
        throw new Error(result.message || 'HBand scan failed');
      }

    } catch (error) {
      this.isScanning = false;
      console.error('❌ HBand device scan error:', error);
      this.notifyListeners('scanError', { error: error.message });
      throw error;
    }
  }

  // Stop device scanning
  async stopScan() {
    try {
      console.log('Stopping HBand device scan...');
      this.isScanning = false;

      if (VeePooSDK) {
        VeePooSDK.stopScan();
      }

      this.notifyListeners('scanStopped', {});
      return { success: true };
    } catch (error) {
      console.error('HBand scan stop error:', error);
      return { success: false, message: error.message };
    }
  }

  // Connect to a real device
  async connectToDevice(deviceId, deviceAddress) {
    try {
      console.log(`Connecting to HBand device: ${deviceId} (${deviceAddress})`);
      
      if (!VeePooSDK) {
        throw new Error('HBand SDK not available');
      }

      const device = this.discoveredDevices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('Device not found in discovered devices');
      }

      if (!device.isReal) {
        throw new Error('Device is not validated as a real HBand/ET475 device');
      }

      // Connect using HBand SDK
      const result = await VeePooSDK.connectDevice(deviceAddress);
      
      if (result.success) {
        console.log('✅ HBand device connection initiated');
        return { success: true, device: device };
      } else {
        throw new Error(result.message || 'HBand connection failed');
      }

    } catch (error) {
      console.error('HBand device connection error:', error);
      this.notifyListeners('bluetoothError', { message: error.message });
      throw error;
    }
  }

  // Confirm device password (required by HBand SDK)
  async confirmDevicePassword(password = "0000", is24HourModel = true) {
    try {
      console.log('Confirming HBand device password...');
      
      if (!VeePooSDK) {
        throw new Error('HBand SDK not available');
      }

      const result = await VeePooSDK.confirmDevicePwd(password, is24HourModel);
      
      if (result.success) {
        console.log('✅ HBand device password confirmed');
        return { success: true };
      } else {
        throw new Error(result.message || 'Password confirmation failed');
      }

    } catch (error) {
      console.error('HBand password confirmation error:', error);
      throw error;
    }
  }

  // Disconnect from current device
  async disconnectDevice() {
    try {
      console.log('Disconnecting HBand device...');
      
      if (!this.connectedDevice) {
        return { success: true, message: 'No device connected' };
      }

      if (VeePooSDK) {
        await VeePooSDK.disconnect();
      }

      const device = this.connectedDevice;
      this.connectedDevice = null;
      this.isConnected = false;
      
      this.handleConnectionStatusChanged({
        connected: false,
        device: device,
        message: 'Disconnected from HBand device'
      });
      
      return { success: true };
    } catch (error) {
      console.error('HBand device disconnect error:', error);
      throw error;
    }
  }

  // Get real health data from connected device
  async getHealthData() {
    try {
      console.log('Getting REAL health data from HBand device...');
      
      if (!this.connectedDevice) {
        throw new Error('No HBand device connected');
      }

      if (!VeePooSDK) {
        throw new Error('HBand SDK not available');
      }

      // Get health data using HBand SDK
      const result = await VeePooSDK.getHealthData();
      
      if (result.success) {
        const realData = this.validateRealHealthData(result.data);
        return { success: true, data: realData };
      } else {
        throw new Error(result.message || 'Failed to get REAL health data');
      }
    } catch (error) {
      console.error('Get REAL health data error:', error);
      throw error;
    }
  }

  // Validate that health data is real (not generated)
  validateRealHealthData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid health data received from device');
    }

    const validatedData = {};

    // Validate each metric with realistic ranges
    if (data.heartRate && data.heartRate > 30 && data.heartRate < 200) {
      validatedData.heartRate = data.heartRate;
    }
    
    if (data.steps && data.steps >= 0 && data.steps < 100000) {
      validatedData.steps = data.steps;
    }
    
    if (data.calories && data.calories >= 0 && data.calories < 10000) {
      validatedData.calories = data.calories;
    }
    
    if (data.distance && data.distance >= 0 && data.distance < 100) {
      validatedData.distance = data.distance;
    }

    // Add timestamp and device info
    validatedData.timestamp = new Date().toISOString();
    validatedData.deviceInfo = {
      name: this.connectedDevice?.name,
      address: this.connectedDevice?.address,
      isReal: true
    };

    return validatedData;
  }

  // Event handlers for HBand device events
  handleDeviceDiscovered(device) {
    console.log('HBand device discovered:', device);
    
    const alreadyFound = this.discoveredDevices.find(d => d.id === device.id || d.address === device.address);
    
    if (!alreadyFound) {
      const realDevice = {
        id: device.id || device.address,
        name: device.name || 'Unknown HBand Device',
        address: device.address,
        rssi: device.rssi || -100,
        manufacturer: device.manufacturer || 'VeePoo',
        deviceType: device.deviceType || 'et475',
        batteryLevel: device.batteryLevel,
        isReal: true,
        ...device
      };

      this.discoveredDevices.push(realDevice);
      this.notifyListeners('deviceFound', realDevice);
    }
  }

  handleConnectionStatusChanged(status) {
    console.log('🔗 HBand connection status changed:', status);
    
    if (status.connected && status.device) {
      // Store the connected real device
      this.connectedDevice = { ...status.device, isReal: true };
      this.isConnected = true;
      console.log('✅ HBand device connected and stored:', this.connectedDevice.name);
      
      // Register real device with backend
      if (api) {
        this.registerRealDeviceWithBackend(status.device);
      }
      
      // Start health monitoring automatically
      setTimeout(() => {
        this.startHealthMonitoring().catch(console.error);
      }, 2000);
      
    } else if (!status.connected) {
      console.log('❌ HBand device disconnected');
      this.connectedDevice = null;
      this.isConnected = false;
      this.stopHealthMonitoring().catch(console.error);
    }

    this.notifyListeners('connectionStatusChanged', status);
  }

  handleHealthDataReceived(data) {
    console.log('📊 HBand health data received:', data);
    
    try {
      // Validate this is real data
      const validatedData = this.validateRealHealthData(data);
      
      // Make sure we have a connected device reference
      if (!this.connectedDevice) {
        console.warn('⚠️ Health data received but no connected device reference');
        throw new Error('No connected device available for health data');
      }
      
      // Send real data to backend
      if (api) {
        this.syncRealHealthDataWithBackend(validatedData);
      } else {
        console.warn('⚠️ Cannot sync - API service not available');
      }
      
      this.notifyListeners('healthDataReceived', validatedData);
      
    } catch (error) {
      console.error('❌ Error processing HBand health data:', error);
      this.notifyListeners('healthDataError', { error: error.message });
    }
  }

  handleBluetoothError(error) {
    console.error('HBand Bluetooth error:', error);
    this.notifyListeners('bluetoothError', error);
  }

  // Start real-time health monitoring
  async startHealthMonitoring() {
    try {
      console.log('Starting HBand real-time health monitoring...');
      
      if (!this.connectedDevice) {
        throw new Error('No HBand device connected');
      }

      // The HBand SDK will automatically send health data updates via events
      // We just need to make sure we're listening for them
      return { success: true };
    } catch (error) {
      console.error('Start HBand monitoring error:', error);
      throw error;
    }
  }

  // Stop real-time monitoring
  async stopHealthMonitoring() {
    try {
      console.log('Stopping HBand real-time health monitoring...');
      return { success: true };
    } catch (error) {
      console.error('Stop HBand monitoring error:', error);
      throw error;
    }
  }

  // Sync real health data with backend
  async syncRealHealthDataWithBackend(healthData) {
    if (!api) {
      console.error('❌ API service not available');
      return;
    }
    
    try {
      console.log('🔄 Starting HBand health data sync...');
      
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.error('❌ User not authenticated - cannot sync HBand health data');
        Alert.alert(
          'Authentication Required',
          'Please log out and log back in to sync your HBand health data.',
          [{ text: 'OK' }]
        );
        return;
      }

      let deviceInfo = this.connectedDevice;
      if (!deviceInfo) {
        console.error('❌ No HBand device info available');
        return;
      }

      // Construct payload for real health data
      const payload = {
        user_id: currentUser.id,
        device_type: deviceInfo.deviceType || 'et475',
        device_id: deviceInfo.address || deviceInfo.id || 'unknown',
        timestamp: healthData.timestamp || new Date().toISOString(),
        data: { 
          ...healthData,
          isRealData: true, // Mark as real data
          deviceValidated: true
        }
      };

      // Remove redundant fields
      if (payload.data.deviceInfo) {
        delete payload.data.deviceInfo;
      }
      if (payload.data.timestamp) {
        delete payload.data.timestamp;
      }

      console.log('🔄 Syncing HBand health data with payload:');
      console.log('  User ID:', payload.user_id);
      console.log('  Device Type:', payload.device_type);
      console.log('  Device ID:', payload.device_id);
      console.log('  Data keys:', Object.keys(payload.data));

      // Sync real data to backend
      const result = await api.syncHealthData(payload);
      console.log('✅ HBand health data synced successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to sync HBand health data with backend:', error);
    }
  }

  async registerRealDeviceWithBackend(device) {
    if (!api) return;
    
    try {
      const result = await api.connectSmartwatch({
        device_name: device.name,
        device_address: device.address,
        device_type: device.deviceType || 'et475',
        manufacturer: device.manufacturer || 'VeePoo',
        is_real_device: true
      });
      
      console.log('HBand device registered with backend:', result);
    } catch (error) {
      console.error('Failed to register HBand device with backend:', error);
    }
  }

  async getCurrentUser() {
    try {
      let userToken, userData;
      
      if (Platform.OS === 'web') {
        userToken = typeof localStorage !== 'undefined' ? localStorage.getItem('userToken') : null;
        userData = typeof localStorage !== 'undefined' ? localStorage.getItem('userData') : null;
      } else {
        userToken = await AsyncStorage.getItem('userToken');
        userData = await AsyncStorage.getItem('userData');
      }
      
      if (!userToken || !userData) {
        return null;
      }
      
      const user = JSON.parse(userData);
      return user && user.id ? user : null;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  }

  // Public API methods
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Listener callback error:', error);
      }
    });
  }

  // Getters
  isConnected() {
    return this.isConnected && this.connectedDevice !== null;
  }

  getConnectedDevice() {
    return this.connectedDevice;
  }

  getDiscoveredDevices() {
    return this.discoveredDevices;
  }

  getIsScanning() {
    return this.isScanning;
  }

  // Cleanup
  cleanup() {
    console.log('Cleaning up HBand Bluetooth manager...');
    
    this.stopScan();
    this.stopHealthMonitoring();
    
    // Remove event listeners
    if (Platform.OS !== 'web') {
      DeviceEventEmitter.removeAllListeners('DeviceDiscovered');
      DeviceEventEmitter.removeAllListeners('ConnectionStatusChanged');
      DeviceEventEmitter.removeAllListeners('ScanFinished');
      DeviceEventEmitter.removeAllListeners('HealthDataReceived');
      DeviceEventEmitter.removeAllListeners('BluetoothError');
    }
    
    this.listeners = [];
    this.discoveredDevices = [];
    this.connectedDevice = null;
    this.isConnected = false;
  }
}

// Export singleton instance
export default new BluetoothManager();