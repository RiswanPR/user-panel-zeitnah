import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video, Type, UploadCloud } from 'lucide-react';
import { communityApi } from '../../services/communityApi';
import { useCreateStory } from '../../hooks/useCommunity';
import toast from 'react-hot-toast';

const BACKGROUND_COLORS = [
  'bg-gradient-to-br from-purple-500 to-indigo-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-blue-400 to-cyan-500',
  'bg-gradient-to-br from-gray-800 to-gray-900',
];

export default function CreateStoryModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('media'); // 'media' | 'text'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const createStoryMutation = useCreateStory();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      let mediaData = null;

      if (tab === 'media' && file) {
        const uploadRes = await communityApi.uploadMedia(file, (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        });
        
        mediaData = {
          mediaUrl: uploadRes.url,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          mediaDuration: 0, // In a real app, calculate video duration
        };
      } else if (tab === 'text' && !text.trim()) {
        toast.error('Please enter some text');
        setIsUploading(false);
        return;
      }

      createStoryMutation.mutate(
        {
          type: tab === 'media' ? 'MEDIA' : 'TEXT',
          text: tab === 'text' ? text : undefined,
          backgroundColor: tab === 'text' ? bgColor : undefined,
          ...mediaData,
        },
        {
          onSuccess: () => {
            toast.success('Story published!');
            handleClose();
          },
          onError: () => {
            // Rollback the uploaded media if the mutation fails
            if (mediaData?.mediaUrl) {
              communityApi.deleteMedia(mediaData.mediaUrl).catch(() => {});
            }
            setIsUploading(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (error) {
      toast.error('Failed to upload story');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setText('');
    setTab('media');
    removeFile();
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
            <h2 className="text-lg font-bold text-white">Create Story</h2>
            <button 
              onClick={handleClose}
              className="p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-full transition-colors text-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-4 gap-2">
            <button
              onClick={() => setTab('media')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                tab === 'media' ? 'bg-brand-mint text-bg-base' : 'bg-white/[0.05] text-text-muted hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Media
            </button>
            <button
              onClick={() => setTab('text')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                tab === 'text' ? 'bg-brand-mint text-bg-base' : 'bg-white/[0.05] text-text-muted hover:text-white'
              }`}
            >
              <Type className="w-4 h-4" /> Text
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 pt-0">
            {tab === 'media' && (
              <div className="space-y-4">
                {previewUrl ? (
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-white/[0.1] flex items-center justify-center">
                    {file?.type.startsWith('video/') ? (
                      <video src={previewUrl} className="w-full h-full object-cover" controls autoPlay loop muted />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={removeFile}
                      className="absolute top-3 right-3 p-2 bg-black/60 rounded-full hover:bg-danger text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[9/16] rounded-xl border-2 border-dashed border-white/[0.1] hover:border-brand-mint/50 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-white group"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-brand-mint/20 group-hover:text-brand-mint">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="font-semibold text-sm">Click to upload media</p>
                    <p className="text-xs text-text-faint mt-1">Image or Video (max 50MB)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>
            )}

            {tab === 'text' && (
              <div className="space-y-4">
                <div className={`aspect-[9/16] rounded-xl p-6 flex items-center justify-center text-center transition-all ${bgColor}`}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type something..."
                    className="w-full bg-transparent resize-none outline-none text-white text-2xl font-bold placeholder-white/50 text-center"
                    rows={6}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Background</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {BACKGROUND_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setBgColor(color)}
                        className={`w-8 h-8 rounded-full shrink-0 ${color} border-2 ${bgColor === color ? 'border-white' : 'border-transparent'} transition-all`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.05] bg-bg-base flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading || createStoryMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isUploading || 
                createStoryMutation.isPending || 
                (tab === 'media' && !file) || 
                (tab === 'text' && !text.trim())
              }
              className="btn-primary py-2 px-6 text-sm relative"
            >
              {(isUploading || createStoryMutation.isPending) ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" />
                  {isUploading ? `${uploadProgress}%` : 'Publishing...'}
                </div>
              ) : (
                'Publish Story'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
