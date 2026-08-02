import { useState, useEffect, useCallback } from 'react';
import { messagingApi } from '../services/messagingApi';
import toast from 'react-hot-toast';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('zeitnah_offline_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      return [];
    }
  });

  // Save queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'zeitnah_offline_messages',
        JSON.stringify(offlineQueue),
      );
    } catch (err) {
      console.error('Failed to save offline queue:', err);
    }
  }, [offlineQueue]);

  // Flush queued messages when connection is restored
  const flushQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    toast.loading(`Online! Processing ${offlineQueue.length} queued messages...`);
    const remainingQueue = [...offlineQueue];

    for (const msgPayload of offlineQueue) {
      try {
        await messagingApi.sendMessage(msgPayload);
        remainingQueue.shift();
      } catch (err) {
        console.error('Failed to flush message:', err);
        break;
      }
    }

    setOfflineQueue(remainingQueue);
    toast.dismiss();
    if (remainingQueue.length === 0) {
      toast.success('All offline messages sent successfully');
    }
  }, [offlineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet connection restored');
      flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Working offline. Messages will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  const queueMessage = (payload) => {
    setOfflineQueue((prev) => [...prev, { ...payload, queuedAt: Date.now() }]);
    toast('Message saved to offline queue', { icon: '📥' });
  };

  return {
    isOnline,
    offlineQueue,
    queueMessage,
    flushQueue,
  };
}
