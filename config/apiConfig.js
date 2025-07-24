// config/apiConfig.js

// Define your possible backend IP addresses here
const locations = {
  LOCATION_A: 'http://192.168.0.108:8021', 
  LOCATION_B: 'http://192.168.1.241:8021', 
};

// --- THIS IS THE ONLY LINE YOU NEED TO CHANGE WHEN YOU SWITCH NETWORKS ---
const CURRENT_LOCATION = 'LOCATION_B';

// --- No need to touch below this line ---
const devApiUrl = locations[CURRENT_LOCATION];
const prodApiUrl = 'https://api.your-production-domain.com'; // For the future

// This automatically selects the correct URL based on whether you are in development or production

export const API_BASE_URL = __DEV__ ? devApiUrl : prodApiUrl;