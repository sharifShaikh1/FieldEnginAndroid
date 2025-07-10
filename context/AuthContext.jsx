import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as SecureStore from 'expo-secure-store'; // <--- ADD THIS

import * as Location from 'expo-location';

import * as TaskManager from 'expo-task-manager';

import api, { setAuthToken } from '../utils/api';

import { LOCATION_TASK_NAME } from '../services/locationTask';

import { Alert } from 'react-native'; // <--- ADD THIS for Alerts if needed in startBackgroundTracking



const AuthContext = createContext();



// Helper function to stop the background task

export const stopBackgroundTracking = async () => {

    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

    if (isTracking) {

        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

        await AsyncStorage.removeItem('activeTicketId'); // Active ticket ID is not sensitive enough for SecureStore

        console.log("Background location tracking has been stopped.");

    }

};



export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);

  const [token, setToken] = useState(null);

  const [isLoading, setIsLoading] = useState(true);



  // NEW: Central state for all dashboard data

  const [dashboardData, setDashboardData] = useState({

    pendingAssignments: [],

    activeTicket: null,

    stats: { available: 0 },

  });

  const [isDashboardLoading, setIsDashboardLoading] = useState(true);



  // NEW: Central function to fetch all dashboard data

  const fetchDashboardData = useCallback(async () => {

    if (!token) return; // Don't fetch if not logged in

    setIsDashboardLoading(true);

    try {

        const [pendingRes, activeRes, availableRes] = await Promise.all([

            api.get('/tickets/engineer/pending-assignments'),

            api.get('/tickets/engineer/active-ticket'),

            api.get('/tickets/engineer/available'),

        ]);



        const newActiveTicket = activeRes.data;



        setDashboardData({

            pendingAssignments: pendingRes.data,

            activeTicket: newActiveTicket,

            stats: { available: availableRes.data.length }

        });



        // Manage background tracking based on fetched data

        if (newActiveTicket?._id) {

            const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

            if (!isTracking) { // Only start if not already tracking

                await startBackgroundTracking(newActiveTicket._id);

            }

        } else {

            await stopBackgroundTracking();

        }

    } catch (error) {

        console.error("Failed to fetch dashboard data in AuthContext:", error);

        // If fetching dashboard data fails due to auth issues, log out

        if (error.response && (error.response.status === 401 || error.response.status === 403)) {

          console.warn("Authentication failed during dashboard data fetch, logging out.");

          await logout(); // Use the local logout function

        }

    } finally {

        setIsDashboardLoading(false);

    }

  }, [token]); // token is a dependency for fetchDashboardData



  // NEW: Central function to start background tracking

  const startBackgroundTracking = async (ticketId) => {

    const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

    if (hasStarted) {

        console.log("Attempted to start tracking, but it is already active.");

        return;

    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {

        Alert.alert('Permission Denied', 'Foreground location permission is required.');

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

            notificationTitle: 'FieldSync is Active',

            notificationBody: 'Tracking your location for the active ticket.',

            notificationColor: '#4F46E5',

        },

    });

    console.log("Background location tracking task started for ticket:", ticketId);

  };



  // Function to load user and token from secure storage

  const loadSession = useCallback(async () => {

    try {

      const storedToken = await SecureStore.getItemAsync('token'); // <--- Use SecureStore

      const storedUser = await AsyncStorage.getItem('user'); // User object can remain in AsyncStorage



      if (storedToken && storedUser) {

        const parsedUser = JSON.parse(storedUser);

        setAuthToken(storedToken); // Set token in Axios

        setToken(storedToken);

        setUser(parsedUser);

      }

    } catch (error) {

      console.error('Failed to load user session from secure storage', error);

    } finally {

      setIsLoading(false);

    }

  }, []);



  useEffect(() => {

    loadSession();

  }, [loadSession]);



  // When the token changes (i.e., on login), fetch the initial dashboard data

  useEffect(() => {

      if(token) {

          fetchDashboardData();

      }

  }, [token, fetchDashboardData]);



  const login = async (userData, authToken) => {

    setUser(userData);

    setToken(authToken); // This will trigger the useEffect above to fetch data

    await AsyncStorage.setItem('user', JSON.stringify(userData));

    await SecureStore.setItemAsync('token', authToken); // <--- Use SecureStore for token

  };



  const logout = async () => {

    await stopBackgroundTracking(); // Stop tracking on logout

    setUser(null);

    setToken(null);

    setAuthToken(null); // Clear token from Axios headers

    await AsyncStorage.clear(); // Clear all AsyncStorage items

    await SecureStore.deleteItemAsync('token'); // <--- Delete token from SecureStore

  };



  return (

    <AuthContext.Provider value={{ user, token, isLoading, login, logout, dashboardData, isDashboardLoading, fetchDashboardData, startBackgroundTracking }}>

      {children}

    </AuthContext.Provider>

  );

};



export const useAuth = () => {

  return useContext(AuthContext);

};