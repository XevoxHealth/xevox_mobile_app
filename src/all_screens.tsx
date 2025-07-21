// Debug version of all_screens.tsx with logging
import React, { useState, useRef } from 'react';
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

// Simple gradient fallback
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
            <Text style={styles.welcomeSubtext}>Health Assistant</Text>
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
              <Text style={styles.featureText}>AI-powered insights</Text>
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

// ================== Other screens (same as before) ==================
export const HomeScreen = () => {
  const { authState } = useAuth();

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
        <View style={styles.connectDeviceCard}>
          <Icon name="watch" size={48} color="#4F46E5" />
          <Text style={styles.connectTitle}>Connect Your Device</Text>
          <Text style={styles.connectDescription}>
            Connect your smartwatch to start monitoring your health
          </Text>
          <TouchableOpacity 
            style={styles.connectButton} 
            onPress={() => Alert.alert('Demo', 'Device connection coming soon!')}
          >
            <Icon name="bluetooth" size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Connect Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const ChronicMonitorsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Chronic Monitors</Text>
        <Text style={styles.screenSubtitle}>Track your health conditions</Text>
      </View>
      <ScrollView style={styles.screenContent}>
        <View style={styles.connectDeviceCard}>
          <Icon name="heart" size={48} color="#EF4444" />
          <Text style={styles.connectTitle}>No Health Data Available</Text>
          <Text style={styles.connectDescription}>
            Connect a device to start monitoring your chronic conditions
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const HealthAssistantScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI health assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef();

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Demo response
    setTimeout(() => {
      const assistantMessage = {
        id: Date.now() + 1,
        text: "Thank you for your message! This is a demo response from the health assistant.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatHeader}>
        <View style={styles.assistantHeaderInfo}>
          <View style={styles.assistantHeaderAvatar}>
            <Icon name="medical" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.assistantName}>Health Assistant</Text>
            <Text style={styles.assistantStatus}>Online</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.messageBubble,
            message.isUser ? styles.userMessage : styles.assistantMessage
          ]}>
            <View style={[
              styles.messageContent,
              message.isUser ? styles.userMessageContent : styles.assistantMessageContent
            ]}>
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.assistantMessageText
              ]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Ask about your health..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Icon name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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

// ================== Styles ==================
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

  // Home Screen Styles
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

  // Screen Layout Styles
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Chat Screen Styles
  chatHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  assistantHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assistantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  assistantStatus: {
    fontSize: 14,
    color: '#10B981',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageBubble: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userMessageContent: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  assistantMessageContent: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },

  // Profile Screen Styles
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