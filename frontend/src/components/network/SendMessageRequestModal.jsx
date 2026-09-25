import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Send, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingService } from '../../services/messagingService';
import { useToast } from '../ui/Toast';
import { useNavigate } from 'react-router-dom';

export default function SendMessageRequestModal({ recipient, onClose, onSuccess }) {
  const shouldReduceMotion = useReducedMotion();
  const [message, setMessage] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sendMutation = useMutation({
    mutationFn: () =>
      messagingService.startDirectConversation({
        recipientId: recipient._id || recipient.id,
        message: message.trim(),
      }),
    onSuccess: (data) => {
      toast.success(
        data.isMessageRequest ? 'Request Sent' : 'Message Sent',
        data.isMessageRequest
          ? `Message request delivered to ${recipient.name}.`
          : `Message delivered to ${recipient.name}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      onSuccess?.(data);
      onClose();
      if (data?.conversation?._id) {
        navigate(`/messages?c=${data.conversation._id}`);
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to send message request.';
      toast.error('Unable to send', msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate();
  };

  if (!recipient) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[#121B2B] to-[#0A101C] p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-mint/15 text-brand-mint border border-brand-mint/30 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-white">
                Message {recipient.name}
              </h2>
              <p className="text-[11px] text-text-muted">
                {recipient.connectionStatus === 'connected'
                  ? 'Send a direct message'
                  : 'Send a professional message request'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
              Your Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I saw your highway project and would love to exchange insights..."
              maxLength={2000}
              required
              className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 p-3 text-xs text-white placeholder-text-faint focus:outline-none transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-1 text-[10px] text-text-faint">
              <span>Be professional and specific to infrastructure work</span>
              <span>{message.length} / 2000</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
            <Lock className="w-3.5 h-3.5 text-brand-mint/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              Zeitnah is an infrastructure-industry professional network. Messages adhere to our professional conduct policy.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendMutation.isPending || !message.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-mint text-black hover:bg-brand-mint/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-mint/10"
            >
              {sendMutation.isPending ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
