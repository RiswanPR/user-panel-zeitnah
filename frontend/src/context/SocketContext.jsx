/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        // eslint-disable-next-line
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('token');
    
    // Connect to WebSocket gateway
    const newSocket = io(window.location.origin, {
      auth: { token, userId: user.userId },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      // connected
    });

    newSocket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};
