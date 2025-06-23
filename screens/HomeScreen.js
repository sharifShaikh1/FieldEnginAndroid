// screens/HomeScreen.js
import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActiveTicketCard from '../components/ActiveTicketCard';
import StatCard from '../components/StatCard';

// MOCK DATA - Replace with API calls later
const activeTicket = {
  ticketId: 'SITEA-1234',
  companyName: 'Innovate Corp',
  siteAddress: '123 Tech Park, Andheri East, Mumbai',
  workDescription: 'Install 5 new CCTV cameras and configure DVR.',
  status: 'In Progress',
};
const stats = {
  availableTickets: 7,
  pendingPayments: 3,
  totalEarned: 12500,
};

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xl text-gray-500">Welcome Back,</Text>
            <Text className="text-3xl font-bold text-gray-900">Sharif Shaikh</Text>
          </View>
          <TouchableOpacity className="p-2 bg-white rounded-full shadow">
            <Ionicons name="notifications-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>

        {/* Active Ticket Section */}
        <Text className="text-xl font-bold text-gray-800 mb-3">Your Active Ticket</Text>
        <ActiveTicketCard ticket={activeTicket} />

        {/* Stats Section */}
        <View className="flex-row justify-between mt-6">
          <StatCard
            label="Available"
            value={stats.availableTickets}
            icon="list-circle"
            color="#3B82F6"
            onPress={() => navigation.navigate('Available')}
          />
          <StatCard
            label="Payments"
            value={`₹${stats.pendingPayments}`}
            icon="wallet"
            color="#10B981"
            onPress={() => navigation.navigate('Profile')}
          />
           <StatCard
            label="Earned"
            value={`₹${(stats.totalEarned / 1000).toFixed(1)}k`}
            icon="cash"
            color="#EF4444"
            onPress={() => navigation.navigate('History')}
          />
        </View>
        
        {/* You can add more sections here like recent activity etc. */}

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;