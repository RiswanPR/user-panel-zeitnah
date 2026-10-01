import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Search, MessageSquare, Users } from 'lucide-react';
import { networkConnectionsService } from '../../services/networkConnectionsService';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import { useToast } from '../ui/Toast';
import { getUserDisplayName, getInitials } from '../../utils/messagingIdentity';

export default function NewConversationModal({ onClose, onSelectConversation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-connections-for-chat', searchQuery],
    queryFn: () =>
      networkConnectionsService.getUserConnections('me', {
        q: searchQuery,
        limit: 20,
      }),
    staleTime: 1000 * 20,
  });

  const connections = data?.connections || [];

  const handleSelectUser = async (user) => {
    try {
      const res = await messagingService.startDirectConversation({
        recipientId: user.id || user._id,
      });
      const conv = res?.conversation || res;
      if (conv) {
        onSelectConversation(conv);
      }
      onClose();
    } catch (err) {
      toast.error(
        'Unable to start conversation',
        err.response?.data?.message || 'Please try again.',
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0C121E] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[82vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-mint/15 text-brand-mint border border-brand-mint/25">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                New Direct Message
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Select a connected professional to begin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your network by name or handle..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] -mx-2 px-2">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : connections.length === 0 ? (
            <div className="p-12 text-center my-auto">
              <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">
                {searchQuery
                  ? 'No connections match your query.'
                  : 'No connections found yet in your network.'}
              </p>
            </div>
          ) : (
            connections.map((conn) => {
              const peer = conn.peer || conn;
              const name = getUserDisplayName(peer);
              const headline = peer.headline || '';
              const avatar = peer.avatar ? getUploadUrl(peer.avatar) : null;

              return (
                <button
                  key={conn._id || peer.id}
                  type="button"
                  onClick={() => handleSelectUser(peer)}
                  className="w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-white/[0.04] transition-colors text-left cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-bold text-xs shrink-0 shadow-inner">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(name)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white group-hover:text-brand-mint transition-colors truncate">
                        {name}
                      </p>
                      {peer.role && (
                        <EcosystemRoleBadge role={peer.role} size="xs" />
                      )}
                    </div>
                    {headline && (
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {headline}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
