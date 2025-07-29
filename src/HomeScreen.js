import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Platform, 
  FlatList, 
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useAuth, useHealth } from './context';
// UPDATED: Import Real Bluetooth Manager for actual device detection
import RealBluetoothManager from './bluetoothManager';
import { api } from './api_service';
import { HealthDashboard } from './HealthDashboardComponent';

// Simple components
const Icon = ({ name, size = 24, color = '#000', style, ...props }) => (
  <View style={[{
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: size/4,
    justifyContent: 'center',
    alignItems: 'center'
  }, style]} {...props}>
    <View style={{
      width: size * 0.5,
      height: size * 0.5,
      backgroundColor: '#fff',
      borderRadius: 2
    }} />
  </View>
);

const LinearGradient = ({ colors, children, style, ...props }) => (
  <View style={[style, { 
    backgroundColor: colors?.[0] || '#667eea',
    ...(Platform.OS === 'web' ? {
      background: `linear-gradient(135deg, ${colors?.[0] || '#667eea'}, ${colors?.[1] || '#764ba2'})`
    } : {})
  }]} {...props}>
    {children}
  </View>
);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const HomeScreen = () => {
  const { authState, signOut } = useAuth();
  const { healthState, fetchHealthData, connectDevice } = useHealth();
  
  // Device connection state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [bluetoothError, setBluetoothError] = useState(null);
  const [hasBluetoothError, setHasBluetoothError] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);

  useEffect(() => {
    initializeRealBluetoothManager();
    checkExistingDevice();
    
    return () => {
      RealBluetoothManager.cleanup();
    };
  }, []);

  const initializeRealBluetoothManager = async () => {
    try {
      console.log('🔧 Initializing Real Bluetooth Manager...');
      
      RealBluetoothManager.addListener(handleBluetoothEvent);
      
      const result = await RealBluetoothManager.initialize();
      
      if (result.success) {
        console.log('✅ Real Bluetooth Manager initialized successfully');
        setBluetoothError(null);
        setHasBluetoothError(false);
      } else {
        throw new Error(result.message || 'Real Bluetooth initialization failed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Real Bluetooth Manager:', error);
      setBluetoothError(error.message);
      setHasBluetoothError(true);
      
      Alert.alert(
        'Bluetooth Setup Required', 
        `To detect real health devices, please:\n\n1. Enable Bluetooth on your device\n2. Grant location permissions\n3. Ensure your health device is in pairing mode\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleBluetoothEvent = async (event, data) => {
    console.log('🔗 Real Bluetooth Event:', event, data);
    
    switch (event) {
      case 'scanStarted':
        setIsScanning(true);
        setDiscoveredDevices([]);
        setBluetoothError(null);
        setHasBluetoothError(false);
        break;
        
      case 'scanStopped':
        setIsScanning(false);
        break;
        
      case 'deviceFound':
        console.log('✅ Real health device found:', data.name, data.manufacturer);
        if (data.isReal) {
          setDiscoveredDevices(prev => {
            const exists = prev.find(d => d.id === data.id || d.address === data.address);
            if (!exists) {
              return [...prev, data];
            }
            return prev;
          });
        }
        break;
        
      case 'connectionStatusChanged':
        if (data.connected && data.device && data.device.isReal) {
          setConnectedDevice(data.device);
          setShowDeviceList(false);
          setBluetoothError(null);
          setHasBluetoothError(false);
          Alert.alert(
            'Real Device Connected!', 
            `Successfully connected to ${data.device.name}!\n\nReal health data sync is now active. Your device will now provide accurate health measurements.`,
            [{ text: 'Excellent!' }]
          );
        } else if (!data.connected) {
          setConnectedDevice(null);
          Alert.alert(
            'Device Disconnected', 
            'Your real health device has been disconnected. Health data sync has stopped.',
            [{ text: 'OK' }]
          );
        }
        break;
        
      case 'healthDataReceived':
        console.log('📊 Real health data received:', Object.keys(data));
        break;
        
      case 'healthDataError':
        console.error('❌ Real health data error:', data.error);
        Alert.alert(
          'Health Data Error', 
          `Error reading from your real device: ${data.error}`,
          [{ text: 'OK' }]
        );
        break;
        
      case 'bluetoothError':
        console.error('❌ Real Bluetooth error:', data.message);
        setBluetoothError(data.message);
        setHasBluetoothError(true);
        Alert.alert(
          'Bluetooth Error', 
          `Error: ${data.message || 'Unknown error occurred'}\n\nPlease check your Bluetooth settings and try again.`,
          [{ text: 'OK' }]
        );
        break;
        
      case 'scanError':
        console.error('❌ Real device scan error:', data.error);
        setIsScanning(false);
        setBluetoothError(data.error);
        setHasBluetoothError(true);
        Alert.alert(
          'Device Scan Failed', 
          `Failed to scan for real health devices: ${data.error}\n\nTroubleshooting:\n• Make sure Bluetooth is enabled\n• Grant location permissions\n• Put your device in pairing mode\n• Ensure device is charged and nearby`,
          [
            { text: 'Try Again', onPress: () => startDeviceScan() },
            { text: 'Cancel' }
          ]
        );
        break;
    }
  };

  const checkExistingDevice = async () => {
    try {
      const existingDevice = RealBluetoothManager.getConnectedDevice();
      if (existingDevice && existingDevice.isReal) {
        console.log('✅ Found existing real device connection:', existingDevice.name);
        setConnectedDevice(existingDevice);
      } else {
        console.log('ℹ️ No existing real device connection found');
      }
    } catch (error) {
      console.error('Error checking existing real device:', error);
    }
  };

  const startDeviceScan = async () => {
    try {
      if (hasBluetoothError) {
        Alert.alert(
          'Bluetooth Not Available',
          `Cannot scan for real devices: ${bluetoothError}\n\nPlease:\n1. Enable Bluetooth\n2. Grant location permissions\n3. Restart the app`,
          [{ text: 'OK' }]
        );
        return;
      }

      setShowDeviceList(true);
      setDiscoveredDevices([]);
      setScanAttempts(prev => prev + 1);
      
      console.log(`🔍 Starting real device scan (attempt ${scanAttempts + 1})...`);
      
      // Extended scan time for real device discovery
      await RealBluetoothManager.scanForDevices(20000); // 20 seconds for real devices
      
    } catch (error) {
      console.error('❌ Real device scan error:', error);
      setIsScanning(false);
      setBluetoothError(error.message);
      setHasBluetoothError(true);
      
      Alert.alert(
        'Scan Failed', 
        `Cannot scan for real devices: ${error.message}\n\nTroubleshooting:\n• Ensure your ET-475/H-Band is in pairing mode\n• Make sure device is charged and nearby\n• Check Bluetooth permissions\n• Try restarting Bluetooth on your phone`,
        [
          { text: 'Retry', onPress: () => startDeviceScan() },
          { text: 'Cancel', onPress: () => setShowDeviceList(false) }
        ]
      );
    }
  };

  const connectToDevice = async (device) => {
    try {
      if (!device.isReal) {
        Alert.alert(
          'Invalid Device',
          'This device is not validated as a real ET-475, H-Band, or compatible health monitoring device.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('🔄 Connecting to real device:', device.name);
      
      Alert.alert(
        'Connecting to Real Device...',
        `Establishing connection to ${device.name}.\n\nThis may take a few moments to establish a secure connection with your real health device.`,
        [{ text: 'Please Wait', style: 'cancel' }]
      );
      
      await RealBluetoothManager.connectToDevice(device.id, device.address);
      
      const backendResult = await connectDevice({
        device_name: device.name,
        device_address: device.address,
        device_type: device.deviceType,
        manufacturer: device.manufacturer,
        is_real_device: true
      });
      
      if (!backendResult.success) {
        console.warn('⚠️ Backend registration failed but real device connected');
      }
      
    } catch (error) {
      console.error('❌ Real device connection error:', error);
      Alert.alert(
        'Connection Failed', 
        `Failed to connect to ${device.name}: ${error.message}\n\nTroubleshooting:\n• Make sure device is in pairing mode\n• Check device is charged\n• Try moving closer to the device\n• Restart Bluetooth if needed`,
        [
          { text: 'Retry', onPress: () => connectToDevice(device) },
          { text: 'Cancel' }
        ]
      );
    }
  };

  const disconnectDevice = async () => {
    try {
      Alert.alert(
        'Disconnect Real Device',
        `Are you sure you want to disconnect your ${connectedDevice?.name}?\n\nThis will stop real health data syncing from your device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disconnect', 
            style: 'destructive',
            onPress: async () => {
              try {
                await RealBluetoothManager.disconnectDevice();
                setConnectedDevice(null);
                console.log('✅ Real device disconnected successfully');
              } catch (error) {
                console.error('❌ Error disconnecting real device:', error);
                Alert.alert('Disconnect Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        !item.isReal && styles.deviceItemDisabled
      ]}
      onPress={() => item.isReal ? connectToDevice(item) : null}
      disabled={!item.isReal}
    >
      <View style={styles.deviceIcon}>
        <Icon 
          name="watch" 
          size={24} 
          color={item.isReal ? "#4F46E5" : "#9CA3AF"} 
        />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[
          styles.deviceName,
          !item.isReal && styles.deviceNameDisabled
        ]}>
          {item.name || 'Unknown Device'}
        </Text>
        <Text style={styles.deviceDetails}>
          {item.manufacturer || 'Unknown'} • Signal: {item.rssi || 'N/A'}dBm • {item.isReal ? 'REAL DEVICE ✓' : 'NOT SUPPORTED'}
        </Text>
        {item.batteryLevel && (
          <Text style={styles.deviceBattery}>Battery: {item.batteryLevel}%</Text>
        )}
        {item.isReal && (
          <Text style={styles.deviceRealIndicator}>✅ Real Health Device Detected</Text>
        )}
        <Text style={styles.deviceType}>Type: {item.deviceType || 'fitness_tracker'}</Text>
      </View>
      <Icon 
        name="chevron-forward" 
        size={16} 
        color={item.isReal ? "#4F46E5" : "#9CA3AF"} 
      />
    </TouchableOpacity>
  );

  const renderNoDevicesFound = () => (
    <View style={styles.noDevicesContainer}>
      <Icon name="search" size={48} color="#9CA3AF" />
      <Text style={styles.noDevicesTitle}>No Real Devices Found</Text>
      <Text style={styles.noDevicesText}>
        {scanAttempts === 0 
          ? "No compatible real health devices were detected nearby."
          : `No real devices found after ${scanAttempts} scan${scanAttempts > 1 ? 's' : ''}.`
        }
      </Text>
      <Text style={styles.troubleshootingTitle}>For Real Device Detection:</Text>
      <Text style={styles.troubleshootingText}>
        • Put your ET-475, H-Band, or compatible device in pairing mode{'\n'}
        • Ensure the device is charged and within 3 feet{'\n'}
        • Check that Bluetooth is enabled on your phone{'\n'}
        • Grant location permissions to the app{'\n'}
        • Make sure no other devices are connected to your device{'\n'}
        • Try restarting your health device{'\n'}
        • Supported: ET-475, H-Band, Amazfit, Mi Band, Garmin, Fitbit
      </Text>
    </View>
  );

  if (!authState?.authenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Icon name="person" size={64} color="#9CA3AF" />
          <Text style={styles.notAuthenticatedTitle}>Please Log In</Text>
          <Text style={styles.notAuthenticatedText}>
            Log in to your account to access the health dashboard and connect your real health devices.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {!connectedDevice ? (
        // Real Device Connection Screen
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient 
            colors={['#4F46E5', '#7C3AED']} 
            style={styles.homeHeaderGradient}
          >
            <View style={styles.homeHeader}>
              <View>
                <Text style={styles.greetingText}>Good day</Text>
                <Text style={styles.userNameText}>
                  {authState?.user?.name || 'User'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Real Device Connection Card */}
          <View style={styles.homeContent}>
            <View style={styles.connectDeviceCard}>
              <Icon name="bluetooth" size={48} color="#4F46E5" />
              <Text style={styles.connectTitle}>Connect Your Real Device</Text>
              <Text style={styles.connectDescription}>
                Connect your real health monitoring device (ET-475, H-Band, Amazfit, etc.) to start tracking your wellness data with actual measurements from your device.
              </Text>
              
              {hasBluetoothError && (
                <View style={styles.errorContainer}>
                  <Icon name="warning" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>
                    Bluetooth Issue: {bluetoothError}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.connectButton,
                  hasBluetoothError && styles.connectButtonDisabled
                ]} 
                onPress={startDeviceScan}
                disabled={isScanning || hasBluetoothError}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="bluetooth" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.connectButtonText}>
                  {isScanning ? 'Scanning for Real Devices...' : 'Scan for Real Devices'}
                </Text>
              </TouchableOpacity>
              
              {scanAttempts > 0 && (
                <Text style={styles.scanAttemptsText}>
                  Real device scan attempts: {scanAttempts}
                </Text>
              )}
              
              <Text style={styles.supportedDevicesText}>
                Supported: ET-475, H-Band, Amazfit, Mi Band, Garmin, Fitbit, Apple Watch, Samsung Galaxy Watch
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Health Dashboard Screen with Real Device
        <View style={styles.dashboardContainer}>
          {/* Connected Real Device Status Bar */}
          <View style={styles.connectedDeviceBar}>
            <View style={styles.connectedDeviceInfo}>
              <Icon name="bluetooth-connected" size={16} color="#10B981" />
              <Text style={styles.connectedDeviceText}>
                {connectedDevice.name} Connected (Real Device ✓)
              </Text>
            </View>
            <TouchableOpacity onPress={disconnectDevice} style={styles.disconnectButton}>
              <Icon name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
          
          {/* Health Dashboard with Real Data */}
          <HealthDashboard />
        </View>
      )}

      {/* Real Device List Modal */}
      {showDeviceList && (
        <View style={styles.deviceListOverlay}>
          <View style={styles.deviceListContainer}>
            <View style={styles.deviceListHeader}>
              <Text style={styles.deviceListTitle}>Real Health Devices Found</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowDeviceList(false);
                  RealBluetoothManager.stopScan();
                }}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.scanningText}>
                  Scanning for real health devices...
                </Text>
              </View>
            )}

            <FlatList
              data={discoveredDevices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id || item.address}
              style={styles.deviceList}
              ListEmptyComponent={
                !isScanning ? renderNoDevicesFound() : null
              }
            />

            <View style={styles.deviceListFooter}>
              <TouchableOpacity 
                style={styles.rescanButton} 
                onPress={startDeviceScan}
                disabled={isScanning}
              >
                <Text style={styles.rescanButtonText}>
                  {isScanning ? 'Scanning Real Devices...' : 'Scan Again for Real Devices'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.deviceListNote}>
                Only real health monitoring devices will be detected and shown. Demo devices are not supported.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Rest of the styles remain the same but add new ones for real device indicators
