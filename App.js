import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Try to import from the main context first, fallback to simple
let AuthProvider, HealthProvider, useAuth;
try {
  const context = require('./src/context');
  AuthProvider = context.AuthProvider;
  HealthProvider = context.HealthProvider;
  useAuth = context.useAuth;
  console.log('✅ Loaded main context');
} catch (e) {
  console.warn('⚠️ Main context failed, using simple context:', e.message);
  const simpleContext = require('./src/context');
  AuthProvider = simpleContext.AuthProvider;
  HealthProvider = simpleContext.HealthProvider;
  useAuth = simpleContext.useAuth;
}

// Try to import screens, create fallbacks if they fail
let WelcomeScreen, LoginScreen, RegisterScreen, HomeScreen, HealthAssistantScreen, ChronicMonitorsScreen, ProfileScreen;

try {
  const authScreens = require('./src/authScreens');
  WelcomeScreen = authScreens.WelcomeScreen;
  LoginScreen = authScreens.LoginScreen;
  RegisterScreen = authScreens.RegisterScreen;
  console.log('✅ Loaded auth screens');
} catch (e) {
  console.warn('⚠️ Auth screens failed, using fallbacks:', e.message);
  // Create simple fallback screens
  WelcomeScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Welcome to XEVOX</Text>
      <Text style={styles.fallbackText}>Your health monitoring app</Text>
    </View>
  );
  LoginScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Login Screen</Text>
      <Text style={styles.fallbackText}>Login functionality coming soon</Text>
    </View>
  );
  RegisterScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Register Screen</Text>
      <Text style={styles.fallbackText}>Registration functionality coming soon</Text>
    </View>
  );
}

try {
  const homeScreen = require('./src/HomeScreen');
  HomeScreen = homeScreen.HomeScreen;
  console.log('✅ Loaded HomeScreen');
} catch (e) {
  console.warn('⚠️ HomeScreen failed, using fallback:', e.message);
  HomeScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Home</Text>
      <Text style={styles.fallbackText}>Your health dashboard</Text>
    </View>
  );
}

try {
  const healthAssistant = require('./src/HealthAssistantScreen');
  HealthAssistantScreen = healthAssistant.HealthAssistantScreen;
  console.log('✅ Loaded HealthAssistantScreen');
} catch (e) {
  console.warn('⚠️ HealthAssistantScreen failed, using fallback:', e.message);
  HealthAssistantScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Health Assistant</Text>
      <Text style={styles.fallbackText}>AI health assistant coming soon</Text>
    </View>
  );
}

try {
  const chronicMonitors = require('./src/ChronicMonitorScreen');
  ChronicMonitorsScreen = chronicMonitors.ChronicMonitorsScreen;
  console.log('✅ Loaded ChronicMonitorsScreen');
} catch (e) {
  console.warn('⚠️ ChronicMonitorsScreen failed, using fallback:', e.message);
  ChronicMonitorsScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Chronic Monitors</Text>
      <Text style={styles.fallbackText}>Health monitoring coming soon</Text>
    </View>
  );
}

try {
  const profileScreen = require('./src/ProfileScreen');
  ProfileScreen = profileScreen.ProfileScreen;
  console.log('✅ Loaded ProfileScreen');
} catch (e) {
  console.warn('⚠️ ProfileScreen failed, using fallback:', e.message);
  ProfileScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackTitle}>Profile</Text>
      <Text style={styles.fallbackText}>User profile coming soon</Text>
    </View>
  );
}

// Navigation Stack and Tab Instances
const AuthStackNavigator = createStackNavigator();
const MainTabNavigator = createBottomTabNavigator();

// Simple Icon Component
const TabIcon = ({ color, size = 22 }) => (
  <View style={{
    backgroundColor: color,
    width: size,
    height: size,
    borderRadius: size / 4,
  }} />
);

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.loadingText}>Loading XEVOX Health...</Text>
  </View>
);

// Main Tab Navigator Configuration
const MainTabsNavigator = () => {
  return (
    <MainTabNavigator.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
      }}
    >
      <MainTabNavigator.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} size={size} />
        }}
      />
      <MainTabNavigator.Screen 
        name="HealthAssistant" 
        component={HealthAssistantScreen}
        options={{ 
          tabBarLabel: 'Assistant',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} size={size} />
        }}
      />
      <MainTabNavigator.Screen 
        name="ChronicMonitors" 
        component={ChronicMonitorsScreen}
        options={{ 
          tabBarLabel: 'Monitors',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} size={size} />
        }}
      />
      <MainTabNavigator.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} size={size} />
        }}
      />
    </MainTabNavigator.Navigator>
  );
};

// Authentication Stack Navigator
const AuthStackNavigator_Component = () => {
  return (
    <AuthStackNavigator.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <AuthStackNavigator.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStackNavigator.Screen name="Login" component={LoginScreen} />
      <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
    </AuthStackNavigator.Navigator>
  );
};

// Main App Content with Navigation
const AppNavigationContent = () => {
  const { authState } = useAuth();

  console.log('🔍 App Navigation - Auth State:', authState);

  // Show loading screen while checking auth state
  if (authState?.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#4F46E5"
        translucent={false}
      />
      <NavigationContainer>
        {authState?.authenticated ? <MainTabsNavigator /> : <AuthStackNavigator_Component />}
      </NavigationContainer>
    </View>
  );
};

// Main App Component with Provider Hierarchy
const App = () => {
  console.log('🚀 XEVOX Health App starting (simple test version)...');
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HealthProvider>
          <AppNavigationContent />
        </HealthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

// Stylesheet
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
    textAlign: 'center',
  },
  fallbackScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 40,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default App;