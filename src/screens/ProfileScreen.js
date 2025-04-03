import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  Linking,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar, connectDevice, getAvailableProviders, checkDeviceConnection } from '../api/profile';

const ProfileScreen = () => {
  const { authState, logout, updateProfile } = useAuth();
  const [avatarSource, setAvatarSource] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({ isConnected: false, provider: null, status: 'unknown' });
  const [providers] = useState(getAvailableProviders());
  
  // Check device connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkDeviceConnection(authState.user?.id);
        setDeviceStatus(status);
      } catch (error) {
        console.error('Error checking device connection:', error);
      }
    };
    
    checkConnection();
  }, []);
  
  const selectAvatar = async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    try {
      const result = await launchImageLibrary(options);
      
      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setAvatarSource({ uri: selectedImage.uri });
        
        // Upload avatar to server
        const uploadResult = await uploadAvatar(selectedImage.uri);
        
        if (uploadResult.success) {
          // Update user profile with avatar URL
          await updateProfile({ avatarUrl: uploadResult.avatarUrl });
          Alert.alert('Success', 'Profile picture updated successfully');
        } else {
          Alert.alert('Error', 'Failed to update profile picture');
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleConnectDevice = async (provider) => {
    try {
      setIsConnecting(true);
      const result = await connectDevice(provider);
      
      if (result.widget_url) {
        // Open device connection URL in browser
        await Linking.openURL(result.widget_url);
        Alert.alert(
          'Device Connection',
          'Please complete the connection process in your browser, then return to the app.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Set a temporary connecting status
                setDeviceStatus({
                  isConnected: false,
                  provider,
                  status: 'connecting'
                });
                
                // Poll for connection status after a delay
                setTimeout(async () => {
                  const status = await checkDeviceConnection(authState.user?.id);
                  setDeviceStatus(status);
                }, 10000);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to connect device');
      }
    } catch (error) {
      console.error('Error connecting device:', error);
      Alert.alert('Error', 'Failed to connect device');
    } finally {
      setIsConnecting(false);
    }
  };

  // Render a single device provider item
  const renderDeviceProvider = ({ item }) => {
    const isConnected = deviceStatus.isConnected && deviceStatus.provider === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.deviceButton,
          isConnected && styles.deviceButtonConnected,
          deviceStatus.status === 'connecting' && deviceStatus.provider === item.id && styles.deviceButtonConnecting
        ]}
        onPress={() => handleConnectDevice(item.id)}
        disabled={isConnecting || deviceStatus.status === 'connecting'}
      >
        <Icon name={item.icon} size={20} color={isConnected ? '#4CAF50' : 'white'} style={styles.deviceIcon} />
        <Text style={styles.deviceButtonText}>
          {isConnected 
            ? `${item.name} Connected` 
            : deviceStatus.status === 'connecting' && deviceStatus.provider === item.id
            ? `Connecting to ${item.name}...`
            : `Connect ${item.name}`}
        </Text>
        {isConnected && <Icon name="checkmark-circle" size={20} color="#4CAF50" style={styles.connectedIcon} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={selectAvatar}>
            <Image
              source={avatarSource || { uri: authState.user?.avatarUrl || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
            <View style={styles.editIcon}>
              <Icon name="camera-outline" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{authState.user?.name || 'User'}</Text>
          <Text style={styles.email}>{authState.user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferenceItem}>
            <Text>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E0E0E0', true: '#4F46E5' }}
            />
          </View>
          <View style={styles.preferenceItem}>
            <Text>Data Sharing</Text>
            <Switch
              value={dataSharing}
              onValueChange={setDataSharing}
              trackColor={{ false: '#E0E0E0', true: '#4F46E5' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect Health Devices</Text>
          <Text style={styles.sectionDescription}>
            Connect your health devices to sync your health data. Your data is secure and private.
          </Text>
          
          {isConnecting && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.loadingText}>Connecting device...</Text>
            </View>
          )}
          
          <FlatList
            data={providers}
            renderItem={renderDeviceProvider}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  editIcon: {
    position: 'absolute',
    bottom: 15,
    right: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  deviceButtonConnected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  deviceButtonConnecting: {
    backgroundColor: '#E0E0E0',
  },
  deviceIcon: {
    marginRight: 10,
  },
  deviceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  connectedIcon: {
    marginLeft: 8,
  },
  separator: {
    height: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  logoutButton: {
    marginTop: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
});