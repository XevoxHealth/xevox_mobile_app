import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { LinearGradient } from './authScreens';
import { Icon } from './authScreens';
import { useAuth } from './context';

export const ProfileScreen = () => {
  const { authState, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.profileHeader}
      >
        <View style={styles.profileHeaderContent}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {authState?.user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{authState?.user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{authState?.user?.email || 'user@example.com'}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.profileContent}>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Icon name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  profileHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 40,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  profileContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});