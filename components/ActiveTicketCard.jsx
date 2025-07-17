// components/ActiveTicketCard.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActiveTicketCard = ({ ticket }) => {
  if (!ticket) {
    return (
        <View className="p-5 bg-green-100 rounded-2xl items-center justify-center">
            <Ionicons name="checkmark-done-circle" size={32} color="green" />
            <Text className="text-lg font-bold text-green-800 mt-2">No active tickets!</Text>
            <Text className="text-gray-600">You're all caught up.</Text>
        </View>
    );
  }

  return (
    <View className="bg-white p-4 rounded-2xl shadow-md border border-gray-200">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-sm font-bold text-indigo-600">{ticket.ticketId}</Text>
          <Text className="text-lg font-bold text-gray-800 mt-1">{ticket.companyName}</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="location-sharp" size={16} color="gray" />
            <Text className="text-gray-600 ml-1 flex-shrink">{ticket.siteAddress}</Text>
          </View>
        </View>
        <View className="bg-yellow-100 px-3 py-1 rounded-full ml-2">
            <Text className="text-yellow-800 font-bold text-xs">{ticket.status}</Text>
        </View>
      </View>
      <View className="border-t border-gray-100 my-3" />
      <Text className="text-sm text-gray-700 leading-5">{ticket.workDescription}</Text>
      <TouchableOpacity className="bg-indigo-600 mt-4 p-3 rounded-lg items-center justify-center flex-row">
        <Ionicons name="arrow-forward-circle" size={20} color="white" />
        <Text className="text-white font-bold text-sm ml-2">View Details</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ActiveTicketCard;