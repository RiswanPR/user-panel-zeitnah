import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Loader2 } from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useToast } from '../ui/Toast';

export default function EditGroupModal({ isOpen, conversation, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const convId = conversation?._id || conversation?.id;

  useEffect(() => {
    if (isOpen && conversation) {
      setName(conversation.name || conversation.title || '');
      setDescription(conversation.description || '');
    }
  }, [isOpen, conversation]);

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

  const updateMutation = useMutation({
    mutationFn: () =>
      messagingService.updateGroupMetadata(convId, {
        name: name.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      toast.success('Group Updated', 'Group details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      onClose();
    },
    onError: (err) => {
      toast.error(
        'Update failed',
        err.response?.data?.message || 'Could not update group details.',
      );
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-surface-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-card">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-mint/10 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Edit Group Details
                </h2>
                <p className="text-xs text-text-muted">
                  Update group name and workspace description
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg transition-colors hover:bg-surface-elevated"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Architecture & Security Team"
                className="w-full px-3.5 py-2.5 bg-surface-elevated/50 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-mint transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Briefly describe the purpose of this group discussion…"
                className="w-full px-3.5 py-2.5 bg-surface-elevated/50 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-mint resize-none transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-surface-card flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={!name.trim() || updateMutation.isPending}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-mint hover:bg-brand-mint/90 disabled:opacity-40 disabled:hover:bg-brand-mint text-bg-base font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
