import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

const TicketHistoryScreen = () => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
      <Text className="text-xl">Ticket History Screen</Text>
      <Text className="text-gray-500 mt-2">A list of your completed tickets will appear here.</Text>
    </SafeAreaView>
  );
};

export default TicketHistoryScreen;
