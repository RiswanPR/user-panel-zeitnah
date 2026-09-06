/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { storage } from '../services/storage';

export const MessagingSocketContext = createContext(null);

export const MessagingSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let messagingSocket = null;

    const connectMessaging = async () => {
      const token = await storage.getAccessToken();
      if (!token || !active) return;

      const rawBase = import.meta.env.VITE_API_BASE_URL;
      const baseURL = rawBase
        ? rawBase.replace(/\/api\/?$/, '')
        : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://beta.zeitnahacademy.com');

      messagingSocket = io(`${baseURL}/community/messages`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      messagingSocket.on('connect', () => {
        if (active) setConnected(true);
      });

      messagingSocket.on('disconnect', () => {
        if (active) setConnected(false);
      });

      if (active) {
        setSocket(messagingSocket);
      } else {
        messagingSocket.disconnect();
      }
    };

    connectMessaging();

    return () => {
      active = false;
      if (messagingSocket) {
        messagingSocket.disconnect();
      }
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return (
    <MessagingSocketContext.Provider value={{ socket, connected }}>
      {children}
    </MessagingSocketContext.Provider>
  );
};

export const useMessagingSocketContext = () =>
  useContext(MessagingSocketContext);
