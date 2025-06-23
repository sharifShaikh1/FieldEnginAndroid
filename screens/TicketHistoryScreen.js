import React from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { NativeWindStyleSheet } from 'nativewind';
import TicketCard from '../components/TicketCard'; // We can reuse the same card component

NativeWindStyleSheet.setOutput({
  default: 'native',
});

// MOCK DATA - This would come from an API call for completed/closed tickets
const MOCK_HISTORY_TICKETS = [
    { ticketId: 'PQR-789', companyName: 'City High School', amount: 2200, expertise: 'CCTV', status: 'Closed', paymentStatus: 'Paid' },
    { ticketId: 'LMN-456', companyName: 'Global Tech Park', amount: 3500, expertise: 'Networking', status: 'Closed', paymentStatus: 'Paid' },
    { ticketId: 'DEF-123', companyName: 'Sunrise Apartments', amount: 1250, expertise: 'CCTV', status: 'Closed', paymentStatus: 'Pending' },
];

const TicketHistoryScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="p-4 border-b border-gray-200 bg-white">
        <Text className="text-3xl font-bold text-gray-900 text-center">Ticket History</Text>
      </View>
      <FlatList
        data={MOCK_HISTORY_TICKETS}
        keyExtractor={(item) => item.ticketId}
        renderItem={({ item }) => <TicketCard ticket={item} isHistory={true} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
        ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-lg text-gray-500">You have no completed tickets yet.</Text>
            </View>
        )}
      />
    </SafeAreaView>
  );
};

export default TicketHistoryScreen;