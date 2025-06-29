import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export const LOCATION_TASK_NAME = 'background-location-task';

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
  const { latitude, longitude, accuracy, altitude, speed, heading } = location.coords;

  console.log("📍 Background Location Update:");
  console.log(`- Latitude: ${latitude}`);
  console.log(`- Longitude: ${longitude}`);
  console.log(`- Accuracy: ${accuracy} meters`);
  console.log(`- Altitude: ${altitude}`);
  console.log(`- Speed: ${speed}`);
  console.log(`- Heading: ${heading}`);

  try {
    const activeTicketId = await AsyncStorage.getItem('activeTicketId');
    if (!activeTicketId) {
      console.warn('⚠️ No activeTicketId in AsyncStorage.');
      return;
    }

    console.log(`🚀 Sending location update: ${latitude}, ${longitude} for ticket ${activeTicketId}`);

    await api.post(`/tickets/engineer/location/${activeTicketId}`, {
      latitude,
      longitude,
    });
  } catch (err) {
    console.error('❌ Failed to send location update:', err.message);
  }
});
