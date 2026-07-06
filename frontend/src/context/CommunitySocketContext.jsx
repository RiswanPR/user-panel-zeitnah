/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CommunitySocketContext = createContext(null);

export const CommunitySocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL 
      ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
      : 'http://<SERVER_IP>:3000';

    const newSocket = io(`${baseURL}/community`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    // ── Listeners ──
    newSocket.on('connect', () => {
      // connection successful
    });

    newSocket.on('post_created', (post) => {
      // Invalidate feed so it fetches the new post, or manually insert it
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      
      // Optionally show a toast if the user is not the author
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (post.authorId !== currentUser._id) {
        toast('New post in the community!', { icon: '📣' });
      }
    });

    newSocket.on('new_notification', (notification) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'notifications'] });
      toast.success(notification.message || 'You have a new notification');
    });

    newSocket.on('disconnect', () => {
      // disconnected
    });

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  return (
    <CommunitySocketContext.Provider value={{ socket }}>
      {children}
    </CommunitySocketContext.Provider>
  );
};
