// screens/AvailableTicketsScreen.js
import React from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import TicketCard from '../components/TicketCard';

// MOCK DATA
const tickets = [
    { ticketId: 'ABC-111', companyName: 'Nexus Solutions', amount: 1500, expertise: 'Networking', status: 'Open' },
    { ticketId: 'XYZ-222', companyName: 'Secure Cam Ltd.', amount: 2000, expertise: 'CCTV', status: 'Open' },
];

const AvailableTicketsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
        <View className="p-4">
            <Text className="text-3xl font-bold text-gray-900">Available Tickets</Text>
        </View>
        <FlatList
            data={tickets}
            keyExtractor={(item) => item.ticketId}
            renderItem={({ item }) => <TicketCard ticket={item} />}
            contentContainerStyle={{ paddingHorizontal: 16 }}
        />
    </SafeAreaView>
  );
};

export default AvailableTicketsScreen;