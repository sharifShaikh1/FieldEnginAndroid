import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides the token
import { API_BASE_URL } from '../config/apiConfig'; // Assuming you have this config

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { token: authToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const isConnecting = useRef(false); // To prevent multiple connection attempts

  useEffect(() => {
    if (authToken && !socket && !isConnecting.current) {
      isConnecting.current = true;
      console.log('Attempting to connect to socket.io...');
      const newSocket = io(API_BASE_URL, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'], // Force websocket to avoid polling issues
      });

      newSocket.on('connect', () => {
        console.log('Socket.IO connected:', newSocket.id);
        setSocket(newSocket);
        isConnecting.current = false;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setSocket(null);
        isConnecting.current = false;
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error.message);
        isConnecting.current = false;
      });

      return () => {
        if (newSocket.connected) {
          newSocket.disconnect();
          console.log('Socket.IO disconnected on cleanup.');
        }
        isConnecting.current = false;
      };
    } else if (!authToken && socket) {
      // Disconnect if token is no longer available
      console.log('Auth token removed, disconnecting socket.');
      socket.disconnect();
      setSocket(null);
      isConnecting.current = false;
    }
  }, [authToken]); // Re-run when authToken changes

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
