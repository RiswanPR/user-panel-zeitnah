import React, { useState, useEffect } from 'react';
import { X, Image, FileText, Code, Mic, Link as LinkIcon, Download } from 'lucide-react';
import { messagingApi } from '../../../services/messagingApi';

export default function SharedMediaGallery({ conversationId, onClose }) {
  const [activeTab, setActiveTab] = useState('MEDIA'); // 'MEDIA' | 'DOCS' | 'CODE' | 'AUDIO' | 'RESOURCES'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGallery() {
      if (!conversationId) return;
      try {
        setLoading(true);
        const data = await messagingApi.getSharedMediaGallery(
          conversationId,
          activeTab,
        );
        setItems(data || []);
      } catch (err) {
        console.error('Failed to load gallery:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, [conversationId, activeTab]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Image className="w-4 h-4 text-indigo-400" />
          <span>Shared Media & Assets</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('MEDIA')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
            activeTab === 'MEDIA'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>
        <button
          onClick={() => setActiveTab('DOCS')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
            activeTab === 'DOCS'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Docs</span>
        </button>
        <button
          onClick={() => setActiveTab('CODE')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
            activeTab === 'CODE'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>
        <button
          onClick={() => setActiveTab('AUDIO')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
            activeTab === 'AUDIO'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice</span>
        </button>
      </div>

      {/* Items Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Loading shared assets...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 italic">
            No shared items found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between space-y-2"
              >
                {item.type === 'IMAGE' && item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt={item.fileName || 'Shared Image'}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-24 w-full bg-slate-900 rounded-lg flex items-center justify-center p-2 text-center text-[10px] text-slate-300 font-mono overflow-hidden">
                    {item.fileName || item.content}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="truncate max-w-[100px]">
                    {item.fileName || item.type}
                  </span>
                  {item.mediaUrl && (
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-indigo-400 hover:text-indigo-300"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
