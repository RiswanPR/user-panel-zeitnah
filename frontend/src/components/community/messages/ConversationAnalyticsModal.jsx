import React, { useState, useEffect } from 'react';
import { BarChart3, X, MessageSquare, Image, FileText, Code, Users } from 'lucide-react';
import { messagingApi } from '../../../services/messagingApi';

export default function ConversationAnalyticsModal({ conversationId, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      if (!conversationId) return;
      try {
        setLoading(true);
        const data = await messagingApi.getConversationAnalytics(conversationId);
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [conversationId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Conversation Analytics</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Calculating analytics...
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Total Messages</span>
                </div>
                <p className="text-xl font-bold text-white">{analytics.totalMessages}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Participants</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {analytics.activeParticipantsCount}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Image className="w-4 h-4 text-emerald-400" />
                  <span>Media Files</span>
                </div>
                <p className="text-xl font-bold text-white">{analytics.mediaCount}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Documents</span>
                </div>
                <p className="text-xl font-bold text-white">{analytics.docsCount}</p>
              </div>

              <div className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Code className="w-4 h-4 text-pink-400" />
                  <span>Code Snippets</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {analytics.codeSnippetsCount}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 italic">
              Failed to load analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
