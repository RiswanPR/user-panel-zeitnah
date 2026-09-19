/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { storage } from '../services/storage';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let active = true;
    let newSocket = null;

    const connectSocket = async () => {
      const token = await storage.getAccessToken();
      if (!token || !active) return;

      const rawBase = import.meta.env.VITE_API_BASE_URL;
      const baseURL = rawBase
        ? rawBase.replace(/\/api\/?$/, '')
        : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://beta.zeitnahacademy.com');

      // Connect to WebSocket gateway /notifications namespace with JWT
      newSocket = io(`${baseURL}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        // connected
      });

      newSocket.on('connect_error', (err) => {
        console.warn('[Socket:notifications] Connection error:', err.message);
      });

      newSocket.on('notification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
      });

      if (active) {
        setSocket(newSocket);
      } else {
        newSocket.disconnect();
      }
    };

    connectSocket();

    return () => {
      active = false;
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};
