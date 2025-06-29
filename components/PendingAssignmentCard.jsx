import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const PendingAssignmentCard = ({ ticket, onAccept, onReject }) => {
  return (
    <View className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-red-500 mb-4">
        <Text className="text-xs text-red-600 font-bold uppercase">PENDING ASSIGNMENT</Text>
        <Text className="text-xl font-bold text-gray-900 mt-1">{ticket.companyName}</Text>
        <Text className="text-gray-500 mt-1">{ticket.siteAddress}</Text>
        <View className="border-t border-gray-100 my-4" />
        <View className="flex-row justify-between space-x-3">
            <TouchableOpacity onPress={onReject} className="flex-1 bg-gray-200 p-4 rounded-xl items-center">
                <Text className="text-gray-800 font-bold">Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} className="flex-1 bg-green-500 p-4 rounded-xl items-center">
                <Text className="text-white font-bold">Accept</Text>
            </TouchableOpacity>
        </View>
    </View>
  );
};

export default PendingAssignmentCard;
