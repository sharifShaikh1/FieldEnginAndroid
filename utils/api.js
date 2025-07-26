import axios from 'axios';

import { API_BASE_URL } from '../config/apiConfig';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as SecureStore from 'expo-secure-store'; // <--- ADD THIS



const api = axios.create({

  baseURL: `${API_BASE_URL}/api`,

  headers: {
    // 'Content-Type': 'application/json', // Removed to allow Axios to set multipart/form-data automatically
  },

  timeout: 60000, // Increased timeout to 60 seconds for larger file uploads

});



// Flag to prevent multiple refresh token requests simultaneously

let isRefreshing = false;
let failedQueue = [];

// Module-level variable to hold the current refresh token
let currentRefreshToken = null;

// Function to set the refresh token from AuthContext
export const setApiRefreshToken = (token) => {
  currentRefreshToken = token;
};

// Function to process the queue of failed requests

const processQueue = (error, token = null) => {

  failedQueue.forEach(prom => {

    if (error) {

      prom.reject(error);

    } else {

      prom.resolve(token);

    }

  });

  failedQueue = [];

};



export const setAuthToken = (token) => {

  if (token) {

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  } else {

    delete api.defaults.headers.common['Authorization'];

  }

};



// Request Interceptor: Automatically add the token from SecureStore to every request

api.interceptors.request.use(async (config) => {

  // Use the token already set by setAuthToken in api.defaults.headers.common

  // No need to fetch from SecureStore here for every request

  return config;

}, (error) => {

  return Promise.reject(error);

});



// Response Interceptor: Handles expired access tokens and refreshes them

api.interceptors.response.use(

  (response) => response,

  async (error) => {

    const originalRequest = error.config;



    // If error is 401 (Unauthorized) and not a retry already

    if (error.response?.status === 401 && !originalRequest._retry) {

      originalRequest._retry = true; // Mark this request as retried



      if (isRefreshing) {

        // If a token refresh is already in progress, queue the original request

        return new Promise(function(resolve, reject) {

          failedQueue.push({ resolve, reject });

        })

        .then(token => {

          originalRequest.headers['Authorization'] = 'Bearer ' + token;

          return api(originalRequest); // Retry the original request with new token

        })

        .catch(err => {

          return Promise.reject(err);

        });

      }



      // If no refresh in progress, start one

      isRefreshing = true;



      try {

        const refreshToken = currentRefreshToken; // Use the directly managed refresh token



        if (!refreshToken) {

          throw new Error('No refresh token available. Please log in.');

        }



        // Call refresh token endpoint (ensure this endpoint does NOT require an access token)

        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, { refreshToken }); // <--- Direct axios call, not using the 'api' instance to avoid circular dependency

        const { accessToken, refreshToken: newRefreshToken } = res.data;



        // Store new tokens securely

        await SecureStore.setItemAsync('token', accessToken);

        await SecureStore.setItemAsync('refreshToken', newRefreshToken); // <--- Store new refresh token



        setAuthToken(accessToken); // Update default token for 'api' instance



        // Process all queued requests with the new access token

        processQueue(null, accessToken);



        // Retry the original failed request

        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

        return api(originalRequest);



      } catch (refreshError) {

        console.error('Token refresh failed:', refreshError);

        // Invalidate tokens and redirect to login if refresh fails

        await SecureStore.deleteItemAsync('token');

        await SecureStore.deleteItemAsync('refreshToken');

        await AsyncStorage.clear(); // Clear other non-sensitive data

        setAuthToken(null); // Clear Axios header



        // Process the queue, rejecting all promises

        processQueue(refreshError);



        // Re-throw the original error after handling refresh failure

        // Or, if you have a global auth context, you can trigger a logout there.

        // For now, we'll re-throw, and AuthContext will handle the logout if it gets a 401.

        return Promise.reject(error);

      } finally {

        isRefreshing = false;

      }

    }



    // For any other error, just re-throw it

    return Promise.reject(error);

  }

);



export default api;
