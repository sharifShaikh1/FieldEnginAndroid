import io from 'socket.io-client';
import API_BASE_URL from '../config/apiConfig';
import * as SecureStore from 'expo-secure-store';

let socket = null;

export const initiateSocketConnection = async () => {
  const token = await SecureStore.getItemAsync('token');
  if (!token) {
    console.error('No authentication token found for socket connection.');
    return;
  }

  if (socket && socket.connected) {
    console.log('Socket already connected.');
    return socket;
  }

  socket = io(API_BASE_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected.');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinTicketRoom = (ticketId, callback) => {
  if (socket) {
    socket.emit('joinTicketRoom', ticketId, callback);
  }
};

export const sendMessage = (messageData, callback) => {
  if (socket) {
    socket.emit('sendMessage', messageData, callback);
  }
};

export const fetchMessages = (data, callback) => {
  if (socket) {
    socket.emit('fetchMessages', data, callback);
  }
};

export const onReceiveMessage = (callback) => {
  if (socket) {
    socket.on('receiveMessage', callback);
  }
};

export const offReceiveMessage = (callback) => {
  if (socket) {
    socket.off('receiveMessage', callback);
  }
};