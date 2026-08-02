import { useEffect, useState } from 'react';
import { useMessagingSocketContext } from '../context/MessagingSocketContext';

export function useMessageSocket({
  activeConversationId,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
  onTypingStatusChange,
  onPresenceUpdate,
  onConversationUpdated,
}) {
  const { socket, connected } = useMessagingSocketContext();
  const [typingUsers, setTypingUsers] = useState(new Set());

  // Join active conversation room on socket connect or conversation change
  useEffect(() => {
    if (!socket || !activeConversationId) return;

    socket.emit('join_conversation', { conversationId: activeConversationId });

    return () => {
      socket.emit('leave_conversation', {
        conversationId: activeConversationId,
      });
      setTypingUsers(new Set());
    };
  }, [socket, activeConversationId]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message) => {
      if (onMessageReceived) onMessageReceived(message);
    };

    const handleMessageUpdated = (message) => {
      if (onMessageUpdated) onMessageUpdated(message);
    };

    const handleMessageDeleted = (message) => {
      if (onMessageDeleted) onMessageDeleted(message);
    };

    const handleTypingStarted = (data) => {
      if (data.conversationId === activeConversationId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
        if (onTypingStatusChange) onTypingStatusChange(true, data.userId);
      }
    };

    const handleTypingStopped = (data) => {
      if (data.conversationId === activeConversationId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
        if (onTypingStatusChange) onTypingStatusChange(false, data.userId);
      }
    };

    const handlePresenceUpdated = (presence) => {
      if (onPresenceUpdate) onPresenceUpdate(presence);
    };

    const handleConversationUpdated = (conv) => {
      if (onConversationUpdated) onConversationUpdated(conv);
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing_started', handleTypingStarted);
    socket.on('typing_stopped', handleTypingStopped);
    socket.on('presence_updated', handlePresenceUpdated);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing_started', handleTypingStarted);
      socket.off('typing_stopped', handleTypingStopped);
      socket.off('presence_updated', handlePresenceUpdated);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [
    socket,
    activeConversationId,
    onMessageReceived,
    onMessageUpdated,
    onMessageDeleted,
    onTypingStatusChange,
    onPresenceUpdate,
    onConversationUpdated,
  ]);

  const emitTypingStart = (conversationId) => {
    if (socket) socket.emit('typing_start', { conversationId });
  };

  const emitTypingStop = (conversationId) => {
    if (socket) socket.emit('typing_stop', { conversationId });
  };

  const emitMarkRead = (conversationId, messageId) => {
    if (socket) socket.emit('mark_read', { conversationId, messageId });
  };

  return {
    socket,
    connected,
    typingUsers: Array.from(typingUsers),
    emitTypingStart,
    emitTypingStop,
    emitMarkRead,
  };
}
