/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';

export const MessagingSocketContext = createContext(null);

export const MessagingSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to WebSocket gateway namespace /community/messages
    const origin = window.location.origin;
    const messagingSocket = io(`${origin}/community/messages`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    messagingSocket.on('connect', () => {
      setConnected(true);
    });

    messagingSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(messagingSocket);

    return () => {
      messagingSocket.disconnect();
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
