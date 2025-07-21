// Updated HomeScreen with proper device connection
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useAuth, useHealth } from './context';
import BluetoothManager from './bluetoothManager';

// Simple fallback icons
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

export const HomeScreen = () => {
  const { authState } = useAuth();
  const { healthState, fetchHealthData, connectDevice } = useHealth();
  
  // Device connection state
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    // Initialize Bluetooth Manager
    initializeBluetoothManager();
    
    // Check if user already has a connected device
    checkExistingDevice();
    
    return () => {
      BluetoothManager.cleanup();
    };
  }, []);

  useEffect(() => {
    // Fetch health data when device is connected
    if (connectedDevice) {
      fetchUserHealthData();
    }
  }, [connectedDevice]);

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

  const handleBluetoothEvent = (event, data) => {
    console.log('Bluetooth Event:', event, data);
    
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
          setHealthData(null);
        }
        break;
        
      case 'healthDataReceived':
        setHealthData(data);
        console.log('Health data received:', data);
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
      
      // Show connecting state
      Alert.alert(
        'Connecting',
        `Connecting to ${device.name}...`,
        [{ text: 'Cancel', onPress: () => BluetoothManager.stopScan() }]
      );
      
      // Connect using Bluetooth Manager
      await BluetoothManager.connectToDevice(device.id, device.address);
      
      // Register device with backend
      await connectDevice({
        device_name: device.name,
        device_address: device.address,
        device_type: device.deviceType || 'smartwatch',
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
              setHealthData(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const fetchUserHealthData = async () => {
    try {
      const data = await fetchHealthData('day');
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
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

  const renderHealthMetrics = () => {
    if (!healthData || !connectedDevice) return null;

    const metrics = [
      { key: 'steps', label: 'Steps', icon: 'walk', unit: 'steps' },
      { key: 'heartRate', label: 'Heart Rate', icon: 'heart', unit: 'bpm' },
      { key: 'sleep', label: 'Sleep', icon: 'bed', unit: 'hrs' },
      { key: 'caloriesBurned', label: 'Calories', icon: 'flame', unit: 'kcal' }
    ];

    return (
      <View style={styles.healthMetricsContainer}>
        <Text style={styles.healthMetricsTitle}>Today's Health Data</Text>
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => {
            const data = healthData[metric.key];
            const value = data?.current_value || data?.average || 0;
            
            return (
              <View key={metric.key} style={styles.metricCard}>
                <Icon name={metric.icon} size={24} color="#4F46E5" />
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>
                  {typeof value === 'number' ? Math.round(value) : value}
                </Text>
                <Text style={styles.metricUnit}>{metric.unit}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.lastSync}>
          Last sync: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.homeHeaderGradient}
      >
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greetingText}>Good Morning</Text>
            <Text style={styles.userNameText}>{authState?.user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.homeContent}>
        {!connectedDevice ? (
          // No device connected - show connection options
          <View style={styles.connectDeviceCard}>
            <Icon name="watch" size={48} color="#4F46E5" />
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
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Icon name="bluetooth" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.connectButtonText}>
                {isScanning ? 'Scanning...' : 'Scan for Devices'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Device connected - show device info and health data
          <View style={styles.connectedDeviceCard}>
            <View style={styles.connectedDeviceHeader}>
              <View style={styles.connectedDeviceIcon}>
                <Icon name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <View style={styles.connectedDeviceInfo}>
                <Text style={styles.connectedDeviceName}>{connectedDevice.name}</Text>
                <Text style={styles.connectedDeviceStatus}>Connected via Bluetooth</Text>
              </View>
              <TouchableOpacity onPress={disconnectDevice}>
                <Icon name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Health Metrics Display */}
        {renderHealthMetrics()}

        {/* Device List Modal/Overlay */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  homeHeaderGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greetingText: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '400',
  },
  userNameText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 8,
  },
  homeContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  connectDeviceCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  connectedDeviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  connectedDeviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDeviceIcon: {
    marginRight: 12,
  },
  connectedDeviceInfo: {
    flex: 1,
  },
  connectedDeviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  connectedDeviceStatus: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 2,
  },
  healthMetricsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  healthMetricsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricUnit: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  lastSync: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  deviceListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deviceListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceListTitle: {
    fontSize: 18,
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
    fontSize: 14,
  },
  deviceList: {
    maxHeight: 300,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  deviceDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deviceBattery: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 20,
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
  },
});