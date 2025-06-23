// utils/api.js
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for potentially slow connections
});

// This function can be called after login to set the token for all future requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// This "interceptor" automatically adds the token from storage to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;