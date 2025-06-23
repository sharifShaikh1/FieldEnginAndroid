// context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../utils/api';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This function runs when the app starts to check for a saved session
    const loadUserFromStorage = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // IMPORTANT: Set the token in axios headers if it exists
          setAuthToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
      }
      setIsLoading(false);
    };

    loadUserFromStorage();
  }, []);

  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setAuthToken(authToken); // Set token for future API calls
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.setItem('token', authToken);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setAuthToken(null); // Clear token from axios
    await AsyncStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a custom hook to easily use the context
export const useAuth = () => {
  return useContext(AuthContext);
};