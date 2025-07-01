import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';
import TicketCard from '../components/TicketCard'; // Assuming you have a generic TicketCard component

const TicketHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/tickets/engineer/history');
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch ticket history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#4F46E5" className="flex-1 justify-center" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-xl text-gray-700">No Completed Tickets</Text>
          <Text className="text-gray-500 mt-2">Your closed tickets will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <TicketCard ticket={item} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
};

export default TicketHistoryScreen;
