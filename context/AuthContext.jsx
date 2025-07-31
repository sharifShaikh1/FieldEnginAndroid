import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as SecureStore from 'expo-secure-store'; // <--- ADD THIS

import * as Location from 'expo-location';

import * as TaskManager from 'expo-task-manager';

import api, { setAuthToken, setApiRefreshToken } from '../utils/api';

import { LOCATION_TASK_NAME } from '../services/locationTask';

import { Alert, AppState } from 'react-native'; // <--- ADD THIS for Alerts if needed in startBackgroundTracking



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
  const [pendingTrackingTicketId, setPendingTrackingTicketId] = useState(null);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active' && pendingTrackingTicketId) {
        console.log('App became active, attempting to start deferred tracking.');
        await startBackgroundTracking(pendingTrackingTicketId);
        setPendingTrackingTicketId(null); 
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [pendingTrackingTicketId]);



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

                if (AppState.currentState === 'active') {
                    await startBackgroundTracking(newActiveTicket._id);
                } else {
                    console.log('App is in background, deferring location tracking start.');
                    setPendingTrackingTicketId(newActiveTicket._id);
                }

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
      const storedAccessToken = await SecureStore.getItemAsync('token');
      console.log('loadSession: storedAccessToken from SecureStore:', storedAccessToken);
      const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
      console.log('loadSession: storedRefreshToken from SecureStore:', storedRefreshToken);
      const storedUser = await AsyncStorage.getItem('user');

      if (storedAccessToken && storedRefreshToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('AuthContext: Parsed user from AsyncStorage:', parsedUser);
        setAuthToken(storedAccessToken);
        setApiRefreshToken(storedRefreshToken); // Ensure api.js knows the refresh token
        setToken(storedAccessToken);
        setUser(parsedUser);
      } else {
        // If any part is missing, ensure tokens are cleared in api.js
        setAuthToken(null);
        setApiRefreshToken(null);
      }
    } catch (error) {
      console.error('Failed to load user session from secure storage', error);
      setAuthToken(null);
      setApiRefreshToken(null);
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



  const login = async (userData, accessToken, refreshToken) => {
    setUser(userData);
    setToken(accessToken); // This will trigger the useEffect above to fetch data
    setApiRefreshToken(refreshToken); // Set refresh token in api.js IMMEDIATELY
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await SecureStore.setItemAsync('token', accessToken); // Use SecureStore for access token
    await SecureStore.setItemAsync('refreshToken', refreshToken); // Use SecureStore for refresh token
  };



  const logout = async () => {

    await stopBackgroundTracking(); // Stop tracking on logout

    setUser(null);

    setToken(null);

    setAuthToken(null); // Clear token from Axios headers
    setApiRefreshToken(null); // Clear refresh token from api.js
    await AsyncStorage.clear(); // Clear all AsyncStorage items

    await SecureStore.deleteItemAsync('token'); // <--- Delete token from SecureStore
    await SecureStore.deleteItemAsync('refreshToken'); // <--- Delete refresh token from SecureStore

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