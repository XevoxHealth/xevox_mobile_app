import { 
  NativeModules, 
  NativeEventEmitter, 
  Platform, 
  PermissionsAndroid,
  Alert
} from 'react-native';

// Import your API service
let api;
try {
  api = require('./api_service').api;
} catch (e) {
  console.warn('API service not available');
  api = null;
}

// Native Modules - will be undefined on web, defined on native
const HBandSDK = Platform.select({
  ios: NativeModules.HBandSDK,
  android: NativeModules.HBandAndroidSDK, // You'll need to create this
  default: null
});

class BluetoothManager {
  constructor() {
    this.isScanning = false;
    this.connectedDevice = null;
    this.discoveredDevices = [];
    this.listeners = [];
    this.eventEmitter = null;
    
    // Initialize event emitter for native events
    if (HBandSDK && Platform.OS !== 'web') {
      this.eventEmitter = new NativeEventEmitter(HBandSDK);
      this.setupEventListeners();
    }
    
    console.log('BluetoothManager initialized for platform:', Platform.OS);
  }

  // Setup event listeners for device events
  setupEventListeners() {
    if (!this.eventEmitter) return;

    // Device discovery events
    this.eventEmitter.addListener('onDeviceFound', (device) => {
      console.log('Device found:', device);
      this.handleDeviceDiscovered(device);
    });

    // Connection status events
    this.eventEmitter.addListener('onConnectionStateChanged', (status) => {
      console.log('Connection state changed:', status);
      this.handleConnectionStatusChanged(status);
    });

    // Health data received events
    this.eventEmitter.addListener('onHealthDataReceived', (data) => {
      console.log('Health data received:', data);
      this.handleHealthDataReceived(data);
    });

    // Battery level updates
    this.eventEmitter.addListener('onBatteryLevelChanged', (level) => {
      console.log('Battery level changed:', level);
      this.handleBatteryLevelChanged(level);
    });

    // Error events
    this.eventEmitter.addListener('onError', (error) => {
      console.error('Bluetooth error:', error);
      this.handleBluetoothError(error);
    });
  }

