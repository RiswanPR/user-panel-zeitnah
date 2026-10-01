import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Search, Check, Loader2 } from 'lucide-react';
import { networkConnectionsService } from '../../services/networkConnectionsService';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import { useToast } from '../ui/Toast';
import { getUserDisplayName, getInitials } from '../../utils/messagingIdentity';

export default function AddGroupMemberModal({
  isOpen,
  conversation,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const queryClient = useQueryClient();
  const toast = useToast();

  const convId = conversation?._id || conversation?.id;
  const existingParticipantIds = new Set(
    (conversation?.participants || []).map((p) => String(p._id || p.id || p)),
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-connections-add-to-group', searchQuery],
    queryFn: () =>
      networkConnectionsService.getUserConnections('me', {
        q: searchQuery,
        limit: 30,
      }),
    enabled: Boolean(isOpen),
    staleTime: 1000 * 20,
  });

  const connections = data?.connections || [];
  // Filter out users who are already in the group
  const availableConnections = connections.filter((conn) => {
    const connUser = conn?.connectedUser || conn?.targetUser || conn?.user;
    const uId = String(connUser?._id || connUser?.id || connUser);
    return !existingParticipantIds.has(uId);
  });

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const addMembersMutation = useMutation({
    mutationFn: () =>
      messagingService.addGroupMembers(convId, selectedUserIds),
    onSuccess: (res) => {
      toast.success(
        'Members Added',
        `Added ${selectedUserIds.length} member${
          selectedUserIds.length === 1 ? '' : 's'
        } to the group.`,
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      onClose();
    },
    onError: (err) => {
      toast.error(
        'Failed to add members',
        err.response?.data?.message || 'Action failed',
      );
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Add Group Members
                </h2>
                <p className="text-xs text-slate-400">
                  Select connections to add to {conversation?.name || 'this group'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections…"
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Connections List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-white/[0.03]">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs">Loading connections…</span>
              </div>
            ) : availableConnections.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {connections.length > 0
                  ? 'All matching connections are already members of this group.'
                  : 'No matching connections available.'}
              </div>
            ) : (
              availableConnections.map((conn) => {
                const u = conn?.connectedUser || conn?.targetUser || conn?.user;
                if (!u) return null;
                const uId = String(u._id || u.id);
                const isSelected = selectedUserIds.includes(uId);
                const name = getUserDisplayName(u);
                const avatar = u.avatar ? getUploadUrl(u.avatar) : null;

                return (
                  <button
                    key={uId}
                    type="button"
                    onClick={() => toggleUser(uId)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-300 font-medium text-xs flex-shrink-0">
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
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-slate-200 truncate block">
                          {name}
                        </span>
                        {u.username && (
                          <span className="text-[11px] text-slate-400 truncate block">
                            @{u.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selectedUserIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addMembersMutation.mutate()}
                disabled={
                  selectedUserIds.length === 0 || addMembersMutation.isPending
                }
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center gap-1.5"
              >
                {addMembersMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Add Members</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
