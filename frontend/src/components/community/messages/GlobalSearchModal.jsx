import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { messagingApi } from '../../../services/messagingApi';

export default function GlobalSearchModal({ onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      const data = await messagingApi.globalSearchMessages(query, filterType);
      setResults(data || []);
    } catch (err) {
      console.error('Global search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            <span>Global Message Search</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input & Filter Selector */}
        <form onSubmit={handleSearch} className="p-3 border-b border-slate-800/60 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search across all conversations e.g. React, NestJS, Resume..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-semibold">Filter:</span>
            {['', 'IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'CODE'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                  filterType === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                {t || 'All'}
              </button>
            ))}
          </div>
        </form>

        {/* Results Stream */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Searching all conversations...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 italic">
              {query ? 'No matching messages found across conversations.' : 'Type a keyword to begin global search.'}
            </div>
          ) : (
            results.map((msg) => (
              <button
                key={msg._id}
                onClick={() => {
                  if (onSelectResult) onSelectResult(msg.conversationId, msg._id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-bold text-indigo-400">[{msg.type}]</span>
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
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
