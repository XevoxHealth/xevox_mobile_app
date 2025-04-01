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