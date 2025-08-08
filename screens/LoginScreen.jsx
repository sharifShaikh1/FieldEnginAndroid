import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Email and password are required.');
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password, role: 'Engineer' });
      const { token, refreshToken, user } = response.data;
      await login(user, token, refreshToken);
      if (user.role === 'Engineer' && user.isPasswordTemporary) {
        Alert.alert(
          'Welcome & Action Required',
          'Login Successful! Please check your approval email for a link to set your permanent password.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center px-6 bg-gray-100">
      <View>
        <Text className="text-4xl font-bold text-center text-gray-900 mb-2">Welcome Back</Text>
        <Text className="text-lg text-center text-gray-600 mb-10">Sign in to continue</Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          className="mb-4"
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="mb-4"
          mode="outlined"
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          className="p-2 mt-4"
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
        >
          Sign In
        </Button>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-600">Don’t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-indigo-600 font-bold">Register Here</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-center mt-4">
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text className="text-indigo-600 font-bold">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
