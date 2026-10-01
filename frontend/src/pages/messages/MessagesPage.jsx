import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';
import ConversationList from '../../components/messages/ConversationList';
import ChatArea from '../../components/messages/ChatArea';
import MessageRequestsView from '../../components/messages/MessageRequestsView';
import NewConversationModal from '../../components/messages/NewConversationModal';
import NewGroupModal from '../../components/messages/NewGroupModal';
import MessagingCommandPalette from '../../components/messages/MessagingCommandPalette';
import { messagingService } from '../../services/messagingService';
import { useMessaging } from '../../context/MessagingContext';

export default function MessagesPage() {
  const { conversationId: routeConvId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUserId, setTargetMessageId } = useMessaging();

  const queryConvId = searchParams.get('c');
  const targetUserId = searchParams.get('user');
  const queryTab = searchParams.get('tab') || 'chats';

  const [activeTab, setActiveTab] = useState(queryTab);
  const [subFilter, setSubFilter] = useState('all');
  const [selectedConversationId, setSelectedConversationId] = useState(
    routeConvId || queryConvId || null,
  );
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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
          const convId = res?.conversation?._id || res?.conversation?.id || res?._id || res?.id;
          if (convId) {
            setSelectedConversationId(convId);
            navigate(`/messages?c=${convId}`, { replace: true });
          }
        })
        .catch((err) => {
          console.error('Failed to open direct conversation with user:', err);
        });
    }
  }, [targetUserId, navigate]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all chats for Command Palette rapid search
  const { data: convsData } = useQuery({
    queryKey: ['conversations', { tab: 'chats', q: '' }],
    queryFn: () => messagingService.getConversations({ tab: 'chats' }),
    staleTime: 1000 * 30,
  });
  const allConversations = convsData?.conversations || [];

  const handleSelectConversation = (conv, targetMsgId) => {
    const convId = conv?._id || conv?.id;
    if (convId) {
      setSelectedConversationId(convId);
      const url = targetMsgId ? `/messages?c=${convId}&m=${targetMsgId}` : `/messages?c=${convId}`;
      navigate(url, { replace: true });
      if (targetMsgId && setTargetMessageId) {
        setTargetMessageId(targetMsgId);
      }
    }
  };

  const handleJumpToMessage = (targetMsgId) => {
    if (!targetMsgId) return;
    if (setTargetMessageId) {
      setTargetMessageId(targetMsgId);
    }
    if (selectedConversationId) {
      navigate(`/messages?c=${selectedConversationId}&m=${targetMsgId}`, { replace: true });
    }
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="h-[calc(100vh-4.25rem)] -m-4 sm:-m-6 lg:-m-8 flex overflow-hidden bg-[#080C14]">
      {/* ── Left Pane: Conversations / Folders / Search ── */}
      <div
        className={`${
          selectedConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-[380px] flex-col shrink-0 h-full`}
      >
        <ConversationList
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setShowNewChatModal(true)}
          onNewGroup={() => setShowNewGroupModal(true)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          subFilter={subFilter}
          onSubFilterChange={setSubFilter}
        />
      </div>

      {/* ── Right Pane: Active Chat / Requests View / Editorial Empty State ── */}
      <div
        className={`${
          !selectedConversationId ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col h-full overflow-hidden bg-[#080C14]`}
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
          /* Editorial Workspace Empty State */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 lg:p-12 relative overflow-hidden bg-[#080C14]">
            {/* Subtle background ambient glow */}
            <div className="absolute w-96 h-96 rounded-full bg-brand-mint/5 blur-3xl pointer-events-none -top-12 -right-12" />
            <div className="absolute w-80 h-80 rounded-full bg-brand-gold/5 blur-3xl pointer-events-none -bottom-12 -left-12" />

            <div className="relative z-10 max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-mint/20 via-brand-mint/10 to-transparent border border-brand-mint/30 flex items-center justify-center text-brand-mint mx-auto shadow-2xl">
                <MessageSquare className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black text-white tracking-tight">
                  Select a conversation to continue.
                </h3>
                <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                  Your professional conversations live here. Connect with engineers, educators, and infrastructure specialists across Zeitnah.
                </p>
              </div>

              {/* Ecosystem Highlights */}
              <div className="grid grid-cols-2 gap-3 text-left pt-1">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Verified Network</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Direct communication with verified infrastructure specialists.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Zap className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Command Center</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Live delivery, rich replies, reactions, and ⌘K navigation.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer shadow-lg shadow-brand-mint/10 focus-ring"
                >
                  Start Direct Message
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer focus-ring flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Group</span>
                </button>
              </div>
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

      {/* Command Palette (⌘K / Ctrl+K) */}
      <MessagingCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        conversations={allConversations}
        currentUserId={currentUserId}
        onSelectConversation={handleSelectConversation}
        onNewChat={() => setShowNewChatModal(true)}
        onNewGroup={() => setShowNewGroupModal(true)}
        onSwitchTab={handleTabChange}
        onFilterUnread={() => {
          handleTabChange('chats');
          setSubFilter('unread');
        }}
        onFilterMentions={() => {
          handleTabChange('chats');
          setSubFilter('mentions');
        }}
        onJumpToMessage={handleJumpToMessage}
      />
    </div>
  );
}
