import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Users, Search, Check } from 'lucide-react';
import { networkConnectionsService } from '../../services/networkConnectionsService';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import { useToast } from '../ui/Toast';

function getInitials(name) {
  if (!name) return 'Z';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function NewGroupModal({ onClose, onSelectConversation }) {
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['my-connections-for-group', searchQuery],
    queryFn: () =>
      networkConnectionsService.getUserConnections('me', {
        q: searchQuery,
        limit: 30,
      }),
    staleTime: 1000 * 20,
  });

  const connections = data?.connections || [];

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const createGroupMutation = useMutation({
    mutationFn: () =>
      messagingService.createGroupConversation({
        name: title.trim(),
        participantIds: selectedUserIds,
      }),
    onSuccess: (res) => {
      toast.success('Group Created', `Group "${title.trim()}" created successfully.`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (res?.conversation) {
        onSelectConversation(res.conversation);
      }
      onClose();
    },
    onError: (err) => {
      toast.error('Failed to create group', err.response?.data?.message || 'Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Group name required', 'Please provide a name for the group.');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Members required', 'Please select at least one connection to join.');
      return;
    }
    createGroupMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0E1524] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-gold/15 text-brand-gold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Group Chat</h2>
              <p className="text-xs text-text-muted">Start an infrastructure project or team group</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden pt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Group Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kerala Metro Phase 2 Planning"
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none"
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Select Members ({selectedUserIds.length})
              </label>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] -mx-2 px-2 border border-white/[0.06] rounded-2xl bg-white/[0.01]">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-xl bg-white/[0.02] animate-pulse" />
                  ))}
                </div>
              ) : connections.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted">
                  No connections found.
                </div>
              ) : (
                connections.map((conn) => {
                  const peer = conn.peer || conn;
                  const userId = peer.id || peer._id;
                  const isSelected = selectedUserIds.includes(userId);
                  const name = peer.name || 'Professional';
                  const avatar = peer.avatar ? getUploadUrl(peer.avatar) : null;

                  return (
                    <button
                      key={conn._id || userId}
                      type="button"
                      onClick={() => toggleUser(userId)}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer ${
                        isSelected ? 'bg-brand-mint/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center overflow-hidden text-brand-mint font-bold text-xs shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(name)}</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">{name}</span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-brand-mint border-brand-mint text-bg-base'
                            : 'border-white/[0.2] bg-white/[0.02]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-text-secondary hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createGroupMutation.isPending || !title.trim() || selectedUserIds.length === 0}
              className="px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all disabled:opacity-40 cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
