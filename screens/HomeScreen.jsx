import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ActiveTicketCard from '../components/ActiveTicketCard';
import PendingAssignmentCard from '../components/PendingAssignmentCard';
import StatCard from '../components/StatCard';
import { LOCATION_TASK_NAME } from '../services/locationTask';

const startBackgroundTracking = async (ticketId) => {
    // ... (This helper function is correct and remains unchanged)
    const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if(hasStarted) {
        console.log("Background tracking is already active.");
        return;
    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
    }
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Background location permission is essential.');
        return;
    }
    await AsyncStorage.setItem('activeTicketId', ticketId);
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5 * 60 * 1000,
        distanceInterval: 200,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'FieldSync Tracking',
            notificationBody: 'Your location is being tracked for the active ticket.',
            notificationColor: '#4F46E5',
        },
    });
    console.log("Background location tracking task started for ticket:", ticketId);
};

const stopBackgroundTracking = async () => {
    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        await AsyncStorage.removeItem('activeTicketId');
        console.log("Background location tracking has been stopped.");
    }
};


const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    // ✅ FIX: Initialize all stats properties to avoid reference errors before data is fetched.
    const [stats, setStats] = useState({ available: 0, pendingPayments: 0, totalEarned: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const fetchData = useCallback(async () => {
        try {
            const [pendingRes, activeRes, availableRes] = await Promise.all([
                api.get('/tickets/engineer/pending-assignments'),
                api.get('/tickets/engineer/active-ticket'),
                api.get('/tickets/engineer/available'),
            ]);
            setPendingAssignments(pendingRes.data);
            setActiveTicket(activeRes.data);
            // ✅ FIX: Safely update the stats state
            setStats({ available: availableRes.data.length, pendingPayments: 0, totalEarned: 0 });

            if (activeRes.data) {
                await startBackgroundTracking(activeRes.data._id);
            } else {
                await stopBackgroundTracking();
            }
        } catch (error) {
            console.error("Fetch Data Error:", error);
            Alert.alert('Error', 'Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

useEffect(() => {
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }).then(loc => {
    console.log("📍 Manual location check:", loc.coords);
  }).catch(err => {
    console.error("❌ Manual location check failed:", err);
  });
}, []);
    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));
    
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const handleAssignmentResponse = async (ticketId, response) => {
        try {
            const { data } = await api.put(`/tickets/engineer/respond-assignment/${ticketId}`, { response });
            Alert.alert('Success', data.message);
            if (response === 'accepted') {
                await startBackgroundTracking(ticketId);
                Alert.alert("Assignment Accepted", "Location tracking has started.");
            }
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Could not respond to assignment.');
        }
    };
    
    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView 
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-xl text-gray-500">Welcome Back,</Text>
                        <Text className="text-3xl font-bold text-gray-900">{user?.fullName || 'Engineer'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Ionicons name="person-circle-outline" size={32} color="black" />
                    </TouchableOpacity>
                </View>

                {loading && !refreshing ? <ActivityIndicator size="large" color="#4F46E5" className="my-10" /> : (
                    <>
                        {pendingAssignments.length > 0 && (
                            <View className="mb-6">
                                <Text className="text-xl font-bold text-red-600 mb-3">Action Required</Text>
                                {pendingAssignments.map(ticket => (
                                    <PendingAssignmentCard 
                                        key={ticket._id} 
                                        ticket={ticket} 
                                        onAccept={() => handleAssignmentResponse(ticket._id, 'accepted')}
                                        onReject={() => handleAssignmentResponse(ticket._id, 'rejected')}
                                    />
                                ))}
                            </View>
                        )}
                        <Text className="text-xl font-bold text-gray-800 mb-3">Your Active Ticket</Text>
                        <ActiveTicketCard ticket={activeTicket} />
                        <View className="flex-row justify-between mt-6">
                            {/* ✅ FIX: The value prop is now guaranteed to be a number */}
                            <StatCard label="Available" value={stats.available} icon="list-circle" color="#3B82F6" onPress={() => navigation.navigate('Available')} />
                            <StatCard label="Payments" value={stats.pendingPayments} icon="wallet" color="#10B981" onPress={() => navigation.navigate('Profile')} />
                            <StatCard label="Earned" value={stats.totalEarned} icon="cash" color="#EF4444" onPress={() => navigation.navigate('History')} />
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;
