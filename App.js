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
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { AuthProvider, HealthProvider, useAuth } from './src/context';

// Screen Components - Fixed imports
import { WelcomeScreen, LoginScreen, RegisterScreen } from './src/authScreens';
import { HomeScreen } from './src/HomeScreen';
import { HealthAssistantScreen } from './src/HealthAssistantScreen';
import { ChronicMonitorsScreen } from './src/ChronicMonitorScreen';
import { ProfileScreen } from './src/ProfileScreen';

// Navigation Stack and Tab Instances
const AuthStackNavigator = createStackNavigator();
const MainTabNavigator = createBottomTabNavigator();

// Custom Icon Component
const TabIcon = ({ name, size = 22, color = '#000', focused = false }) => {
  const getIconShape = (iconName) => {
    const iconStyle = {
      backgroundColor: color,
      width: size,
      height: size,
      borderRadius: size / 4,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: focused ? 1 : 0.6,
    };

    const innerStyle = {
      backgroundColor: '#fff',
      borderRadius: 2,
    };

    switch (iconName) {
      case 'home':
        return (
          <View style={iconStyle}>
            <View style={[innerStyle, { width: size * 0.5, height: size * 0.5 }]} />
          </View>
        );
      case 'chatbubble':
        return (
          <View style={iconStyle}>
            <View style={[innerStyle, { width: size * 0.6, height: size * 0.4, borderRadius: 6 }]} />
          </View>
        );
      case 'heart':
        return (
          <View style={iconStyle}>
            <View style={[innerStyle, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]} />
          </View>
        );
      case 'person':
        return (
          <View style={iconStyle}>
            <View style={[innerStyle, { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275 }]} />
          </View>
        );
      default:
        return (
          <View style={iconStyle}>
            <View style={[innerStyle, { width: size * 0.5, height: size * 0.5 }]} />
          </View>
        );
    }
  };

  return getIconShape(name);
};

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.loadingText}>Loading XEVOX Health...</Text>
  </View>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The app encountered an unexpected error. Please restart the application.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Custom Tab Button Component - FIXED FOR NAVIGATION CONFLICTS
const CustomTabButton = ({ children, onPress, style, accessibilityLabel, ...props }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <TouchableOpacity
      {...props}
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 6,
          paddingBottom: Math.max(6, insets.bottom * 0.3), // Adjust for safe area
          minHeight: 50,
        },
        style
      ]}
      onPress={(e) => {
        console.log('Tab pressed:', accessibilityLabel);
        if (onPress) {
          onPress(e);
        }
      }}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

// Main Tab Navigator Configuration - FIXED POSITIONING
const MainTabsNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <MainTabNavigator.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'home';
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'HealthAssistant':
              iconName = 'chatbubble';
              break;
            case 'ChronicMonitors':
              iconName = 'heart';
              break;
            case 'Profile':
              iconName = 'person';
              break;
          }
          
          return <TabIcon name={iconName} size={size || 22} color={color} focused={focused} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          // FIXED: Proper safe area handling
          paddingBottom: Math.max(8, insets.bottom), 
          height: Platform.select({
            ios: 80 + insets.bottom,
            android: 65,
            default: 65
          }),
          // FIXED: Remove absolute positioning to prevent conflicts
          position: 'relative',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 2 : 4,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        // Custom tab button to handle touch properly
        tabBarButton: (props) => <CustomTabButton {...props} />,
      })}
    >
      <MainTabNavigator.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home Tab',
          tabBarTestID: 'home-tab',
        }}
      />
      <MainTabNavigator.Screen 
        name="HealthAssistant" 
        component={HealthAssistantScreen}
        options={{
          tabBarLabel: 'Assistant',
          tabBarAccessibilityLabel: 'Health Assistant Tab',
          tabBarTestID: 'assistant-tab',
        }}
      />
      <MainTabNavigator.Screen 
        name="ChronicMonitors" 
        component={ChronicMonitorsScreen}
        options={{
          tabBarLabel: 'Monitors',
          tabBarAccessibilityLabel: 'Chronic Monitors Tab',
          tabBarTestID: 'monitors-tab',
        }}
      />
      <MainTabNavigator.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile Tab',
          tabBarTestID: 'profile-tab',
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
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <AuthStackNavigator.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{ 
          title: 'Welcome to XEVOX',
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: {
              opacity: current.progress,
            },
          }),
        }}
      />
      <AuthStackNavigator.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <AuthStackNavigator.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
    </AuthStackNavigator.Navigator>
  );
};

// Main App Content with Navigation - FIXED CONTAINER
const AppNavigationContent = () => {
  const { authState } = useAuth();
  const insets = useSafeAreaInsets();

  console.log('🔍 App Navigation - Auth State:', {
    authenticated: authState.authenticated,
    isLoading: authState.isLoading,
    hasUser: !!authState.user
  });

  // Show loading screen while checking auth state
  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.appContainer, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#4F46E5"
        translucent={false}
      />
      <NavigationContainer>
        {authState.authenticated ? <MainTabsNavigator /> : <AuthStackNavigator_Component />}
      </NavigationContainer>
    </View>
  );
};

// Main App Component with Provider Hierarchy
const App = () => {
  console.log('🚀 App starting...');
  
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <HealthProvider>
            <AppNavigationContent />
          </HealthProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

// Stylesheet for components - FIXED FOR NAVIGATION
const styles = StyleSheet.create({
  // App Container - FIXED
  appContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Loading Screen Styles
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
  
  // Error Screen Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default App;