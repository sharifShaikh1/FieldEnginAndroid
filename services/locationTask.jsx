import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export const LOCATION_TASK_NAME = 'background-location-task';

const stopBackgroundTracking = async () => {
    const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        await AsyncStorage.removeItem('activeTicketId');
        console.log("Background location tracking has been stopped automatically.");
    }
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error.message);
    return;
  }

  if (!data?.locations?.length) {
    console.warn('⚠️ No location data received');
    return;
  }

  const location = data.locations[0];
  const { latitude, longitude } = location.coords;

  try {
    const activeTicketId = await AsyncStorage.getItem('activeTicketId');
    if (!activeTicketId) {
      console.warn('⚠️ No activeTicketId in AsyncStorage, stopping task.');
      await stopBackgroundTracking();
      return;
    }

    // Verify ticket status with the backend
    const response = await api.get(`/tickets/engineer/active-ticket`);
    const currentActiveTicket = response.data;

    if (!currentActiveTicket || currentActiveTicket._id !== activeTicketId) {
        console.log(`Ticket ${activeTicketId} is no longer active. Stopping tracking.`);
        await stopBackgroundTracking();
        return;
    }

    console.log(`🚀 Sending location update: ${latitude}, ${longitude} for ticket ${activeTicketId}`);
    await api.post(`/tickets/engineer/location/${activeTicketId}`, {
      latitude,
      longitude,
    });
  } catch (err) {
    console.error('❌ Failed to process location update:', err.response?.data?.message || err.message);
    // If the error indicates the ticket is not found or closed, stop tracking
    if (err.response?.status === 404 || err.response?.status === 403) {
        await stopBackgroundTracking();
    }
  }
});
