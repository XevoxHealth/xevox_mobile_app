import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Simple fallback icons (will work on web)
export const Icon = ({ name, size = 24, color = '#000', style, ...props }) => (
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

// Simple gradient fallback
export const LinearGradient = ({ colors, children, style, ...props }) => (
  <View style={[style, { 
    backgroundColor: colors?.[0] || '#667eea',
    ...(Platform.OS === 'web' ? {
      background: `linear-gradient(135deg, ${colors?.[0] || '#667eea'}, ${colors?.[1] || '#764ba2'})`
    } : {})
  }]} {...props}>
    {children}
  </View>
);

// Import the real auth context
let useAuth;
try {
  useAuth = require('./context').useAuth;
} catch (e) {
  console.error('Failed to import useAuth:', e);
  // Fallback
  useAuth = () => ({
    authState: { user: { name: 'Demo User' } },
    signIn: async (email, password) => {
      console.log('Fallback signIn called');
      return { success: true };
    },
    signUp: async (userData) => {
      console.log('Fallback signUp called');
      return { success: true };
    },
    signOut: () => {
      Alert.alert('Signed Out', 'You have been signed out successfully');
    }
  });
}

const { width, height } = Dimensions.get('window');

// ================== Welcome Screen ==================
export const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientContainer}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.welcomeLogoText}>XEVOX</Text>
          </View>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Monitor your health 24/7</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="phone" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Connect with smart devices</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="analytics" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Get AI-powered insights</Text>
            </View>
          </View>
          
          <View style={styles.welcomeButtons}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => {
                console.log('Get Started button pressed');
                navigation.navigate('Register');
              }}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                console.log('Sign In button pressed');
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

// ================== Login Screen ==================
export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigation = useNavigation();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    console.log('Login button clicked');
    console.log('Email:', email);
    console.log('Password length:', password.length);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    console.log('Starting login process...');

    try {
      const result = await signIn(email, password);
      console.log('Login result:', result);
      
      if (!result.success) {
        setErrorMessage(result.message || 'Login failed');
      } else {
        console.log('Login successful!');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An error occurred during login: ' + error.message);
    } finally {
      setIsLoading(false);
      console.log('Login process completed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.authGradient}
      >
        <ScrollView contentContainerStyle={styles.authScrollContent}>
          <View style={styles.authHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.authTitle}>Welcome Back</Text>
            <Text style={styles.authSubtitle}>Sign in to continue your health journey</Text>
          </View>
          
          <View style={styles.authFormContainer}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Icon name="alert" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputGroup}>
              <Icon name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <TouchableOpacity 
              style={styles.modernButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.modernButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// ================== Register Screen ==================
export const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigation = useNavigation();
  const { signUp } = useAuth();

  const handleRegister = async () => {
    console.log('=== REGISTER DEBUG ===');
    console.log('Register button clicked');
    console.log('Form data:', {
      name: formData.name,
      email: formData.email,
      passwordLength: formData.password.length,
      confirmPasswordLength: formData.confirmPassword.length
    });

    if (!formData.name || !formData.email || !formData.password) {
      const error = 'Please fill in all fields';
      console.log('Validation error:', error);
      setErrorMessage(error);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      const error = 'Passwords do not match';
      console.log('Password mismatch error');
      setErrorMessage(error);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    console.log('Starting registration process...');

    try {
      console.log('Calling signUp function...');
      const result = await signUp(formData);
      console.log('Registration result:', result);
      
      if (!result.success) {
        console.log('Registration failed:', result.message);
        setErrorMessage(result.message || 'Registration failed');
      } else {
        console.log('Registration successful!');
        // Show success message
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage('An error occurred during registration: ' + error.message);
    } finally {
      setIsLoading(false);
      console.log('Registration process completed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.authGradient}
      >
        <ScrollView contentContainerStyle={styles.authScrollContent}>
          <View style={styles.authHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.authTitle}>Create Account</Text>
            <Text style={styles.authSubtitle}>Join us on your health journey</Text>
          </View>
          
          <View style={styles.authFormContainer}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Icon name="alert" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputGroup}>
              <Icon name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => {
                  console.log('Name changed:', text);
                  setFormData({...formData, name: text});
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Icon name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Email address"
                value={formData.email}
                onChangeText={(text) => {
                  console.log('Email changed:', text);
                  setFormData({...formData, email: text});
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => {
                  console.log('Password changed, length:', text.length);
                  setFormData({...formData, password: text});
                }}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Icon name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  console.log('Confirm password changed, length:', text.length);
                  setFormData({...formData, confirmPassword: text});
                }}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.modernButton, isLoading && styles.modernButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.modernButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Welcome Screen Styles
  gradientContainer: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  welcomeLogoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 18,
    color: '#E5E7EB',
    fontWeight: '300',
  },
  featuresList: {
    marginBottom: 60,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
    fontWeight: '400',
  },
  welcomeButtons: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Auth Screens Styles
  authGradient: {
    flex: 1,
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  authFormContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    marginLeft: 8,
    fontSize: 14,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  modernButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  modernButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});