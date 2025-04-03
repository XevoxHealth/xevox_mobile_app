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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar } from '../api/profile';
import { connectDevice } from '../api/profile';

const ProfileScreen = () => {
  const { authState, logout, updateProfile } = useAuth();
  const [avatarSource, setAvatarSource] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
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
        Alert.alert('Success', 'Device connection initiated');
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
            />
          </View>
          <View style={styles.preferenceItem}>
            <Text>Data Sharing</Text>
            <Switch
              value={dataSharing}
              onValueChange={setDataSharing}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect Devices</Text>
          <TouchableOpacity 
            style={styles.deviceButton}
            onPress={() => handleConnectDevice('fitbit')}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deviceButtonText}>Connect Fitbit</Text>
            )}
          </TouchableOpacity>
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
  },
  deviceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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

export default ProfileScreen;