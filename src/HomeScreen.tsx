// Updated HomeScreen.tsx with integrated Health Dashboard
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
  StatusBar
} from 'react-native';
import { useAuth, useHealth } from './context';
import BluetoothManager from './bluetoothManager';
import { api } from './api_service';
import { HealthDashboard} from './HealthDashboardComponent'; // Import the new component

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

  useEffect(() => {
    // Initialize Bluetooth Manager
    initializeBluetoothManager();
    
    // Check if user already has a connected device
    checkExistingDevice();
    
    return () => {
      BluetoothManager.cleanup();
    };
  }, []);

  const initializeBluetoothManager = async () => {
    try {
      // Add Bluetooth event listeners
      BluetoothManager.addListener(handleBluetoothEvent);
      
      // Initialize the Bluetooth SDK
      await BluetoothManager.initialize();
      console.log('Bluetooth Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Bluetooth Manager:', error);
      Alert.alert('Bluetooth Error', 'Failed to initialize Bluetooth. Please check your device settings.');
    }
  };

  const handleBluetoothEvent = async (event, data) => {
    console.log('🔗 Bluetooth Event:', event, data);
    
    switch (event) {
      case 'scanStarted':
        setIsScanning(true);
        setDiscoveredDevices([]);
        break;
        
      case 'scanStopped':
        setIsScanning(false);
        break;
        
      case 'deviceFound':
        setDiscoveredDevices(prev => {
          const exists = prev.find(d => d.id === data.id || d.address === data.address);
          if (!exists) {
            return [...prev, data];
          }
          return prev;
        });
        break;
        
      case 'connectionStatusChanged':
        if (data.connected && data.device) {
          setConnectedDevice(data.device);
          setShowDeviceList(false);
          Alert.alert('Success', `Connected to ${data.device.name || 'device'} successfully!`);
        } else if (!data.connected) {
          setConnectedDevice(null);
        }
        break;
        
      case 'healthDataReceived':
        console.log('📊 Health data received on HomeScreen:', data);
        // The sync will be handled by BluetoothManager
        break;
        
      case 'bluetoothError':
        Alert.alert('Bluetooth Error', data.message || 'An error occurred with Bluetooth connection');
        break;
    }
  };

  const checkExistingDevice = async () => {
    try {
      // Check if user has a device connected from previous session
      const existingDevice = BluetoothManager.getConnectedDevice();
      if (existingDevice) {
        setConnectedDevice(existingDevice);
      }
    } catch (error) {
      console.error('Error checking existing device:', error);
    }
  };

  const startDeviceScan = async () => {
    try {
      setShowDeviceList(true);
      setDiscoveredDevices([]);
      
      console.log('Starting device scan...');
      await BluetoothManager.scanForDevices(15000); // Scan for 15 seconds
      
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', error.message || 'Failed to scan for devices');
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device) => {
    try {
      console.log('Connecting to device:', device.name);
      
      // Connect using Bluetooth Manager
      await BluetoothManager.connectToDevice(device.id, device.address);
      
      // Register device with backend
      await connectDevice({
        device_name: device.name,
        device_address: device.address,
        device_type: device.deviceType || 'hband',
        manufacturer: device.manufacturer
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Error', error.message || 'Failed to connect to device');
    }
  };

  const disconnectDevice = async () => {
    try {
      Alert.alert(
        'Disconnect Device',
        'Are you sure you want to disconnect your device?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disconnect', 
            style: 'destructive',
            onPress: async () => {
              await BluetoothManager.disconnectDevice();
              setConnectedDevice(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
    >
      <View style={styles.deviceIcon}>
        <Icon name="watch" size={24} color="#4F46E5" />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceDetails}>
          {item.manufacturer || 'Unknown'} • Signal: {item.rssi || 'N/A'}
        </Text>
        {item.batteryLevel && (
          <Text style={styles.deviceBattery}>Battery: {item.batteryLevel}%</Text>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {/* Main Content */}
      {!connectedDevice ? (
        // Device Connection Screen
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
                <Text style={styles.greetingText}>Good Morning</Text>
                <Text style={styles.userNameText}>
                  {authState?.user?.name || 'User'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Connection Card */}
          <View style={styles.homeContent}>
            <View style={styles.connectDeviceCard}>
              <Icon name="bluetooth" size={48} color="#4F46E5" />
              <Text style={styles.connectTitle}>Connect Your Device</Text>
              <Text style={styles.connectDescription}>
                Connect your smartwatch to start monitoring your health in real-time
              </Text>
              <TouchableOpacity 
                style={styles.connectButton} 
                onPress={startDeviceScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="bluetooth" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.connectButtonText}>
                  {isScanning ? 'Scanning...' : 'Scan for Devices'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Health Dashboard Screen (when device is connected)
        <View style={styles.dashboardContainer}>
          {/* Connected Device Status Bar */}
          <View style={styles.connectedDeviceBar}>
            <View style={styles.connectedDeviceInfo}>
              <Icon name="bluetooth-connected" size={16} color="#10B981" />
              <Text style={styles.connectedDeviceText}>
                {connectedDevice.name} Connected
              </Text>
            </View>
            <TouchableOpacity onPress={disconnectDevice} style={styles.disconnectButton}>
              <Icon name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
          
          {/* Health Dashboard */}
          <HealthDashboard />
        </View>
      )}

      {/* Device List Modal */}
      {showDeviceList && (
        <View style={styles.deviceListOverlay}>
          <View style={styles.deviceListContainer}>
            <View style={styles.deviceListHeader}>
              <Text style={styles.deviceListTitle}>Available Devices</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowDeviceList(false);
                  BluetoothManager.stopScan();
                }}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.scanningText}>Scanning for devices...</Text>
              </View>
            )}

            <FlatList
              data={discoveredDevices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id || item.address}
              style={styles.deviceList}
              ListEmptyComponent={
                !isScanning ? (
                  <Text style={styles.noDevicesText}>
                    No devices found. Make sure your smartwatch is in pairing mode and try again.
                  </Text>
                ) : null
              }
            />

            <TouchableOpacity 
              style={styles.rescanButton} 
              onPress={startDeviceScan}
              disabled={isScanning}
            >
              <Text style={styles.rescanButtonText}>
                {isScanning ? 'Scanning...' : 'Scan Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    minHeight: screenHeight * 0.25,
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
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: Math.max(screenWidth * 0.06, 24),
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: screenWidth * 0.4,
    justifyContent: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  
  // Dashboard styles
  dashboardContainer: {
    flex: 1,
  },
  connectedDeviceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  connectedDeviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDeviceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#10B981',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    maxHeight: screenHeight * 0.7,
    maxWidth: 400,
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
  },
  scanningText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  deviceList: {
    maxHeight: screenHeight * 0.35,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  deviceDetails: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#6B7280',
    marginTop: 2,
  },
  deviceBattery: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#10B981',
    marginTop: 2,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: Math.min(screenWidth * 0.035, 14),
    padding: 20,
    lineHeight: 20,
  },
  rescanButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
});