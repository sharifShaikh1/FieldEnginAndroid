// components/TicketCard.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const TicketCard = ({ ticket }) => {
  return (
    <View className="bg-white p-4 rounded-xl shadow mb-4">
      <View className="flex-row justify-between">
        <Text className="text-sm font-bold text-indigo-600">{ticket.ticketId}</Text>
        <Text className="text-lg font-bold text-green-600">₹{ticket.amount}</Text>
      </View>
      <Text className="text-lg font-bold text-gray-800 mt-1">{ticket.companyName}</Text>
      <Text className="text-xs bg-gray-200 text-gray-800 self-start px-2 py-1 rounded-full mt-2">{ticket.expertise}</Text>
      <TouchableOpacity className="bg-indigo-100 mt-4 p-3 rounded-lg items-center">
        <Text className="text-indigo-800 font-bold">Request Access</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TicketCard;