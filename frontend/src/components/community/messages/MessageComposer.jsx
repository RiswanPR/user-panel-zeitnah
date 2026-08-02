import React, { useState, useRef } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Code,
  Share2,
  BookOpen,
  FolderGit2,
  Briefcase,
  X,
} from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import { messagingApi } from '../../../services/messagingApi';
import toast from 'react-hot-toast';

export default function MessageComposer({
  onSendMessage,
  onTypingStart,
  onTypingStop,
}) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState('COURSE'); // 'COURSE' | 'PROJECT' | 'PLACEMENT'
  const [shareTitle, setShareTitle] = useState('');
  const [shareDesc, setShareDesc] = useState('');
  const [shareLink, setShareLink] = useState('');

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setContent(val);

    if (onTypingStart) onTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 2000);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          toast.loading('Uploading pasted screenshot...');
          try {
            const uploadRes = await messagingApi.uploadFile(file);
            await onSendMessage({
              type: uploadRes.type,
              content: `Pasted Image ${uploadRes.fileName}`,
              mediaUrl: uploadRes.mediaUrl,
              fileName: uploadRes.fileName,
              fileSize: uploadRes.fileSize,
            });
            toast.dismiss();
            toast.success('Pasted screenshot sent');
          } catch (err) {
            toast.dismiss();
            toast.error('Failed to upload screenshot');
          }
        }
      }
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading(`Uploading ${file.name}...`);
    try {
      const uploadRes = await messagingApi.uploadFile(file);
      await onSendMessage({
        type: uploadRes.type,
        content: file.name,
        mediaUrl: uploadRes.mediaUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
      });
      toast.dismiss();
      toast.success('File uploaded and sent');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to upload file');
    } finally {
      setShowAttachMenu(false);
    }
  };

  const handleSendVoice = async (file) => {
    toast.loading('Uploading voice note...');
    try {
      const uploadRes = await messagingApi.uploadFile(file);
      await onSendMessage({
        type: 'AUDIO',
        content: 'Voice Note',
        mediaUrl: uploadRes.mediaUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
      });
      toast.dismiss();
      toast.success('Voice note sent');
      setShowVoiceRecorder(false);
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to send voice note');
    }
  };

  const handleSendCodeSnippet = async (e) => {
    e.preventDefault();
    if (!codeSnippet.trim()) return;

    await onSendMessage({
      type: 'CODE',
      content: codeSnippet.trim(),
      codeLanguage,
    });
    setCodeSnippet('');
    setShowCodeModal(false);
  };

  const handleSendShareCard = async (e) => {
    e.preventDefault();
    if (!shareTitle.trim()) return;

    await onSendMessage({
      type: shareType,
      content: `Shared ${shareType.toLowerCase()}: ${shareTitle}`,
      sharedMetadata: {
        title: shareTitle,
        description: shareDesc,
        demoUrl: shareLink,
        linkUrl: shareLink,
        githubUrl: shareLink,
      },
    });
    setShareTitle('');
    setShareDesc('');
    setShareLink('');
    setShowShareModal(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;

    try {
      setSending(true);
      const text = content.trim();
      setContent('');

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (onTypingStop) onTypingStop();

      await onSendMessage({ type: 'TEXT', content: text });
    } catch (err) {
      // error handled in hook
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Attach Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-full mb-2 left-4 z-30 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 w-52 space-y-1 text-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Paperclip className="w-4 h-4 text-indigo-400" />
            <span>Upload Document / Media</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCodeModal(true);
              setShowAttachMenu(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Code className="w-4 h-4 text-purple-400" />
            <span>Send Code Snippet</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowShareModal(true);
              setShowAttachMenu(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Share Engineering Resource</span>
          </button>
        </div>
      )}

      {/* Voice Recorder View */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors"
        >
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Attach Files / Code / Resources"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceRecorder(true)}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>

          <textarea
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            onPaste={handlePaste}
            placeholder="Type a message or paste a screenshot... (Enter to send)"
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px] py-2 px-1"
          />

          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-md disabled:opacity-40 transition-all flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      )}

      {/* Code Snippet Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <span>Send Syntax-Highlighted Code</span>
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendCodeSnippet} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Code Snippet
                </label>
                <textarea
                  rows={6}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste code snippet here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold"
                >
                  Send Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Engineering Resource Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Share Engineering Resource</span>
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShareType('COURSE')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 ${
                  shareType === 'COURSE'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Course</span>
              </button>
              <button
                type="button"
                onClick={() => setShareType('PROJECT')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 ${
                  shareType === 'PROJECT'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Project</span>
              </button>
              <button
                type="button"
                onClick={() => setShareType('PLACEMENT')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 ${
                  shareType === 'PLACEMENT'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Placement</span>
              </button>
            </div>

            <form onSubmit={handleSendShareCard} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="Title of resource..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={shareDesc}
                  onChange={(e) => setShareDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Link / URL
                </label>
                <input
                  type="url"
                  value={shareLink}
                  onChange={(e) => setShareLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold"
                >
                  Share Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
