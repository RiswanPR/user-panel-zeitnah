/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';

/**
 * SocketContext (Neutralized)
 * Notification sockets are not required by the User Panel (handled via Push Notifications / REST).
 * This stub context remains for backward-compatible interface safety without socket initialization.
 */
export const SocketContext = createContext({
  socket: null,
  notifications: [],
  setNotifications: () => {},
});

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={{ socket: null, notifications: [], setNotifications: () => {} }}>
      {children}
    </SocketContext.Provider>
  );
};