  // Request necessary permissions for Bluetooth operations
  async requestPermissions() {
    if (Platform.OS === 'web') {
      console.log('Web platform - no permissions needed');
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

        const allPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allPermissionsGranted) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth and location permissions are required to connect to your smartwatch.',
            [{ text: 'OK' }]
          );
          return false;
        }

        return true;
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }

    // iOS permissions are handled automatically by the system
    return true;
  }

  // Initialize the Bluetooth SDK
  async initialize() {
    try {
      console.log('Initializing Bluetooth SDK...');
      
      if (Platform.OS === 'web') {
        console.log('Web platform - using demo mode');
        return { success: true, message: 'Demo mode initialized' };
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted');
      }

      if (!HBandSDK) {
        throw new Error('HBand SDK not available - native modules not configured');
      }

      // Initialize the native SDK
      const result = await HBandSDK.initialize();
      
      if (result.success) {
        console.log('Bluetooth SDK initialized successfully');
        return result;
      } else {
        throw new Error(result.message || 'SDK initialization failed');
      }
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      throw error;
    }
  }

  // Start scanning for nearby smartwatches
  async scanForDevices(timeoutMs = 10000) {
    try {
      console.log('Starting device scan...');
      
      if (this.isScanning) {
        console.log('Already scanning, stopping current scan...');
        await this.stopScan();
      }

      this.discoveredDevices = [];
      this.isScanning = true;
      this.notifyListeners('scanStarted', { timeout: timeoutMs });

      if (Platform.OS === 'web') {
        // Demo mode for web - simulate device discovery
        setTimeout(() => {
          const demoDevices = [
            {
              id: 'demo-watch-1',
              name: 'HBand Watch Pro',
              address: 'AA:BB:CC:DD:EE:FF',
              rssi: -45,
              manufacturer: 'HBand',
              deviceType: 'smartwatch',
              batteryLevel: 85
            },
            {
              id: 'demo-watch-2', 
              name: 'Fitness Tracker X1',
              address: 'FF:EE:DD:CC:BB:AA',
              rssi: -65,
              manufacturer: 'HBand',
              deviceType: 'fitness_tracker',
              batteryLevel: 92
            }
          ];
          
          demoDevices.forEach((device, index) => {
            setTimeout(() => {
              this.handleDeviceDiscovered(device);
            }, (index + 1) * 1000);
          });
        }, 500);

        // Auto-stop scan after timeout
        setTimeout(() => {
          if (this.isScanning) {
            this.stopScan();
          }
        }, timeoutMs);

        return { success: true };
      }

      if (!HBandSDK) {
        throw new Error('HBand SDK not available');
      }

      // Start native scan
      const result = await HBandSDK.startScan(timeoutMs);
      
      if (!result.success) {
        this.isScanning = false;
        throw new Error(result.message || 'Failed to start scan');
      }

      // Auto-stop scan after timeout
      setTimeout(() => {
        if (this.isScanning) {
          this.stopScan();
        }
      }, timeoutMs);

      return result;
    } catch (error) {
      this.isScanning = false;
      console.error('Scan start error:', error);
      this.notifyListeners('scanError', { error: error.message });
      throw error;
    }
  }

  // Stop scanning for devices
  async stopScan() {
    try {
      console.log('Stopping device scan...');
      this.isScanning = false;

      if (Platform.OS === 'web') {
        this.notifyListeners('scanStopped', {});
        return { success: true };
      }

      if (!HBandSDK) {
        return { success: false, message: 'SDK not available' };
      }

      const result = await HBandSDK.stopScan();
      this.notifyListeners('scanStopped', {});
      
      return result;
    } catch (error) {
      console.error('Scan stop error:', error);
      return { success: false, message: error.message };
    }
  }

  // Connect to a specific device
  async connectToDevice(deviceId, deviceAddress) {
    try {
      console.log(`Connecting to device: ${deviceId} (${deviceAddress})`);
      
      if (Platform.OS === 'web') {
        // Demo mode - simulate connection
        const device = this.discoveredDevices.find(d => d.id === deviceId);
        if (!device) {
          throw new Error('Device not found');
        }

        setTimeout(() => {
          this.connectedDevice = device;
          this.handleConnectionStatusChanged({
            connected: true,
            device: device,
            message: 'Connected successfully'
          });
        }, 2000);

        return { success: true, message: 'Connection initiated' };
      }

      if (!HBandSDK) {
        throw new Error('HBand SDK not available');
      }

      // Connect using native SDK
      const result = await HBandSDK.connectDevice(deviceAddress);
      
      if (result.success) {
        console.log('Connection initiated successfully');
        return result;
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.notifyListeners('connectionError', { error: error.message });
      throw error;
    }
  }

  // Disconnect from current device
  async disconnectDevice() {
    try {
      console.log('Disconnecting device...');
      
      if (!this.connectedDevice) {
        return { success: true, message: 'No device connected' };
      }

      if (Platform.OS === 'web') {
        // Demo mode
        const device = this.connectedDevice;
        this.connectedDevice = null;
        
        this.handleConnectionStatusChanged({
          connected: false,
          device: device,
          message: 'Disconnected successfully'
        });
        
        return { success: true };
      }

      if (!HBandSDK) {
        return { success: false, message: 'SDK not available' };
      }

      const result = await HBandSDK.disconnect();
      
      if (result.success) {
        this.connectedDevice = null;
      }
      
      return result;
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  }

  // Sync user profile data with the connected device
  async syncUserProfile(userProfile) {
    try {
      console.log('Syncing user profile:', userProfile);
      
      if (!this.connectedDevice) {
        throw new Error('No device connected');
      }

      const profile = {
        age: userProfile.age || 25,
        height: userProfile.height || 170, // cm
        weight: userProfile.weight || 70,  // kg
        gender: userProfile.gender === 'female' ? 1 : 0, // 0: male, 1: female
        targetSteps: userProfile.targetSteps || 10000,
        ...userProfile
      };

      if (Platform.OS === 'web') {
        // Demo mode
        setTimeout(() => {
          this.notifyListeners('profileSynced', { profile });
        }, 1000);
        return { success: true };
      }

      if (!HBandSDK) {
        throw new Error('SDK not available');
      }

      const result = await HBandSDK.syncUserProfile(profile);
      return result;
    } catch (error) {
      console.error('Profile sync error:', error);
      throw error;
    }
  }

  // Get real-time health data from connected device
  async getHealthData() {
    try {
      console.log('Getting health data from device...');
      
      if (!this.connectedDevice) {
        throw new Error('No device connected');
      }

      if (Platform.OS === 'web') {
        // Return demo health data
        const demoData = this.generateDemoHealthData();
        return { success: true, data: demoData };
      }

      if (!HBandSDK) {
        throw new Error('SDK not available');
      }

      const result = await HBandSDK.getHealthData();
      
      if (result.success) {
        // Format the health data
        const formattedData = this.formatHealthData(result.data);
        return { success: true, data: formattedData };
      }
      
      return result;
    } catch (error) {
      console.error('Get health data error:', error);
      throw error;
    }
  }

  // Start real-time health data monitoring
  async startHealthMonitoring() {
    try {
      console.log('Starting real-time health monitoring...');
      
      if (!this.connectedDevice) {
        throw new Error('No device connected');
      }

      if (Platform.OS === 'web') {
        // Demo mode - simulate periodic health data updates
        this.startDemoHealthUpdates();
        return { success: true };
      }

      if (!HBandSDK) {
        throw new Error('SDK not available');
      }

      const result = await HBandSDK.startRealTimeMonitoring();
      return result;
    } catch (error) {
      console.error('Start monitoring error:', error);
      throw error;
    }
  }

  // Stop real-time health data monitoring
  async stopHealthMonitoring() {
    try {
      console.log('Stopping real-time health monitoring...');
      
      if (this.demoHealthInterval) {
        clearInterval(this.demoHealthInterval);
        this.demoHealthInterval = null;
      }

      if (Platform.OS === 'web') {
        return { success: true };
      }

      if (!HBandSDK) {
        return { success: false, message: 'SDK not available' };
      }

      const result = await HBandSDK.stopRealTimeMonitoring();
      return result;
    } catch (error) {
      console.error('Stop monitoring error:', error);
      throw error;
    }
  }

  // Event handlers
  handleDeviceDiscovered(device) {
    console.log('Device discovered:', device);
    
    // Filter for supported devices and avoid duplicates
    const isSupported = this.isSupportedDevice(device);
    const alreadyFound = this.discoveredDevices.find(d => d.id === device.id || d.address === device.address);
    
    if (isSupported && !alreadyFound) {
      this.discoveredDevices.push({
        id: device.id || device.address,
        name: device.name || 'Unknown Device',
        address: device.address,
        rssi: device.rssi || -100,
        manufacturer: device.manufacturer || 'Unknown',
        deviceType: device.deviceType || 'smartwatch',
        batteryLevel: device.batteryLevel,
        ...device
      });

      this.notifyListeners('deviceFound', device);
    }
  }

  handleConnectionStatusChanged(status) {
    console.log('Connection status changed:', status);
    
    if (status.connected && status.device) {
      this.connectedDevice = status.device;
      
      // Register device with backend
      if (api) {
        this.registerDeviceWithBackend(status.device);
      }
      
      // Start health monitoring automatically
      setTimeout(() => {
        this.startHealthMonitoring().catch(console.error);
      }, 2000);
      
    } else if (!status.connected) {
      this.connectedDevice = null;
      this.stopHealthMonitoring().catch(console.error);
    }

    this.notifyListeners('connectionStatusChanged', status);
  }

  handleHealthDataReceived(data) {
    console.log('Health data received:', data);
    const formattedData = this.formatHealthData(data);
    
    // Send to backend if API is available
    if (api && this.connectedDevice) {
      this.syncHealthDataWithBackend(formattedData);
    }
    
    this.notifyListeners('healthDataReceived', formattedData);
  }

  handleBatteryLevelChanged(level) {
    console.log('Battery level changed:', level);
    this.notifyListeners('batteryLevelChanged', { level });
  }

  handleBluetoothError(error) {
    console.error('Bluetooth error:', error);
    this.notifyListeners('bluetoothError', error);
  }

  // Utility methods
  isSupportedDevice(device) {
    const supportedNames = [
      'hband', 'h-band', 'fitness', 'smartwatch', 'band', 'watch',
      'tracker', 'health', 'sport', 'mi band', 'amazfit'
    ];
    
    const deviceName = (device.name || '').toLowerCase();
    return supportedNames.some(name => deviceName.includes(name));
  }

  formatHealthData(rawData) {
    if (!rawData) return {};
    
    return {
      steps: rawData.steps || 0,
      heartRate: rawData.heartRate || rawData.bpm || 0,
      bloodPressure: {
        systolic: rawData.systolicBP || 0,
        diastolic: rawData.diastolicBP || 0
      },
      bloodOxygen: rawData.bloodOxygen || rawData.spo2 || 0,
      sleep: {
        duration: rawData.sleepDuration || 0,
        quality: rawData.sleepQuality || 0
      },
      calories: rawData.calories || 0,
      distance: rawData.distance || 0,
      timestamp: new Date().toISOString(),
      deviceInfo: {
        name: this.connectedDevice?.name,
        address: this.connectedDevice?.address,
        batteryLevel: this.connectedDevice?.batteryLevel
      }
    };
  }

  generateDemoHealthData() {
    return {
      steps: Math.floor(Math.random() * 3000) + 5000,
      heartRate: Math.floor(Math.random() * 30) + 60,
      bloodPressure: {
        systolic: Math.floor(Math.random() * 20) + 110,
        diastolic: Math.floor(Math.random() * 15) + 70
      },
      bloodOxygen: Math.floor(Math.random() * 5) + 95,
      sleep: {
        duration: Math.random() * 2 + 6,
        quality: Math.floor(Math.random() * 20) + 75
      },
      calories: Math.floor(Math.random() * 500) + 1200,
      distance: Math.random() * 3 + 2,
      timestamp: new Date().toISOString()
    };
  }

  startDemoHealthUpdates() {
    this.demoHealthInterval = setInterval(() => {
      if (this.connectedDevice) {
        const demoData = this.generateDemoHealthData();
        this.handleHealthDataReceived(demoData);
      }
    }, 5000); // Update every 5 seconds
  }

  async registerDeviceWithBackend(device) {
    if (!api) return;
    
    try {
      const result = await api.connectSmartwatch({
        device_name: device.name,
        device_address: device.address,
        device_type: device.deviceType || 'smartwatch',
        manufacturer: device.manufacturer
      });
      
      console.log('Device registered with backend:', result);
    } catch (error) {
      console.error('Failed to register device with backend:', error);
    }
  }

  async syncHealthDataWithBackend(healthData) {
    if (!api) return;
    
    try {
      const result = await api.syncHealthData({
        user_id: 'current_user', // This should be the actual user ID
        device_type: this.connectedDevice?.deviceType || 'smartwatch',
        device_id: this.connectedDevice?.address,
        timestamp: new Date().toISOString(),
        data: healthData
      });
      
      console.log('Health data synced with backend:', result);
    } catch (error) {
      console.error('Failed to sync health data with backend:', error);
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
    return this.connectedDevice !== null;
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
    console.log('Cleaning up Bluetooth manager...');
    
    this.stopScan();
    this.stopHealthMonitoring();
    
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners();
    }
    
    this.listeners = [];
    this.discoveredDevices = [];
    this.connectedDevice = null;
  }
}

// Export singleton instance
export default new BluetoothManager();