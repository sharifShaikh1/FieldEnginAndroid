// components/StatCard.js
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ label, value, icon, color, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1 bg-white p-4 rounded-2xl shadow mr-3 items-center">
      <View className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
         <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-2xl font-bold text-gray-900 mt-2">{value}</Text>
      <Text className="text-sm text-gray-500">{label}</Text>
    </TouchableOpacity>
  );
};

export default StatCard;