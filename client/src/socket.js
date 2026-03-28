import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const socket = io(API_URL || '/', {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  auth: () => {
    const token = localStorage.getItem('token');
    return token ? { token } : {};
  },
});

export default socket;
