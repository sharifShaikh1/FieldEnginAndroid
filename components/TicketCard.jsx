import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const TicketCard = ({ ticket, onAction, actionLabel, hasRequested }) => {
  return (
    <View className="bg-white p-5 rounded-xl shadow-sm mb-4 border border-gray-200">
      <View className="flex-row justify-between items-center">
        <Text className="text-sm font-bold text-indigo-700">{ticket.ticketId}</Text>
        <Text className="text-xl font-bold text-green-600">₹{ticket.amount}</Text>
      </View>
      <Text className="text-lg font-bold text-gray-800 mt-2">{ticket.companyName}</Text>
      <Text className="text-gray-500 mt-1">{ticket.siteAddress}</Text>
      <View className="border-t border-gray-100 my-3" />
      <View className="flex-row flex-wrap">
        {ticket.expertiseRequired.map(exp => (
          <Text key={exp} className="text-xs bg-gray-200 text-gray-800 self-start px-3 py-1 rounded-full mt-2 mr-2">
            {exp}
          </Text>
        ))}
      </View>

      {/* Button with dynamic state */}
      <TouchableOpacity
        onPress={onAction}
        disabled={hasRequested}
        className={`${hasRequested ? 'bg-gray-300' : 'bg-indigo-600'} mt-4 p-4 rounded-lg items-center`}
      >
        <Text className="text-white font-bold">{hasRequested ? 'Access Requested' : actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TicketCard;
