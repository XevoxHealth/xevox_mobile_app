import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

// Context Providers
import { AuthProvider, HealthProvider, useAuth } from './src/context';

// Auth Screens
import { WelcomeScreen, LoginScreen, RegisterScreen } from './src/authScreens';

// Main App Screens
import { HomeScreen } from './src/HomeScreen';
import { HealthAssistantScreen } from './src/HealthAssistantScreen';
import { ChronicMonitorsScreen } from './src/ChronicMonitorScreen';
import { ProfileScreen } from './src/ProfileScreen';

// Simple Icon component for tabs
const TabIcon = ({ name, size = 24, color = '#000', focused = false }) => (
  <View style={[{
    width: size,
    height: size,
    backgroundColor: focused ? color : '#9CA3AF',
    borderRadius: size/4,
    justifyContent: 'center',
    alignItems: 'center'
  }]}>
    <View style={{
      width: size * 0.5,
      height: size * 0.5,
      backgroundColor: '#fff',
      borderRadius: 2
    }} />
  </View>
);

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
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
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main App Tab Navigator
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Assistant':
            iconName = 'chatbubble';
            break;
          case 'Chronic':
            iconName = 'medical';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'home';
        }

        return <TabIcon name={iconName} size={size} color={color} focused={focused} />;
      },
      tabBarActiveTintColor: '#4F46E5',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        paddingTop: 5,
        height: Platform.OS === 'ios' ? 90 : 70,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
      },
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{
        tabBarLabel: 'Home',
      }}
    />
    <Tab.Screen 
      name="Assistant" 
      component={HealthAssistantScreen}
      options={{
        tabBarLabel: 'Assistant',
      }}
    />
    <Tab.Screen 
      name="Chronic" 
      component={ChronicMonitorsScreen}
      options={{
        tabBarLabel: 'Monitor',
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
      }}
    />
  </Tab.Navigator>
);

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.loadingText}>Loading XEVOX Health...</Text>
  </View>
);

// Main App Component with Auth Logic
const AppContent = () => {
  const { authState } = useAuth();

  // Show loading while checking auth state
  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  // Show auth screens if not authenticated
  if (!authState.authenticated) {
    return <AuthStack />;
  }

  // Show main app if authenticated
  return <MainTabNavigator />;
};

// Root App Component with Providers
const App = () => {
  useEffect(() => {
    console.log('🚀 XEVOX Health App Started');
    console.log('📱 Platform:', Platform.OS);
    console.log('🔧 Environment: Development');
  }, []);

  return (
    <AuthProvider>
      <HealthProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </HealthProvider>
    </AuthProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default App;