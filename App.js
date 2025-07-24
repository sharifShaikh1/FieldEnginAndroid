import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import the provider and hook
import { SocketProvider } from './context/SocketContext'; // Import the SocketProvider
import { Linking, Text } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppNavigator from './navigators/AppNavigator';
import { View, ActivityIndicator } from 'react-native';
import './services/locationTask';
import './global.css'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';

const Stack = createStackNavigator();

// This should match the EXPO_GO_URL in your backend .env file
const EXPO_GO_URL = 'exp://192.168.1.241:8081';

const linking = {
  prefixes: [`${EXPO_GO_URL}/--`],
  config: {
    screens: {
      ResetPassword: 'reset-password/:token',
    },
  },
};

// This component decides which navigator to show
const AppContent = () => {
  const { token, isLoading } = useAuth();

  // Show a loading spinner while checking for a saved session
  if (isLoading) {
    return (
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        // If a token exists, the user is logged in. Show the main app.
        <Stack.Screen name="AppNavigator" component={AppNavigator}  />
      ) : (
        // If no token, show the authentication screens.
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

// The main App component now just sets up the providers
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
          <AppContent />
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}