import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Users, Sparkles, Inbox } from 'lucide-react';
import ConversationList from '../../components/messages/ConversationList';
import ChatArea from '../../components/messages/ChatArea';
import MessageRequestsView from '../../components/messages/MessageRequestsView';
import NewConversationModal from '../../components/messages/NewConversationModal';
import NewGroupModal from '../../components/messages/NewGroupModal';
import { messagingService } from '../../services/messagingService';

export default function MessagesPage() {
  const { conversationId: routeConvId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryConvId = searchParams.get('c');
  const targetUserId = searchParams.get('user');
  const queryTab = searchParams.get('tab') || 'chats';

  const [activeTab, setActiveTab] = useState(queryTab);
  const [selectedConversationId, setSelectedConversationId] = useState(routeConvId || queryConvId || null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  // Sync route / query changes
  useEffect(() => {
    if (routeConvId) {
      setSelectedConversationId(routeConvId);
    } else if (queryConvId) {
      setSelectedConversationId(queryConvId);
    }
  }, [routeConvId, queryConvId]);

  // Deep-link direct message trigger: ?user=...
  useEffect(() => {
    if (targetUserId) {
      messagingService
        .startDirectConversation({ recipientId: targetUserId })
        .then((res) => {
          if (res?.conversation?._id) {
            setSelectedConversationId(res.conversation._id);
            navigate(`/messages?c=${res.conversation._id}`, { replace: true });
          }
        })
        .catch((err) => {
          console.error('Failed to open direct conversation with user:', err);
        });
    }
  }, [targetUserId, navigate]);

  const handleSelectConversation = (conv) => {
    setSelectedConversationId(conv._id);
    navigate(`/messages?c=${conv._id}`, { replace: true });
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="h-[calc(100vh-4.25rem)] -m-4 sm:-m-6 lg:-m-8 flex overflow-hidden bg-[#0A0E17]">
      {/* ── Left Sidebar: Conversations / Tabs ── */}
      <div
        className={`${
          selectedConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-col shrink-0 h-full`}
      >
        <ConversationList
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setShowNewChatModal(true)}
          onNewGroup={() => setShowNewGroupModal(true)}
        />
      </div>

      {/* ── Right Pane: Active Chat / Requests View / Placeholder ── */}
      <div
        className={`${
          !selectedConversationId ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col h-full overflow-hidden`}
      >
        {activeTab === 'requests' && !selectedConversationId ? (
          <MessageRequestsView onSelectConversation={handleSelectConversation} />
        ) : selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            onBack={() => {
              setSelectedConversationId(null);
              navigate('/messages', { replace: true });
            }}
          />
        ) : (
          /* Empty placeholder for desktop */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 bg-[#0A0E17]">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-brand-mint mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-heading font-bold text-white mb-1.5">
              Select a conversation
            </h3>
            <p className="text-xs text-text-muted max-w-sm leading-relaxed mb-6">
              Connect with engineers, educators, mentors, recruiters, and founders across the infrastructure ecosystem.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer shadow-md"
              >
                Start Direct Message
              </button>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(true)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Direct Chat Modal */}
      {showNewChatModal && (
        <NewConversationModal
          onClose={() => setShowNewChatModal(false)}
          onSelectConversation={handleSelectConversation}
        />
      )}

      {/* New Group Chat Modal */}
      {showNewGroupModal && (
        <NewGroupModal
          onClose={() => setShowNewGroupModal(false)}
          onSelectConversation={handleSelectConversation}
        />
      )}
    </div>
  );
}