const styles = StyleSheet.create({
  // ... (keep all existing styles from your original HomeScreen.js)
  
  // Add these new styles for real device indicators
  deviceType: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  
  supportedDevicesText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  
  // ... rest of your existing styles
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  notAuthenticatedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  notAuthenticatedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  homeHeaderGradient: {
    paddingTop: Platform.OS === 'ios' ? 40 : (Platform.OS === 'android' && StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30),
    minHeight: screenHeight * 0.12,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Math.max(screenWidth * 0.05, 20),
    paddingVertical: 20,
    minHeight: 80,
  },
  greetingText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    color: '#E5E7EB',
    fontWeight: '400',
  },
  userNameText: {
    fontSize: Math.min(screenWidth * 0.06, 24),
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  homeContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
    paddingHorizontal: Math.max(screenWidth * 0.05, 20),
    minHeight: screenHeight * 0.6,
  },
  connectDeviceCard: {
    alignItems: 'center',
    padding: Math.max(screenWidth * 0.08, 30),
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: screenHeight * 0.35,
    justifyContent: 'center',
  },
  connectTitle: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: Math.max(screenWidth * 0.06, 24),
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: screenWidth * 0.5,
    justifyContent: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  connectButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  scanAttemptsText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  
  // Dashboard styles
  dashboardContainer: {
    flex: 1,
  },
  connectedDeviceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  connectedDeviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDeviceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  disconnectButton: {
    padding: 4,
  },

  // Device list styles
  deviceListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.max(screenWidth * 0.05, 20),
    paddingVertical: 50,
  },
  deviceListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: screenHeight * 0.8,
    maxWidth: 450,
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceListTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginBottom: 16,
  },
  scanningText: {
    marginLeft: 8,
    color: '#0369A1',
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '500',
  },
  deviceList: {
    maxHeight: screenHeight * 0.4,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceIcon: {
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
    color: '#1F2937',
  },
  deviceNameDisabled: {
    color: '#9CA3AF',
  },
  deviceDetails: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#6B7280',
    marginTop: 2,
  },
  deviceBattery: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#059669',
    marginTop: 2,
  },
  deviceRealIndicator: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  noDevicesContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noDevicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  troubleshootingText: {
    textAlign: 'left',
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  deviceListFooter: {
    marginTop: 16,
    alignItems: 'center',
  },
  rescanButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  deviceListNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});