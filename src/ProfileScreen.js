import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useAuth } from './context';
import { api } from './api_service';

// Define LinearGradient and Icon components locally
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

export const ProfileScreen = () => {
  const { authState, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      
      // Set API service to logout mode to prevent error popups
      api.setLoggingOut(true);
      
      // Perform silent logout
      await signOut();
      
      console.log('✅ Logout completed successfully');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Don't show error to user - logout should always succeed locally
    } finally {
      setIsLoggingOut(false);
      // API service will reset logout state in its logout method
    }
  };

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
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.profileItem}>
            <Icon name="person" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>Name</Text>
              <Text style={styles.itemValue}>{authState?.user?.name || 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.profileItem}>
            <Icon name="mail" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>Email</Text>
              <Text style={styles.itemValue}>{authState?.user?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.profileItem}>
            <Icon name="settings" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>App Preferences</Text>
              <Text style={styles.itemSubtext}>Notifications, themes, and more</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileItem}>
            <Icon name="shield" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>Privacy & Security</Text>
              <Text style={styles.itemSubtext}>Manage your data and privacy</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.profileItem}>
            <Icon name="help-circle" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>Help & Support</Text>
              <Text style={styles.itemSubtext}>Get help with using the app</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileItem}>
            <Icon name="information" size={20} color="#6B7280" />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>About</Text>
              <Text style={styles.itemSubtext}>App version and information</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* FIXED: Silent logout button */}
        <TouchableOpacity 
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
          onPress={handleSignOut}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={styles.logoutButtonText}>Signing Out...</Text>
            </>
          ) : (
            <>
              <Icon name="log-out" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
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
  },
  profileSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
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
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});