import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import { useAuth, useHealth } from './context';
import { api } from './api_service';
import { 
  Button, 
  Card, 
  Input, 
  Header, 
  HealthMetricCard,
  ChatBubble 
} from './components';

const { width } = Dimensions.get('window');

// ================== Login Screen ==================
export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigation = useNavigation();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn(email, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Login failed');
      }
    } catch (error) {
      setErrorMessage('An error occurred during login');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>XEVOX Health</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
            
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            
            <Input
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity style={styles.forgotPasswordBtn}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
            />
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ================== Register Screen ==================
export const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const navigation = useNavigation();
    const { signUp } = useAuth();
  
    const handleRegister = async () => {
      if (!name || !email || !password || !confirmPassword) {
        setErrorMessage('Please fill in all fields');
        return;
      }
      
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
      
      setIsLoading(true);
      setErrorMessage('');
  
      try {
        const result = await signUp(name, email, password, confirmPassword);
        
        // Always show alert regardless of success to provide feedback
        Alert.alert(
          result.success ? 'Registration Successful' : 'Registration Failed',
          result.success 
            ? 'You can now login with your email and password' 
            : (result.message || 'Please try again.'),
          [
            { 
              text: result.success ? 'Login Now' : 'OK', 
              onPress: () => {
                if (result.success) {
                  // Ensure we navigate to Login
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }
              }
            }
          ]
        );
      } catch (error) {
        setErrorMessage('An error occurred during registration');
        console.error(error);
        
        Alert.alert(
          'Registration Error',
          'An unexpected error occurred. Please try again later.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>XEVOX Health</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
            
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            
            <Input
              icon="person-outline"
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            
            <Input
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <Input
              icon="lock-closed-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <Button
              title="Sign Up"
              onPress={handleRegister}
              loading={isLoading}
            />
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.registerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ================== Home Screen ==================
export const HomeScreen = () => {
    const [insights, setInsights] = useState({ observations: '', recommendations: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { authState } = useAuth();
    const { healthData, fetchHealthData, isLoading: healthLoading } = useHealth();
  
    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          console.log("Loading insights data...");
          const [observationsRes, recommendationsRes] = await Promise.all([
            api.getObservations(),
            api.getRecommendations()
          ]);
          
          console.log("Insights loaded:", { 
            observations: observationsRes, 
            recommendations: recommendationsRes 
          });
          
          setInsights({
            observations: observationsRes.observations || "No observations available",
            recommendations: recommendationsRes.recommendations || "No recommendations available"
          });
        } catch (error) {
          console.error('Error loading insights', error);
          setError('Failed to load insights. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }, []);
  
    const handleConnectDevice = async () => {
      try {
        const result = await api.connectDevice();
        if (result && result.widget_url) {
          await WebBrowser.openBrowserAsync(result.widget_url);
          // Refresh health data after connecting
          fetchHealthData();
        }
      } catch (error) {
        console.error('Error connecting device', error);
        Alert.alert('Error', 'Failed to connect device');
      }
    };
  
    // Render fallback for no data or loading state
    const renderFallback = () => {
      if (error) {
        return (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={50} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setIsLoading(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      }
      
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </View>
      );
    };
  
    return (
      <SafeAreaView style={styles.container}>
        <Header title={`Hi, ${authState?.name || 'User'}!`} showLogo />
        
        {isLoading ? (
          renderFallback()
        ) : (
          <ScrollView contentContainerStyle={styles.homeScrollContent}>
            {!healthData && (
              <Card style={styles.connectCard}>
                <Text style={styles.connectTitle}>Connect Your Health Device</Text>
                <Text style={styles.connectText}>
                  Connect your fitness tracker or smartwatch to get personalized health insights
                </Text>
                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={handleConnectDevice}
                >
                  <Icon name="bluetooth-outline" size={18} color="white" />
                  <Text style={styles.connectButtonText}>Connect Device</Text>
                </TouchableOpacity>
              </Card>
            )}
            
            {healthData && (
              <View style={styles.metricsContainer}>
                <Text style={styles.sectionTitle}>Today's Health</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HealthMetricCard
                    icon="footsteps-outline"
                    title="Steps"
                    value={healthData.steps?.average || 0}
                    target={10000}
                    unit="steps"
                  />
                  <HealthMetricCard
                    icon="heart-outline"
                    title="Heart Rate"
                    value={healthData.heartRate?.average || 0}
                    unit="bpm"
                  />
                  <HealthMetricCard
                    icon="moon-outline"
                    title="Sleep"
                    value={healthData.sleep?.average || 0}
                    unit="hrs"
                  />
                </ScrollView>
              </View>
            )}
            
            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>Health Insights</Text>
              {isLoading ? (
                <ActivityIndicator size="large" color="#4F46E5" />
              ) : (
                <>
                  <Card style={styles.insightCard}>
                    <Text style={styles.insightTitle}>
                      <Icon name="eye-outline" size={18} /> Observations
                    </Text>
                    <Text style={styles.insightText}>{insights.observations}</Text>
                  </Card>
                  
                  <Card style={styles.insightCard}>
                    <Text style={styles.insightTitle}>
                      <Icon name="bulb-outline" size={18} /> Recommendations
                    </Text>
                    <Text style={styles.insightText}>{insights.recommendations}</Text>
                  </Card>
                </>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  };

// ================== Chatbot Screen ==================
export const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      text: 'Hello! I\'m your health assistant. How can I help you today?', 
      isUser: false 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatListRef = useRef(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      const response = await api.sendChatMessage(inputText);
      
      if (response.success) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          text: response.assistant_response,
          isUser: false
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Error response
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I'm having trouble processing your request right now. Please try again later.",
          isUser: false
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, an error occurred. Please try again.",
        isUser: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Health Assistant" />
      
      <View style={styles.chatContainer}>
        <FlatList
          ref={chatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble message={item.text} isUser={item.isUser} />
          )}
          contentContainerStyle={styles.chatList}
        />
        
        {isLoading && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Assistant is typing</Text>
            <ActivityIndicator size="small" color="#4F46E5" />
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend}
            disabled={isLoading || !inputText.trim()}
          >
            <Icon 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#4F46E5" : "#A0AEC0"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ================== Health Data Screen ==================
export const HealthDataScreen = () => {
  const [timeframe, setTimeframe] = useState('day');
  const [isLoading, setIsLoading] = useState(true);
  const { healthData, fetchHealthData } = useHealth();
  
  useEffect(() => {
    loadHealthData();
  }, [timeframe]);
  
  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      await fetchHealthData(timeframe);
    } catch (error) {
      console.error('Error loading health data', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const changeTimeframe = (newTimeframe) => {
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe);
    }
  };
  
  const renderMetricChart = (metric, title, color = '#4F46E5') => {
    if (!healthData || !healthData[metric] || !healthData[metric].values.length) {
      return (
        <View style={styles.emptyChartContainer}>
          <Icon name="analytics-outline" size={40} color="#CBD5E0" />
          <Text style={styles.emptyChartText}>No {title} data available</Text>
        </View>
      );
    }
    
    // Prepare data for chart
    const values = healthData[metric].values;
    const labels = healthData[metric].timestamps.map(ts => {
      const date = new Date(ts);
      return timeframe === 'day' 
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    const chartData = {
      labels: labels.length > 5 ? labels.filter((_, i) => i % Math.ceil(labels.length / 5) === 0) : labels,
      datasets: [
        {
          data: values,
          color: () => color,
          strokeWidth: 2
        }
      ]
    };
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: () => color,
            labelColor: () => '#64748B',
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: color
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };
  
  const handleConnectDevice = async () => {
    try {
      const result = await api.connectDevice();
      if (result && result.widget_url) {
        await WebBrowser.openBrowserAsync(result.widget_url);
        // Refresh health data after connecting
        loadHealthData();
      }
    } catch (error) {
      console.error('Error connecting device', error);
      Alert.alert('Error', 'Failed to connect device');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Health Data" />
      
      <View style={styles.timeframeSelector}>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'day' && styles.activeTimeframe]}
          onPress={() => changeTimeframe('day')}
        >
          <Text style={[styles.timeframeText, timeframe === 'day' && styles.activeTimeframeText]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'week' && styles.activeTimeframe]}
          onPress={() => changeTimeframe('week')}
        >
          <Text style={[styles.timeframeText, timeframe === 'week' && styles.activeTimeframeText]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'month' && styles.activeTimeframe]}
          onPress={() => changeTimeframe('month')}
        >
          <Text style={[styles.timeframeText, timeframe === 'month' && styles.activeTimeframeText]}>
            Month
          </Text>
        </TouchableOpacity>
      </View>
      
      {!healthData && !isLoading ? (
        <View style={styles.noDataContainer}>
          <Icon name="fitness-outline" size={80} color="#CBD5E0" />
          <Text style={styles.noDataText}>No health data available</Text>
          <Text style={styles.noDataSubtext}>
            Connect your health device to see your metrics
          </Text>
          <Button 
            title="Connect Device" 
            onPress={handleConnectDevice}
            icon="bluetooth-outline"
            style={styles.connectButton}
          />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.healthDataContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadHealthData} />
          }
        >
          {renderMetricChart('steps', 'Steps', '#4F46E5')}
          {renderMetricChart('heartRate', 'Heart Rate', '#EF4444')}
          {renderMetricChart('sleep', 'Sleep Duration', '#8B5CF6')}
          {renderMetricChart('stress', 'Stress Level', '#F59E0B')}
          {renderMetricChart('caloriesBurned', 'Calories Burned', '#10B981')}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ================== Profile Screen ==================
export const ProfileScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { authState, signOut } = useAuth();
  
  useEffect(() => {
    fetchUserInfo();
  }, []);
  
  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      const info = await api.getUserInfo();
      setUserInfo(info);
    } catch (error) {
      console.error('Error fetching user info', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out', error);
            }
          }
        }
      ]
    );
  };
  
  const handleConnectDevice = async () => {
    try {
      const result = await api.connectDevice();
      if (result && result.widget_url) {
        await WebBrowser.openBrowserAsync(result.widget_url);
        fetchUserInfo();
      }
    } catch (error) {
      console.error('Error connecting device', error);
      Alert.alert('Error', 'Failed to connect device');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" />
      
      <ScrollView 
        contentContainerStyle={styles.profileContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchUserInfo} />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {authState.name ? authState.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{authState.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{userInfo?.email || ''}</Text>
        </View>
        
        <View style={styles.profileCards}>
          <Card style={styles.profileCard}>
            <View style={styles.deviceContainer}>
              <Icon name="fitness-outline" size={24} color="#4F46E5" />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceTitle}>Health Device</Text>
                <Text style={styles.deviceStatus}>
                  {userInfo?.device_id ? `Connected (${userInfo.device_id})` : 'Not connected'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deviceButton}
                onPress={handleConnectDevice}
              >
                <Text style={styles.deviceButtonText}>
                  {userInfo?.device_id ? 'Change' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
          
          <Card style={styles.profileCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="settings-outline" size={24} color="#4F46E5" />
              <Text style={styles.menuItemText}>Settings</Text>
              <Icon name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="shield-checkmark-outline" size={24} color="#4F46E5" />
              <Text style={styles.menuItemText}>Privacy</Text>
              <Icon name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="help-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.menuItemText}>Help & Support</Text>
              <Icon name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="information-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.menuItemText}>About</Text>
              <Icon name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </Card>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ================== Styles ==================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  homeScrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
  },
  errorText: {
    color: '#E53E3E',
    marginBottom: 16,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4F46E5',
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#718096',
    fontSize: 14,
  },
  registerLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Home Screen
  connectCard: {
    marginBottom: 16,
    padding: 16,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  connectText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A202C',
  },
  insightsContainer: {
    flex: 1,
  },
  insightCard: {
    marginBottom: 16,
    padding: 16,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A5568',
  },
  
  // Chat Screen
  chatContainer: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  chatList: {
    padding: 16,
    paddingBottom: 80,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 8,
    paddingHorizontal: 16,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    marginLeft: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
  },
  typingText: {
    fontSize: 12,
    color: '#718096',
    marginRight: 8,
  },
  
  // Health Data Screen
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTimeframe: {
    backgroundColor: '#EBF4FF',
  },
  timeframeText: {
    fontSize: 14,
    color: '#718096',
  },
  activeTimeframeText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  healthDataContent: {
    padding: 16,
    paddingBottom: 32,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  connectButton: {
    width: '80%',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  emptyChartContainer: {
    height: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 12,
  },
  
  // Profile Screen
  profileContainer: {
    flexGrow: 1,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  profileCards: {
    flex: 1,
  },
  profileCard: {
    marginBottom: 16,
    padding: 16,
  },
  deviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  deviceStatus: {
    fontSize: 14,
    color: '#718096',
  },
  deviceButton: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deviceButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});