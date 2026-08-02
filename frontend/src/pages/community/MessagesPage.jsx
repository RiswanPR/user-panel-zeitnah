import React, { useState, useEffect } from 'react';
import { useParams } from 'react';
import {
  MessagingSocketProvider,
} from '../../context/MessagingSocketContext';
import { useConversations } from '../../hooks/useConversations';
import { useMessages } from '../../hooks/useMessages';
import { useMessageSocket } from '../../hooks/useMessageSocket';
import { messagingApi } from '../../services/messagingApi';
import InboxSidebar from '../../components/community/messages/InboxSidebar';
import ChatWindow from '../../components/community/messages/ChatWindow';
import GlobalSearchModal from '../../components/community/messages/GlobalSearchModal';
import toast from 'react-hot-toast';

function MessagesContent() {
  const { conversationId: routeConvId } = useParams();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const {
    conversations,
    loading: loadingConversations,
    searchQuery,
    setSearchQuery,
    activeConversationId,
    setActiveConversationId,
    setConversations,
  } = useConversations();

  useEffect(() => {
    if (routeConvId) {
      setActiveConversationId(routeConvId);
    }
  }, [routeConvId, setActiveConversationId]);

  // Keyboard shortcut (Ctrl+K) for Global Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    messages,
    loading: loadingMessages,
    hasMore: hasMoreMessages,
    loadMore: loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    setMessages,
  } = useMessages(activeConversationId);

  const activeConversation = conversations.find(
    (c) => c._id === activeConversationId,
  );

  const {
    typingUsers,
    emitTypingStart,
    emitTypingStop,
    emitMarkRead,
  } = useMessageSocket({
    activeConversationId,
    onMessageReceived: (newMsg) => {
      if (newMsg.conversationId === activeConversationId) {
        setMessages((prev) => [...prev, newMsg]);
        emitMarkRead(activeConversationId, newMsg._id);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === newMsg.conversationId
            ? {
                ...c,
                lastMessagePreview: newMsg.content,
                lastActivity: newMsg.createdAt,
              }
            : c,
        ),
      );
    },
    onMessageUpdated: (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
      );
    },
    onMessageDeleted: (deletedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === deletedMsg._id ? deletedMsg : m)),
      );
    },
  });

  const handleReactMessage = async (messageId, emoji) => {
    try {
      const updated = await messagingApi.reactMessage(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updated : m)),
      );
    } catch (err) {
      toast.error('Failed to add reaction');
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const updated = await messagingApi.pinMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updated : m)),
      );
      toast.success(updated.isPinned ? 'Message pinned' : 'Message unpinned');
    } catch (err) {
      toast.error('Failed to pin message');
    }
  };

  const handleForwardMessage = async (message) => {
    const targetConvId = prompt(
      'Enter target Conversation ID to forward message to:',
    );
    if (!targetConvId) return;

    try {
      await messagingApi.forwardMessage(message._id, targetConvId);
      toast.success('Message forwarded');
    } catch (err) {
      toast.error('Failed to forward message');
    }
  };

  const [mobileView, setMobileView] = useState('sidebar');

  useEffect(() => {
    if (activeConversationId) {
      setMobileView('chat');
    }
  }, [activeConversationId]);

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-slate-950 text-white flex overflow-hidden selection:bg-indigo-500 selection:text-white">
      <div
        className={`${
          mobileView === 'sidebar' ? 'block' : 'hidden'
        } md:block h-full flex-shrink-0 w-full md:w-80 lg:w-96`}
      >
        <InboxSidebar
          conversations={conversations}
          activeId={activeConversationId}
          loading={loadingConversations}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setMobileView('chat');
          }}
          onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        />
      </div>

      <div
        className={`${
          mobileView === 'chat' ? 'block' : 'hidden'
        } md:block flex-1 h-full overflow-hidden`}
      >
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId="me"
          loadingMessages={loadingMessages}
          hasMoreMessages={hasMoreMessages}
          typingUsers={typingUsers}
          onLoadMoreMessages={loadMoreMessages}
          onSendMessage={(payload) =>
            typeof payload === 'string'
              ? sendMessage(payload)
              : sendMessage(payload.content, payload.replyTo)
          }
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onReactMessage={handleReactMessage}
          onPinMessage={handlePinMessage}
          onForwardMessage={handleForwardMessage}
          onTypingStart={() =>
            activeConversationId && emitTypingStart(activeConversationId)
          }
          onTypingStop={() =>
            activeConversationId && emitTypingStop(activeConversationId)
          }
          onBack={() => setMobileView('sidebar')}
        />
      </div>

      {showGlobalSearch && (
        <GlobalSearchModal
          onClose={() => setShowGlobalSearch(false)}
          onSelectResult={(convId) => {
            setActiveConversationId(convId);
            setMobileView('chat');
          }}
        />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <MessagingSocketProvider>
      <MessagesContent />
    </MessagingSocketProvider>
  );
}
