import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { messagingApi } from '../../../services/messagingApi';

export default function SearchModal({ conversationId, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      const res = await messagingApi.searchMessages(conversationId, query);
      setResults(res || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            <span>Search Conversation Messages</span>
          </h3>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSearch} className="p-3 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Type keyword e.g. React, NestJS, Assignment..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
        </form>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Searching history...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 italic">
              {query ? 'No matching messages found.' : 'Type a query to search.'}
            </div>
          ) : (
            results.map((msg) => (
              <button
                key={msg._id}
                onClick={() => {
                  if (onSelectResult) onSelectResult(msg._id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2">{msg.content}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
