import { 
  NativeModules, 
  NativeEventEmitter, 
  Platform, 
  PermissionsAndroid,
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

// Native Modules - will be undefined on web, defined on native
const HBandSDK = Platform.select({
  ios: NativeModules.HBandSDK,
  android: NativeModules.HBandAndroidSDK,
  default: null
});

class BluetoothManager {
  constructor() {
    this.isScanning = false;
    this.connectedDevice = null;
    this.discoveredDevices = [];
    this.listeners = [];
    this.eventEmitter = null;
    this.webBluetoothDevice = null;
    this.webCharacteristics = {};
    
    console.log('BluetoothManager initialized for platform:', Platform.OS);
  }

  // Setup event listeners for device events (Native only)
  setupEventListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onDeviceFound', (device) => {
      console.log('Device found:', device);
      this.handleDeviceDiscovered(device);
    });

    this.eventEmitter.addListener('onConnectionStateChanged', (status) => {
      console.log('Connection state changed:', status);
      this.handleConnectionStatusChanged(status);
    });

    this.eventEmitter.addListener('onHealthDataReceived', (data) => {
      console.log('Health data received:', data);
      this.handleHealthDataReceived(data);
    });

    this.eventEmitter.addListener('onBatteryLevelChanged', (level) => {
      console.log('Battery level changed:', level);
      this.handleBatteryLevelChanged(level);
    });

    this.eventEmitter.addListener('onError', (error) => {
      console.error('Bluetooth error:', error);
      this.handleBluetoothError(error);
    });
  }

  // Request permissions
  async requestPermissions() {
    if (Platform.OS === 'web') {
      // Web Bluetooth doesn't require explicit permissions
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

  // Initialize the Bluetooth system
  async initialize() {
    try {
      console.log('Initializing Bluetooth SDK...');
      
      if (Platform.OS === 'web') {
        // Check Web Bluetooth availability
        if (!navigator.bluetooth) {
          console.warn('Web Bluetooth not supported. Using demo mode.');
          return { success: true, message: 'Demo mode initialized (Web Bluetooth not available)' };
        }
        
        console.log('Web Bluetooth is available');
        return { success: true, message: 'Web Bluetooth initialized' };
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted');
      }

      if (!HBandSDK) {
        console.warn('HBand SDK not available - using demo mode');
        return { success: true, message: 'Demo mode initialized (SDK not available)' };
      }

      // Initialize the native SDK
      const result = await HBandSDK.initialize();
      
      if (result.success) {
        console.log('Native Bluetooth SDK initialized successfully');
        return result;
      } else {
        throw new Error(result.message || 'SDK initialization failed');
      }
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      throw error;
    }
  }

  // Start scanning for devices
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
        return await this.webBluetoothScan(timeoutMs);
      }

      if (!HBandSDK) {
        // Demo mode for native without SDK
        return this.simulateDeviceScan(timeoutMs);
      }

      // Native scan
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

  // Web Bluetooth scanning
  async webBluetoothScan(timeoutMs) {
    try {
      if (!navigator.bluetooth) {
        // Fallback to demo mode if Web Bluetooth not available
        return this.simulateDeviceScan(timeoutMs);
      }

      console.log('Starting Web Bluetooth scan...');

      // Request device with health-related services
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: false,
        filters: [
          { services: ['heart_rate'] },
          { services: ['battery_service'] },
          { services: ['device_information'] },
          { namePrefix: 'H Band' },
          { namePrefix: 'HBand' },
          { namePrefix: 'Fitness' },
          { namePrefix: 'Watch' },
          { namePrefix: 'Band' },
          { namePrefix: 'Mi Band' },
          { namePrefix: 'Amazfit' }
        ],
        optionalServices: [
          'heart_rate',
          'battery_service', 
          'device_information',
          'generic_access',
          'generic_attribute'
        ]
      });

      if (device) {
        const webDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          address: device.id, // Web Bluetooth doesn't expose MAC addresses
          rssi: -50, // Estimated
          manufacturer: 'Web Bluetooth',
          deviceType: 'smartwatch',
          batteryLevel: null,
          webBluetoothDevice: device
        };

        this.handleDeviceDiscovered(webDevice);
      }

      return { success: true };
    } catch (error) {
      console.error('Web Bluetooth scan error:', error);
      
      if (error.name === 'NotFoundError') {
        console.log('No device selected, falling back to demo mode');
        return this.simulateDeviceScan(timeoutMs);
      }
      
      throw error;
    }
  }

  // Updated syncHealthDataWithBackend method
  async syncHealthDataWithBackend(healthData) {
    if (!api) {
      console.error('❌ API service not available');
      return;
    }
    
    try {
      console.log('🔄 Starting health data sync...');
      
      // Get current user with detailed logging
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.error('❌ User not authenticated - cannot sync health data');
        console.error('Current user object:', currentUser);
        
        // Show user-friendly error
        Alert.alert(
          'Authentication Required',
          'Please log out and log back in to sync your health data.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ User authenticated for sync:', {
        id: currentUser.id,
        email: currentUser.email
      });

      // Get connected device info - be more flexible here
      let deviceInfo = this.connectedDevice;
      if (!deviceInfo && healthData.deviceInfo) {
        // Fallback to device info from health data
        deviceInfo = {
          name: healthData.deviceInfo.name,
          address: healthData.deviceInfo.address,
          deviceType: 'hband'
        };
        console.log('🔧 Using device info from health data:', deviceInfo);
      }

      if (!deviceInfo) {
        console.error('❌ No device info available - cannot sync health data');
        return;
      }

      console.log('✅ Device info available:', {
        name: deviceInfo.name,
        type: deviceInfo.deviceType,
        address: deviceInfo.address
      });

      // Construct payload matching RealTimeHealthData model
      const payload = {
        user_id: currentUser.id,
        device_type: deviceInfo.deviceType || 'hband',
        device_id: deviceInfo.address || deviceInfo.id || 'unknown',
        timestamp: healthData.timestamp || new Date().toISOString(),
        data: { ...healthData }
      };

      // Remove redundant fields from data
      if (payload.data.deviceInfo) {
        delete payload.data.deviceInfo;
      }
      if (payload.data.timestamp) {
        delete payload.data.timestamp;
      }

      console.log('🔄 Syncing health data with payload:');
      console.log('  User ID:', payload.user_id);
      console.log('  Device Type:', payload.device_type);
      console.log('  Device ID:', payload.device_id);
      console.log('  Data keys:', Object.keys(payload.data));

      // Sync to backend using your API service
      const result = await api.syncHealthData(payload);
      console.log('✅ Health data synced successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to sync health data with backend:', error);
      
      // Handle specific error types
      if (error.message.includes('Authentication failed')) {
        Alert.alert(
          'Authentication Error',
          'Your session has expired. Please log out and log back in.',
          [{ text: 'OK' }]
        );
      } else if (error.message.includes('User ID mismatch')) {
        Alert.alert(
          'Sync Error',
          'There was an authentication issue. Please log out and log back in.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Sync error details:', error.message);
      }
    }
  }

  // Simulate device discovery for demo purposes
  simulateDeviceScan(timeoutMs) {
    console.log('Starting demo device scan...');
    
    setTimeout(() => {
      const demoDevices = [
        {
          id: 'demo-hband-1',
          name: 'H Band Pro',
          address: 'AA:BB:CC:DD:EE:FF',
          rssi: -45,
          manufacturer: 'HBand',
          deviceType: 'smartwatch',
          batteryLevel: 85
        },
        {
          id: 'demo-fitness-1', 
          name: 'Fitness Tracker X1',
          address: 'FF:EE:DD:CC:BB:AA',
          rssi: -65,
          manufacturer: 'Generic',
          deviceType: 'fitness_tracker',
          batteryLevel: 92
        },
        {
          id: 'demo-mi-band-1',
          name: 'Mi Band 7',
          address: '11:22:33:44:55:66',
          rssi: -55,
          manufacturer: 'Xiaomi',
          deviceType: 'smartwatch',
          batteryLevel: 76
        }
      ];
      
      demoDevices.forEach((device, index) => {
        setTimeout(() => {
          this.handleDeviceDiscovered(device);
        }, (index + 1) * 1500);
      });
    }, 1000);

    // Auto-stop scan after timeout
    setTimeout(() => {
      if (this.isScanning) {
        this.stopScan();
      }
    }, timeoutMs);

    return { success: true };
  }

  // Stop device scanning
  async stopScan() {
    try {
      console.log('Stopping device scan...');
      this.isScanning = false;

      if (Platform.OS !== 'web' && HBandSDK) {
        await HBandSDK.stopScan();
      }

      this.notifyListeners('scanStopped', {});
      return { success: true };
    } catch (error) {
      console.error('Scan stop error:', error);
      return { success: false, message: error.message };
    }
  }

  // Connect to a specific device
  async connectToDevice(deviceId, deviceAddress) {
    try {
      console.log(`Connecting to device: ${deviceId} (${deviceAddress})`);
      
      const device = this.discoveredDevices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('Device not found in discovered devices');
      }

      if (Platform.OS === 'web') {
        return await this.webBluetoothConnect(device);
      }

      if (!HBandSDK) {
        // Demo mode for native
        return this.simulateDeviceConnection(device);
      }

      // Native connection
      const result = await HBandSDK.connectDevice(deviceAddress);
      
      if (result.success) {
        console.log('Native connection initiated successfully');
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

  // Web Bluetooth connection
  async webBluetoothConnect(device) {
    try {
      const webDevice = device.webBluetoothDevice;
      if (!webDevice) {
        throw new Error('Web Bluetooth device not available');
      }

      console.log('Connecting to Web Bluetooth device...');
      
      // Connect to GATT server
      const server = await webDevice.gatt.connect();
      console.log('Connected to GATT server');

      // Get available services
      const services = await server.getPrimaryServices();
      console.log('Available services:', services.map(s => s.uuid));

      // Try to connect to common health services
      const healthServices = {
        heartRate: '0000180d-0000-1000-8000-00805f9b34fb',
        battery: '0000180f-0000-1000-8000-00805f9b34fb',
        deviceInfo: '0000180a-0000-1000-8000-00805f9b34fb'
      };

      for (const [serviceName, serviceUuid] of Object.entries(healthServices)) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          this.webCharacteristics[serviceName] = { service, characteristics };
          console.log(`Connected to ${serviceName} service`);
        } catch (error) {
          console.log(`${serviceName} service not available:`, error.message);
        }
      }

      // Store the connected device
      this.webBluetoothDevice = webDevice;
      
      // Simulate successful connection
      setTimeout(() => {
        this.handleConnectionStatusChanged({
          connected: true,
          device: device,
          message: 'Connected via Web Bluetooth'
        });
      }, 1000);

      return { success: true, message: 'Web Bluetooth connection initiated' };
    } catch (error) {
      console.error('Web Bluetooth connection error:', error);
      throw error;
    }
  }

  // Simulate device connection for demo
  simulateDeviceConnection(device) {
    console.log('🎭 Simulating device connection...');
    
    setTimeout(() => {
      // Store the device before triggering the event
      this.connectedDevice = {
        ...device,
        deviceType: device.deviceType || 'hband'
      };
      
      console.log('✅ Simulated device stored:', this.connectedDevice);
      
      this.handleConnectionStatusChanged({
        connected: true,
        device: this.connectedDevice,
        message: 'Connected successfully (Demo mode)'
      });
    }, 2000);

    return { success: true, message: 'Demo connection initiated' };
  }

  // Disconnect from current device
  async disconnectDevice() {
    try {
      console.log('Disconnecting device...');
      
      if (!this.connectedDevice && !this.webBluetoothDevice) {
        return { success: true, message: 'No device connected' };
      }

      if (Platform.OS === 'web' && this.webBluetoothDevice) {
        // Web Bluetooth disconnect
        if (this.webBluetoothDevice.gatt.connected) {
          this.webBluetoothDevice.gatt.disconnect();
        }
        this.webBluetoothDevice = null;
        this.webCharacteristics = {};
      }

      if (Platform.OS !== 'web' && HBandSDK) {
        await HBandSDK.disconnect();
      }

      const device = this.connectedDevice;
      this.connectedDevice = null;
      
      this.handleConnectionStatusChanged({
        connected: false,
        device: device,
        message: 'Disconnected successfully'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  }

  // Get health data from connected device
  async getHealthData() {
    try {
      console.log('Getting health data from device...');
      
      if (!this.connectedDevice && !this.webBluetoothDevice) {
        throw new Error('No device connected');
      }

      if (Platform.OS === 'web') {
        return await this.getWebBluetoothHealthData();
      }

      if (!HBandSDK) {
        // Demo mode
        const demoData = this.generateDemoHealthData();
        return { success: true, data: demoData };
      }

      // Native health data
      const result = await HBandSDK.getHealthData();
      
      if (result.success) {
        const formattedData = this.formatHealthData(result.data);
        return { success: true, data: formattedData };
      }
      
      return result;
    } catch (error) {
      console.error('Get health data error:', error);
      throw error;
    }
  }

  // Get health data from Web Bluetooth
  async getWebBluetoothHealthData() {
    try {
      const healthData = {};

      // Try to read heart rate
      if (this.webCharacteristics.heartRate) {
        try {
          const heartRateChar = this.webCharacteristics.heartRate.characteristics
            .find(char => char.uuid === '00002a37-0000-1000-8000-00805f9b34fb');
          
          if (heartRateChar) {
            const value = await heartRateChar.readValue();
            const heartRate = value.getUint16(1, true);
            healthData.heartRate = heartRate;
          }
        } catch (error) {
          console.log('Could not read heart rate:', error);
        }
      }

      // Try to read battery level
      if (this.webCharacteristics.battery) {
        try {
          const batteryChar = this.webCharacteristics.battery.characteristics
            .find(char => char.uuid === '00002a19-0000-1000-8000-00805f9b34fb');
          
          if (batteryChar) {
            const value = await batteryChar.readValue();
            const batteryLevel = value.getUint8(0);
            healthData.batteryLevel = batteryLevel;
          }
        } catch (error) {
          console.log('Could not read battery level:', error);
        }
      }

      // Fill in with demo data for missing values
      const demoData = this.generateDemoHealthData();
      return { 
        success: true, 
        data: { ...demoData, ...healthData }
      };
    } catch (error) {
      console.error('Web Bluetooth health data error:', error);
      // Fallback to demo data
      const demoData = this.generateDemoHealthData();
      return { success: true, data: demoData };
    }
  }

  // Start real-time health monitoring
  async startHealthMonitoring() {
    try {
      console.log('Starting real-time health monitoring...');
      
      if (!this.connectedDevice && !this.webBluetoothDevice) {
        throw new Error('No device connected');
      }

      if (Platform.OS === 'web') {
        this.startWebBluetoothMonitoring();
        return { success: true };
      }

      if (!HBandSDK) {
        // Demo mode
        this.startDemoHealthUpdates();
        return { success: true };
      }

      // Native monitoring
      const result = await HBandSDK.startRealTimeMonitoring();
      return result;
    } catch (error) {
      console.error('Start monitoring error:', error);
      throw error;
    }
  }

  // Start Web Bluetooth monitoring
  startWebBluetoothMonitoring() {
    console.log('Starting Web Bluetooth health monitoring...');
    
    // Start periodic health data updates
    this.webHealthInterval = setInterval(async () => {
      try {
        const result = await this.getWebBluetoothHealthData();
        if (result.success) {
          this.handleHealthDataReceived(result.data);
        }
      } catch (error) {
        console.error('Web Bluetooth monitoring error:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  // Stop real-time monitoring
  async stopHealthMonitoring() {
    try {
      console.log('Stopping real-time health monitoring...');
      
      if (this.demoHealthInterval) {
        clearInterval(this.demoHealthInterval);
        this.demoHealthInterval = null;
      }

      if (this.webHealthInterval) {
        clearInterval(this.webHealthInterval);
        this.webHealthInterval = null;
      }

      if (Platform.OS !== 'web' && HBandSDK) {
        return await HBandSDK.stopRealTimeMonitoring();
      }

      return { success: true };
    } catch (error) {
      console.error('Stop monitoring error:', error);
      throw error;
    }
  }

  // Event handlers
  handleDeviceDiscovered(device) {
    console.log('Device discovered:', device);
    
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
    console.log('🔗 Connection status changed:', status);
    
    if (status.connected && status.device) {
      // Store the connected device
      this.connectedDevice = status.device;
      console.log('✅ Device connected and stored:', this.connectedDevice.name);
      
      // Register device with backend
      if (api) {
        this.registerDeviceWithBackend(status.device);
      }
      
      // Start health monitoring automatically
      setTimeout(() => {
        this.startHealthMonitoring().catch(console.error);
      }, 2000);
      
    } else if (!status.connected) {
      console.log('❌ Device disconnected');
      this.connectedDevice = null;
      this.stopHealthMonitoring().catch(console.error);
    }

    this.notifyListeners('connectionStatusChanged', status);
  }

  handleHealthDataReceived(data) {
    console.log('📊 Health data received:', data);
    const formattedData = this.formatHealthData(data);
    
    // Make sure we have a connected device reference
    if (!this.connectedDevice) {
      console.warn('⚠️ Health data received but no connected device reference');
      // Try to reconstruct device info from data if available
      if (data.deviceInfo) {
        this.connectedDevice = {
          name: data.deviceInfo.name,
          address: data.deviceInfo.address,
          deviceType: 'hband', // Default type
          batteryLevel: data.deviceInfo.batteryLevel
        };
        console.log('🔧 Reconstructed device info:', this.connectedDevice);
      }
    }
    
    // Send to backend if API is available and we have device info
    if (api && this.connectedDevice) {
      this.syncHealthDataWithBackend(formattedData);
    } else {
      console.warn('⚠️ Cannot sync - missing API or device connection');
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
      'tracker', 'health', 'sport', 'mi band', 'amazfit', 'veepoo'
    ];
    
    const deviceName = (device.name || '').toLowerCase();
    return supportedNames.some(name => deviceName.includes(name));
  }

  formatHealthData(rawData) {
    if (!rawData) return {};
    
    return {
      steps: rawData.steps || Math.floor(Math.random() * 3000) + 5000,
      heartRate: rawData.heartRate || rawData.bpm || Math.floor(Math.random() * 30) + 60,
      bloodPressure: rawData.bloodPressure || {
        systolic: Math.floor(Math.random() * 20) + 110,
        diastolic: Math.floor(Math.random() * 15) + 70
      },
      oxygenSaturation: rawData.bloodOxygen || rawData.spo2 || Math.floor(Math.random() * 5) + 95,
      sleep: rawData.sleep || {
        duration: Math.random() * 2 + 6,
        quality: Math.floor(Math.random() * 20) + 75
      },
      caloriesBurned: rawData.calories || Math.floor(Math.random() * 500) + 1200,
      distance: rawData.distance || Math.random() * 3 + 2,
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
      oxygenSaturation: Math.floor(Math.random() * 5) + 95,
      sleep: {
        duration: Math.random() * 2 + 6,
        quality: Math.floor(Math.random() * 20) + 75
      },
      caloriesBurned: Math.floor(Math.random() * 500) + 1200,
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

  async getCurrentUser() {
    try {
      console.log('🔍 Getting current user from React Native storage...');
      
      let userToken, userData;
      
      if (Platform.OS === 'web') {
        userToken = typeof localStorage !== 'undefined' ? localStorage.getItem('userToken') : null;
        userData = typeof localStorage !== 'undefined' ? localStorage.getItem('userData') : null;
      } else {
        // React Native
        userToken = await AsyncStorage.getItem('userToken');
        userData = await AsyncStorage.getItem('userData');
      }
      
      console.log('🔍 Storage check:');
      console.log('  Token exists:', !!userToken);
      console.log('  User data exists:', !!userData);
      
      if (!userToken) {
        console.warn('❌ No auth token found in storage');
        return null;
      }
      
      if (!userData) {
        console.warn('❌ No user data found in storage');
        return null;
      }
      
      try {
        const user = JSON.parse(userData);
        console.log('🔍 Parsed user data:', {
          hasId: !!user.id,
          hasEmail: !!user.email,
          hasName: !!user.name
        });
        
        // Verify user has required fields
        if (user && user.id) {
          console.log('✅ Valid user found:', {
            id: user.id,
            email: user.email,
            name: user.name
          });
          return user;
        } else {
          console.warn('❌ User object missing required fields:', user);
          return null;
        }
      } catch (parseError) {
        console.error('❌ Error parsing user data:', parseError);
        return null;
      }
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
    return this.connectedDevice !== null || this.webBluetoothDevice !== null;
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
    
    if (this.webBluetoothDevice && this.webBluetoothDevice.gatt.connected) {
      this.webBluetoothDevice.gatt.disconnect();
    }
    
    this.listeners = [];
    this.discoveredDevices = [];
    this.connectedDevice = null;
    this.webBluetoothDevice = null;
    this.webCharacteristics = {};
  }
}

// Export singleton instance
export default new BluetoothManager();