import React from 'react';
import { Search, MessageSquarePlus, Globe } from 'lucide-react';
import ConversationList from './ConversationList';

export default function InboxSidebar({
  conversations,
  activeId,
  loading,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onNewChat,
  onOpenGlobalSearch,
}) {
  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Inbox</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400">
            {conversations.length}
          </span>
        </h2>

        <div className="flex items-center gap-1.5">
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Global Search Across All Messages"
            >
              <Globe className="w-4 h-4 text-indigo-400" />
            </button>
          )}
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition-colors"
              title="Start New Direct Chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/40">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-hidden">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          loading={loading}
          onSelectConversation={onSelectConversation}
        />
      </div>
    </div>
  );
}
