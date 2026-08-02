import React, { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import EmptyChat from './EmptyChat';
import PinnedMessagesBar from './PinnedMessagesBar';
import ImageViewerModal from './ImageViewerModal';
import PdfViewerModal from './PdfViewerModal';
import SearchModal from './SearchModal';
import SharedMediaGallery from './SharedMediaGallery';
import ConversationAnalyticsModal from './ConversationAnalyticsModal';
import { useOfflineQueue } from '../../../hooks/useOfflineQueue';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function ChatWindow({
  conversation,
  messages = [],
  currentUserId,
  loadingMessages,
  hasMoreMessages,
  typingUsers = [],
  onLoadMoreMessages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onPinMessage,
  onForwardMessage,
  onTypingStart,
  onTypingStop,
  onBack,
}) {
  const [activeImage, setActiveImage] = useState(null);
  const [activePdf, setActivePdf] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { isOnline, offlineQueue, queueMessage, flushQueue } = useOfflineQueue();

  if (!conversation) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col h-full">
        <EmptyChat type="unselected" />
      </div>
    );
  }

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const handleSendMessageWrapper = async (payload) => {
    if (!isOnline) {
      const msgData = typeof payload === 'string' ? { content: payload } : payload;
      queueMessage({ ...msgData, conversationId: conversation._id });
      return;
    }
    await onSendMessage(payload);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const { messagingApi } = await import('../../../services/messagingApi');
      const uploadRes = await messagingApi.uploadFile(file);
      handleSendMessageWrapper({
        type: uploadRes.type,
        content: file.name,
        mediaUrl: uploadRes.mediaUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
      });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-indigo-950/90 backdrop-blur-md border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-full bg-indigo-600/30 text-indigo-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Drop file to share in chat</h3>
        </div>
      )}

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Working Offline. {offlineQueue.length} messages queued.</span>
          </div>
          <button
            onClick={flushQueue}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/40"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Header */}
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        onOpenSearch={() => setShowSearch(true)}
        onOpenGallery={() => setShowGallery(true)}
        onOpenAnalytics={() => setShowAnalytics(true)}
      />

      {/* Pinned Messages Banner */}
      <PinnedMessagesBar pinnedMessages={pinnedMessages} />

      {/* Message History Stream */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          loading={loadingMessages}
          hasMore={hasMoreMessages}
          onLoadMore={onLoadMoreMessages}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onReactMessage={onReactMessage}
          onPinMessage={onPinMessage}
          onForwardMessage={onForwardMessage}
          onViewImage={(url, name) => setActiveImage({ url, name })}
          onViewPdf={(url, name) => setActivePdf({ url, name })}
        />

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="absolute bottom-2 left-4 z-10">
            <TypingIndicator username={typingUsers.join(', ')} />
          </div>
        )}
      </div>

      {/* Message Composer */}
      <MessageComposer
        onSendMessage={handleSendMessageWrapper}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />

      {/* Modals & Drawers */}
      {activeImage && (
        <ImageViewerModal
          imageUrl={activeImage.url}
          fileName={activeImage.name}
          onClose={() => setActiveImage(null)}
        />
      )}

      {activePdf && (
        <PdfViewerModal
          pdfUrl={activePdf.url}
          fileName={activePdf.name}
          onClose={() => setActivePdf(null)}
        />
      )}

      {showSearch && (
        <SearchModal
          conversationId={conversation._id}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showGallery && (
        <SharedMediaGallery
          conversationId={conversation._id}
          onClose={() => setShowGallery(false)}
        />
      )}

      {showAnalytics && (
        <ConversationAnalyticsModal
          conversationId={conversation._id}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
