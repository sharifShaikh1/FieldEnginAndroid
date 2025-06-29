import React from 'react';
import { View, Text, SafeAreaView, Button } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  // ✅ CORRECTED: Get user and the correct logout function from our context
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    // The logout function from context will now handle stopping tracking and clearing storage
    logout();
    // Navigation will be handled automatically by the state change in App.js
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-100 p-4">
      <Text className="text-2xl font-bold mb-4">My Profile</Text>
      {user ? (
        <Text className="text-lg text-gray-600 mb-8">{user.email}</Text>
      ) : (
         <Text className="text-lg text-gray-600 mb-8">Loading...</Text>
      )}
      
      {/* More profile details will go here in the future */}

      <View className="w-4/5">
        <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;
