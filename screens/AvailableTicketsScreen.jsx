import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../utils/api';
import TicketCard from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';

const AvailableTicketsScreen = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tickets/engineer/available');
      setTickets(data);
    } catch (err) {
      Alert.alert('Error', 'Could not fetch available tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
  
  const onRefresh = () => { setRefreshing(true); fetchTickets(); };

  const handleRequestAccess = async (ticketId) => {
    try {
        // ✅ CORRECTED API CALL URL
        await api.post(`/tickets/${ticketId}/request-access`);
        Alert.alert('Success', 'Access has been requested. The admin will be notified.');
        setTickets(prevTickets => prevTickets.map(t => 
            t._id === ticketId ? { ...t, accessRequestedByMe: true } : t
        ));
    } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Could not request access.');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
        <View className="p-4 bg-white border-b border-gray-200">
            <Text className="text-3xl font-bold text-center text-gray-900">Available Tickets</Text>
        </View>
        <FlatList
            data={tickets}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <TicketCard 
                    ticket={item} 
                    onAction={() => handleRequestAccess(item._id)} 
                    actionLabel="Request Access"
                    hasRequested={item.accessRequests.includes(user.id) || item.accessRequestedByMe}
                />
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center mt-20">
                    <Text className="text-lg text-gray-500">No tickets match your expertise right now.</Text>
                </View>
            )}
        />
    </SafeAreaView>
  );
};

export default AvailableTicketsScreen;
