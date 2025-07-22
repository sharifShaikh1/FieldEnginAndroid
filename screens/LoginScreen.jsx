// screens/LoginScreen.js
import React, { useState, useContext } from 'react'; // Import useContext
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Get the login function from context

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Email and password are required.');
    }
    setLoading(true);
    try {
      // The role is hardcoded to 'Engineer' as per the original code
      const response = await api.post('/auth/login', { email, password, role: 'Engineer' });
      
      // The backend sends { token, user }
      const { token, refreshToken, user } = response.data;

      // Use the login function from AuthContext to set state globally
      await login(user, token, refreshToken);

      // Navigate after successful login and state update
      // The navigation logic inside AppNavigator will handle the rest
      if (user.role === 'Engineer' && user.isPasswordTemporary) {
        Alert.alert(
          'Welcome & Action Required',
          'Login Successful! Please check your approval email for a link to set your permanent password.',
          [{ text: 'OK' }]
        );
      }
      // No need to call navigation.replace here as the AppNavigator will now
      // automatically show the correct screens because the user state is set.

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center px-6 bg-gray-900">
      <View>
        <Text className="text-4xl font-bold text-center text-white mb-2">Welcome Back</Text>
        <Text className="text-lg text-center text-gray-400 mb-10">Sign in to continue</Text>

        <TextInput
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 text-white text-base"
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 text-white text-base"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className="bg-indigo-600 rounded-lg p-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-center text-lg font-bold">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400">Don’t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-indigo-400 font-bold">Register Here</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-center mt-4">
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text className="text-indigo-400 font-bold">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
