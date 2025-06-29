// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import the provider and hook

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppNavigator from './navigators/AppNavigator';
import { View, ActivityIndicator } from 'react-native';
import './services/locationTask';
const Stack = createStackNavigator();

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
        <Stack.Screen name="MainApp" component={AppNavigator}  />
      ) : (
        // If no token, show the authentication screens.
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

// The main App component now just sets up the providers
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}