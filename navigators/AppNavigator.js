// navigators/AppNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AvailableTicketsScreen from '../screens/AvailableTicketsScreen';
import TicketHistoryScreen from '../screens/TicketHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Available') {
            iconName = focused ? 'list-circle' : 'list-circle-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5', // Indigo
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // We will handle headers in each screen if needed
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 0, elevation: 10 },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Available" component={AvailableTicketsScreen} options={{ title: 'Available Tickets' }}/>
      <Tab.Screen name="History" component={TicketHistoryScreen} options={{ title: 'Ticket History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;