import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * Format bytes to readable string (KB / MB)
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  const kb = bytes / k;
  if (kb < k) return `${kb.toFixed(1)} KB`;
  return `${(kb / k).toFixed(2)} MB`;
}

/**
 * Allowed MIME types and extensions
 */
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export default function LogoUploader({
  value = '',
  file = null,
  onChange,
  onRemove,
  label = 'Business Logo',
  required = false,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  disabled = false,
  error: externalError = '',
  className = '',
}) {
  const [internalError, setInternalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  // Sync / create object URL when file prop changes
  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setLocalPreviewUrl(null);
    }
  }, [file]);

  const activeError = externalError || internalError;

  // Determine active preview source
  const effectivePreviewSrc = localPreviewUrl || (value ? getUploadUrl(value) : null);
  const hasImage = Boolean(effectivePreviewSrc);
  const isLocalFile = Boolean(file);

  const validateFile = useCallback(
    (selectedFile) => {
      setInternalError('');

      if (!selectedFile) {
        return false;
      }

      if (selectedFile.size === 0) {
        setInternalError('The selected file is empty. Please choose a valid image.');
        return false;
      }

      if (selectedFile.size > maxSizeBytes) {
        const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
        const actualMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
        setInternalError(`File exceeds the ${maxMb} MB limit (selected: ${actualMb} MB). Please choose a smaller image.`);
        return false;
      }

      // Check MIME type or extension
      const mimeValid = ALLOWED_MIME_TYPES.includes(selectedFile.mimetype || selectedFile.type);
      const name = (selectedFile.name || '').toLowerCase();
      const extValid = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

      if (!mimeValid && !extValid) {
        setInternalError('Invalid format. Please select a PNG, JPG, or WebP image.');
        return false;
      }

      return true;
    },
    [maxSizeBytes]
  );

  const handleFileSelection = useCallback(
    (selectedFile) => {
      if (!selectedFile) return;
      if (validateFile(selectedFile)) {
        if (onChange) {
          onChange(selectedFile);
        }
      }
    },
    [validateFile, onChange]
  );

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFileSelection(selected);
    }
    // reset input value so re-selecting same file triggers change
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only toggle off if leaving the root container
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setInternalError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    } else if (onChange) {
      onChange(null);
    }
  };

  const triggerFileInput = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileInput();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label & Requirement Indicator */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="business-logo-input"
          className="block text-xs font-semibold text-white/80"
        >
          {label} {required ? <span className="text-brand-mint">*</span> : <span className="text-white/35 font-normal">(Optional)</span>}
        </label>
        {isLocalFile && (
          <span className="text-[11px] font-mono text-brand-mint flex items-center gap-1">
            <Check className="w-3 h-3" />
            Ready to upload
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        id="business-logo-input"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
        aria-describedby={activeError ? 'logo-uploader-error' : 'logo-uploader-specs'}
      />

      {/* Main Upload / Preview Surface */}
      {hasImage ? (
        /* ── PREVIEW CARD STATE ── */
        <div className="relative rounded-2xl bg-[#0E121A] border border-white/[0.1] p-4 transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Logo Display Stage */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[#070B10] border border-white/[0.08] flex items-center justify-center p-2.5 overflow-hidden shrink-0 shadow-inner group">
              {/* Subtle transparent grid guide pattern */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
                  backgroundSize: '12px 12px',
                }}
              />
              <img
                src={effectivePreviewSrc}
                alt="Business logo preview"
                className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Metadata & Actions */}
            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-white/95">
                  {isLocalFile ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-brand-mint shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white/40 shrink-0" />
                      <span>Current Business Logo</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {isLocalFile ? formatFileSize(file.size) : 'Configured on business profile'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white/70" />
                  <span>{isLocalFile ? 'Change' : 'Replace Logo'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 transition-colors cursor-pointer border border-red-500/20 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── EMPTY / DROPZONE STATE ── */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={triggerFileInput}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#121217] ${
            isDragging
              ? 'border-brand-mint bg-brand-mint/[0.06] scale-[1.01]'
              : 'border-white/[0.12] bg-white/[0.02] hover:border-white/[0.24] hover:bg-white/[0.04]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Decorative Icon Circle */}
          <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-white/70 group-hover:text-brand-mint group-hover:border-brand-mint/40 group-hover:scale-105 transition-all">
            {isDragging ? (
              <Upload className="w-5 h-5 text-brand-mint animate-bounce" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white tracking-tight">
              {isDragging ? 'Drop your logo here' : 'Upload your logo'}
            </p>
            <p id="logo-uploader-specs" className="text-xs text-text-muted">
              PNG, JPG, WEBP · Max 5 MB
            </p>
          </div>

          {/* Explicit CTA button inside box */}
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white/[0.08] group-hover:bg-brand-mint group-hover:text-black text-xs font-semibold text-white transition-all shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Choose Image</span>
          </div>
        </div>
      )}

      {/* Accessible Inline Error Message */}
      {activeError && (
        <div
          id="logo-uploader-error"
          role="alert"
          aria-live="polite"
          className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2 transition-all"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span className="flex-1 leading-relaxed">{activeError}</span>
          <button
            type="button"
            onClick={() => setInternalError('')}
            className="p-1 text-red-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
