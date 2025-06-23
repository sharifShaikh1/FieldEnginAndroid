import React from 'react';
import { View, Text, SafeAreaView, Button } from 'react-native';
import { NativeWindStyleSheet } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

NativeWindStyleSheet.setOutput({
  default: 'native',
});

const ProfileScreen = ({ navigation }) => {

  const handleLogout = async () => {
    // Clear all session data from the device
    await AsyncStorage.clear();
    // Navigate back to Login and reset the navigation stack so the user can't go back
    navigation.replace('Login');
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-100 p-4">
      <Text className="text-2xl font-bold mb-4">My Profile</Text>
      {/* You can add user details and payment history sections here later */}
      <Text className="text-lg text-gray-600 mb-8">User and Payment details will be shown here.</Text>
      <View className="w-4/5">
        <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;