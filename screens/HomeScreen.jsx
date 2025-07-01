import React, { useState, useCallback, useEffect } from 'react';
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
    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    const trackedTicketId = await AsyncStorage.getItem('activeTicketId');

    if (isTracking && trackedTicketId === ticketId) {
        console.log(`Background tracking is already active for the correct ticket: ${ticketId}`);
        return;
    }

    if (isTracking) {
        console.log(`Switching tracked ticket from ${trackedTicketId} to ${ticketId}.`);
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for active tickets.');
        return;
    }
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Background location permission is essential for tracking.');
        return;
    }

    await AsyncStorage.setItem('activeTicketId', ticketId);
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5 * 60 * 1000, // 5 minutes
        distanceInterval: 200, // 200 meters
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
    const [stats, setStats] = useState({ available: 0, pendingPayments: 0, totalEarned: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRes, activeRes, availableRes] = await Promise.all([
                api.get('/tickets/engineer/pending-assignments'),
                api.get('/tickets/engineer/active-ticket'),
                api.get('/tickets/engineer/available'),
            ]);
            
            setActiveTicket(activeRes.data);
            setPendingAssignments(pendingRes.data);
            setStats(prevStats => ({ ...prevStats, available: availableRes.data.length }));

        } catch (error) {
            console.error("Fetch Data Error:", error);
            Alert.alert('Error', 'Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void fetchData();
        }, [fetchData])
    );

    // This effect hook now handles all tracking logic.
    // It runs only when the `activeTicket` state changes.
    useEffect(() => {
        const manageTracking = async () => {
            if (activeTicket) {
                await startBackgroundTracking(activeTicket._id);
            } else {
                await stopBackgroundTracking();
            }
        };
        void manageTracking();
    }, [activeTicket]);
    
    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAssignmentResponse = async (ticketId, response) => {
        try {
            const { data } = await api.put(`/tickets/engineer/respond-assignment/${ticketId}`, { response });
            Alert.alert('Success', data.message);
            if (response === 'accepted') {
                Alert.alert("Assignment Accepted", "The ticket is now active.");
            }
            void fetchData(); // Refresh all data
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
                            <StatCard label="Available" value={stats.available} icon="list-circle" color="#3B82F6" onPress={() => navigation.navigate('Available')} />
                            <StatCard label="Payments" value={stats.pendingPayments} icon="wallet" color="#10B981" onPress={() => navigation.navigate('Profile')} />
                            <StatCard label="History" value={stats.totalEarned} icon="archive" color="#6B7280" onPress={() => navigation.navigate('History')} />
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;
