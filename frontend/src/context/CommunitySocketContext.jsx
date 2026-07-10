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
      : 'https://beta.zeitnahacademy.com';

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
      // Intelligent Cache Update (Prepend to first page of infinite query)
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          // Prepend to the first page's items array
          newPages[0] = {
            ...newPages[0],
            items: [post, ...newPages[0].items.filter(p => (p._id || p.id) !== (post._id || post.id))],
          };
        }
        return { ...oldData, pages: newPages };
      });
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (post.authorId !== currentUser._id) {
        toast('New post in the community!', { icon: '📣' });
      }
    });

    newSocket.on('story_created', (story) => {
      // Intelligent Cache Update (Prepend to stories array)
      queryClient.setQueryData(['community', 'stories'], (oldData) => {
        if (!oldData) return [story];
        return [story, ...oldData.filter(s => s._id !== story._id)];
      });
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
