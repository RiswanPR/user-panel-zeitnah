import React, { useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  MoreVertical,
  Pin,
  Smile,
  FileText,
  Download,
  Share2,
} from 'lucide-react';
import VoicePlayer from './VoicePlayer';
import CodeBlock from './CodeBlock';
import ShareCard from './ShareCard';
import EmojiPickerBar from './EmojiPickerBar';

export default function MessageBubble({
  message,
  isOutgoing,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onForward,
  onViewImage,
  onViewPdf,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('HH:mm');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message._id, editContent);
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col space-y-1 my-1.5 ${
        isOutgoing ? 'items-end' : 'items-start'
      }`}
    >
      <div className="relative group max-w-[85%] sm:max-w-[75%]">
        {/* Action Menu trigger & Emoji picker popover */}
        {!message.deleted && (
          <div
            className={`absolute top-1 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              isOutgoing ? '-left-16' : '-right-16'
            }`}
          >
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
              title="React with Emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
              title="Message options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute z-30 bottom-full mb-1 left-0">
            <EmojiPickerBar
              onSelectEmoji={(emoji) => {
                if (onReact) onReact(message._id, emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}

        {/* Context Menu Dropdown */}
        {showMenu && (
          <div
            className={`absolute z-30 bottom-full mb-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden text-xs py-1 ${
              isOutgoing ? 'right-0' : 'left-0'
            }`}
          >
            {onPin && (
              <button
                onClick={() => {
                  onPin(message._id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Pin className="w-3 h-3 text-indigo-400" />
                <span>{message.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>
            )}

            {onForward && (
              <button
                onClick={() => {
                  onForward(message);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Share2 className="w-3 h-3 text-purple-400" />
                <span>Forward</span>
              </button>
            )}

            {isOutgoing && (
              <>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3 text-indigo-400" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    if (onDelete) onDelete(message._id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Message Bubble Body */}
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
            message.deleted
              ? 'bg-slate-900/60 border border-slate-800 text-slate-500 italic'
              : isOutgoing
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
          }`}
        >
          {/* Pinned Tag */}
          {message.isPinned && (
            <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold mb-1">
              <Pin className="w-3 h-3 fill-amber-300" />
              <span>Pinned Message</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="font-bold text-indigo-400 hover:underline"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Rich Content Rendering based on MessageType */}
              {message.type === 'IMAGE' && message.mediaUrl && (
                <div className="my-1.5 overflow-hidden rounded-xl cursor-pointer">
                  <img
                    src={message.mediaUrl}
                    alt={message.fileName || 'Shared Image'}
                    onClick={() =>
                      onViewImage &&
                      onViewImage(message.mediaUrl, message.fileName)
                    }
                    className="max-h-60 w-auto rounded-xl object-cover hover:opacity-90 transition-opacity"
                  />
                </div>
              )}

              {message.type === 'VIDEO' && message.mediaUrl && (
                <div className="my-1.5 overflow-hidden rounded-xl">
                  <video
                    src={message.mediaUrl}
                    controls
                    className="max-h-60 w-full rounded-xl"
                  />
                </div>
              )}

              {message.type === 'PDF' && message.mediaUrl && (
                <div className="flex items-center justify-between gap-3 p-2.5 my-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate text-white">
                      {message.fileName || 'PDF Document'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onViewPdf && onViewPdf(message.mediaUrl, message.fileName)
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white flex-shrink-0"
                  >
                    View PDF
                  </button>
                </div>
              )}

              {message.type === 'DOCUMENT' && message.mediaUrl && (
                <div className="flex items-center justify-between gap-3 p-2.5 my-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate text-white">
                      {message.fileName || 'Shared Document'}
                    </span>
                  </div>
                  <a
                    href={message.mediaUrl}
                    download={message.fileName}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}

              {message.type === 'AUDIO' && message.mediaUrl && (
                <div className="my-1">
                  <VoicePlayer audioUrl={message.mediaUrl} />
                </div>
              )}

              {message.type === 'CODE' && (
                <CodeBlock
                  code={message.content}
                  language={message.codeLanguage || 'javascript'}
                />
              )}

              {['COURSE', 'PROJECT', 'PLACEMENT'].includes(message.type) && (
                <ShareCard type={message.type} metadata={message.sharedMetadata} />
              )}

              {/* Text content */}
              {message.type !== 'CODE' && (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </>
          )}

          {/* Time & Read Status */}
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-300/80 pt-1 mt-0.5">
            {message.edited && <span className="italic">(edited)</span>}
            <span>{formatTime(message.createdAt)}</span>

            {isOutgoing && !message.deleted && (
              <span title={message.seen ? 'Seen' : 'Sent'}>
                {message.seen ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-slate-300" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Emoji Reactions List below bubble */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-200"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
