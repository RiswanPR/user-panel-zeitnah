import React from 'react';
import { ArrowLeft, Search, Image, BarChart3, Phone, Video, MoreVertical } from 'lucide-react';
import OnlineBadge from './OnlineBadge';

export default function ChatHeader({
  conversation,
  onBack,
  onOpenSearch,
  onOpenGallery,
  onOpenAnalytics,
}) {
  const otherUser = conversation?.otherUser;
  const username = otherUser?.username || 'Direct Message';
  const avatarUrl =
    otherUser?.profilePicture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="relative">
          <img
            src={avatarUrl}
            alt={username}
            className="w-10 h-10 rounded-full object-cover border border-slate-800"
          />
          <div className="absolute bottom-0 right-0">
            <OnlineBadge status={otherUser?.status || 'ONLINE'} size="sm" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">@{username}</h3>
            {otherUser?.rank && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400">
                {otherUser.rank}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            {otherUser?.status === 'ONLINE'
              ? 'Active Now'
              : otherUser?.lastSeen
              ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Offline'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
            title="Shared Media Gallery"
          >
            <Image className="w-4 h-4" />
          </button>
        )}
        {onOpenAnalytics && (
          <button
            onClick={onOpenAnalytics}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
            title="Conversation Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        )}
        <button
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          title="Voice call (Coming soon)"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          title="Video call (Coming soon)"
        >
          <Video className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
