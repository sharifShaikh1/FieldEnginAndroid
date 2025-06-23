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
    <View className="bg-white p-5 rounded-2xl shadow-md border border-gray-200">
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-xs text-indigo-600 font-bold uppercase">{ticket.ticketId}</Text>
          <Text className="text-xl font-bold text-gray-900 mt-1">{ticket.companyName}</Text>
          <Text className="text-gray-500 mt-1">{ticket.siteAddress}</Text>
        </View>
        <View className="items-center bg-yellow-100 px-3 py-1 rounded-full">
            <Text className="text-yellow-800 font-bold text-xs">{ticket.status}</Text>
        </View>
      </View>
      <View className="border-t border-gray-100 my-4" />
      <Text className="text-sm text-gray-700">{ticket.workDescription}</Text>
      <TouchableOpacity className="bg-indigo-600 mt-5 p-4 rounded-xl items-center justify-center">
        <Text className="text-white font-bold text-base">View Details & Update</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ActiveTicketCard;