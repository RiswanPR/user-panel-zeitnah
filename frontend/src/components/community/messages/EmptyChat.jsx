import React from 'react';
import { MessageSquare, Users } from 'lucide-react';

export default function EmptyChat({ type = 'unselected' }) {
  if (type === 'no_conversations') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-4">
        <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-indigo-400">
          <Users className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-white">No Conversations Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Start your first real-time conversation with fellow engineering students, mentors, or teachers from any community profile!
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-4">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-indigo-400">
        <MessageSquare className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-bold text-white">Select a Conversation</h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
        Choose a direct message from the inbox on the left to view real-time chat history and messages.
      </p>
    </div>
  );
}
