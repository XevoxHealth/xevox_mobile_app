import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import React, { useState, useEffect } from 'react';

// Import consolidated components
import { AuthProvider, useAuth } from './src/context';
import { 
  LoginScreen, 
  RegisterScreen, 
  HomeScreen, 
  ChatbotScreen, 
  HealthDataScreen, 
  ProfileScreen 
} from './src/all_screens';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Chat') {
          iconName = focused ? 'chatbubble' : 'chatbubble-outline';
        } else if (route.name === 'Health') {
          iconName = focused ? 'heart' : 'heart-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4F46E5',
      tabBarInactiveTintColor: 'gray',
      tabBarLabelStyle: { fontSize: 12 },
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen} 
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Chat" 
      component={ChatbotScreen} 
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Health" 
      component={HealthDataScreen} 
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ headerShown: false }}
    />
  </Tab.Navigator>
);

const Navigation = () => {
  const { authState, isLoading } = useAuth();
  const [initialRender, setInitialRender] = useState(true);

  // Use effect to handle the initial render
  useEffect(() => {
    if (!isLoading) {
      // Wait a moment before setting initialRender to false to ensure
      // components have time to initialize properly
      const timer = setTimeout(() => {
        setInitialRender(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading || initialRender) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {authState.authenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Navigation />
    </AuthProvider>
  );
};

export default App;