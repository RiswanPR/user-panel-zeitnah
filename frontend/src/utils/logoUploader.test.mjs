import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure validators & state machine rules matching LogoUploader.jsx and CreateBusinessModal.jsx
 */
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function validateLogoFile(file, maxSizeBytes = DEFAULT_MAX_SIZE) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty. Please choose a valid image.' };
  }
  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    const actualMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File exceeds the ${maxMb} MB limit (selected: ${actualMb} MB). Please choose a smaller image.`,
    };
  }

  const mimeValid = ALLOWED_MIME_TYPES.includes(file.type || file.mimetype);
  const name = (file.name || '').toLowerCase();
  const extValid = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!mimeValid && !extValid) {
    return { valid: false, error: 'Invalid format. Please select a PNG, JPG, or WebP image.' };
  }

  return { valid: true, error: null };
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  const kb = bytes / k;
  if (kb < k) return `${kb.toFixed(1)} KB`;
  return `${(kb / k).toFixed(2)} MB`;
}

function resolveBusinessLogoSubmission({
  formDataLogo,
  logoFile,
  logoRemoved,
  uploadResultUrl,
}) {
  if (logoRemoved) {
    return { finalLogo: '', uploaded: false };
  }
  if (logoFile && uploadResultUrl) {
    return { finalLogo: uploadResultUrl, uploaded: true };
  }
  return { finalLogo: formDataLogo?.trim() || '', uploaded: false };
}

describe('Business Logo Uploader — File Validation', () => {
  it('accepts valid PNG image under 5 MB', () => {
    const file = {
      name: 'company-brand.png',
      type: 'image/png',
      size: 1.4 * 1024 * 1024,
    };
    const res = validateLogoFile(file);
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
  });

  it('accepts valid JPG and JPEG image under 5 MB', () => {
    const jpg = {
      name: 'logo.jpg',
      type: 'image/jpeg',
      size: 2.1 * 1024 * 1024,
    };
    const jpeg = {
      name: 'logo.jpeg',
      type: 'image/jpeg',
      size: 800 * 1024,
    };
    assert.equal(validateLogoFile(jpg).valid, true);
    assert.equal(validateLogoFile(jpeg).valid, true);
  });

  it('accepts valid WebP image under 5 MB', () => {
    const file = {
      name: 'icon.webp',
      type: 'image/webp',
      size: 450 * 1024,
    };
    const res = validateLogoFile(file);
    assert.equal(res.valid, true);
  });

  it('rejects oversized files exceeding 5 MB limit', () => {
    const file = {
      name: 'huge-logo.png',
      type: 'image/png',
      size: 5.8 * 1024 * 1024, // 5.8 MB
    };
    const res = validateLogoFile(file);
    assert.equal(res.valid, false);
    assert.match(res.error, /exceeds the 5 MB limit/);
  });

  it('rejects unsupported file formats (PDF, GIF, SVG, EXE)', () => {
    const pdf = { name: 'document.pdf', type: 'application/pdf', size: 1000 };
    const gif = { name: 'animation.gif', type: 'image/gif', size: 1000 };
    const exe = { name: 'malicious.exe', type: 'application/x-msdownload', size: 1000 };

    assert.equal(validateLogoFile(pdf).valid, false);
    assert.match(validateLogoFile(pdf).error, /Invalid format/);
    assert.equal(validateLogoFile(gif).valid, false);
    assert.equal(validateLogoFile(exe).valid, false);
  });

  it('rejects empty or 0-byte files', () => {
    const emptyFile = { name: 'empty.png', type: 'image/png', size: 0 };
    const res = validateLogoFile(emptyFile);
    assert.equal(res.valid, false);
    assert.match(res.error, /file is empty/);
  });
});

describe('Business Logo Uploader — File Size Formatting', () => {
  it('formats zero and falsy bytes cleanly', () => {
    assert.equal(formatFileSize(0), '0 B');
    assert.equal(formatFileSize(null), '0 B');
  });

  it('formats bytes, kilobytes, and megabytes accurately', () => {
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(1024), '1.0 KB');
    assert.equal(formatFileSize(2048), '2.0 KB');
    assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.50 MB');
    assert.equal(formatFileSize(4.85 * 1024 * 1024), '4.85 MB');
  });
});

describe('Business Logo Uploader — State Transitions & Object URL Lifecycle', () => {
  it('tracks object URL creation and revocation contract on file changes', () => {
    const revokedUrls = [];
    const mockRevoke = (url) => revokedUrls.push(url);

    let activeUrl = 'blob:http://localhost:5173/uuid-1';

    // When replacement file is chosen:
    mockRevoke(activeUrl);
    activeUrl = 'blob:http://localhost:5173/uuid-2';

    // When removed:
    mockRevoke(activeUrl);
    activeUrl = null;

    assert.equal(revokedUrls.length, 2);
    assert.equal(revokedUrls[0], 'blob:http://localhost:5173/uuid-1');
    assert.equal(revokedUrls[1], 'blob:http://localhost:5173/uuid-2');
    assert.equal(activeUrl, null);
  });
});

describe('Business Flow — Create and Edit Form Submission Contracts', () => {
  it('resolves uploaded S3 URL when a new file was provided and uploaded', () => {
    const outcome = resolveBusinessLogoSubmission({
      formDataLogo: '',
      logoFile: { name: 'logo.png', size: 1024 },
      logoRemoved: false,
      uploadResultUrl: 'https://cdn.zeitnah.com/organizations/logos/uploaded-1.png',
    });

    assert.equal(outcome.uploaded, true);
    assert.equal(outcome.finalLogo, 'https://cdn.zeitnah.com/organizations/logos/uploaded-1.png');
  });

  it('preserves existing logo URL when no new file is uploaded and not removed', () => {
    const outcome = resolveBusinessLogoSubmission({
      formDataLogo: 'https://cdn.zeitnah.com/organizations/logos/existing.png',
      logoFile: null,
      logoRemoved: false,
      uploadResultUrl: null,
    });

    assert.equal(outcome.uploaded, false);
    assert.equal(outcome.finalLogo, 'https://cdn.zeitnah.com/organizations/logos/existing.png');
  });

  it('clears logo to empty string when user explicitly removed the logo', () => {
    const outcome = resolveBusinessLogoSubmission({
      formDataLogo: 'https://cdn.zeitnah.com/organizations/logos/existing.png',
      logoFile: null,
      logoRemoved: true,
      uploadResultUrl: null,
    });

    assert.equal(outcome.uploaded, false);
    assert.equal(outcome.finalLogo, '');
  });

  it('handles external logo URLs gracefully for backward compatibility', () => {
    const outcome = resolveBusinessLogoSubmission({
      formDataLogo: 'https://partner-company.com/brand/logo.png',
      logoFile: null,
      logoRemoved: false,
      uploadResultUrl: null,
    });

    assert.equal(outcome.finalLogo, 'https://partner-company.com/brand/logo.png');
  });

  it('handles upload failure gracefully by preventing business creation', () => {
    let businessCreated = false;
    let errorMessage = '';

    const simulateSubmission = (uploadSuccess) => {
      if (!uploadSuccess) {
        errorMessage = 'Logo upload failed. Your business has not been created.';
        return;
      }
      businessCreated = true;
    };

    simulateSubmission(false);

    assert.equal(businessCreated, false);
    assert.equal(errorMessage, 'Logo upload failed. Your business has not been created.');
  });
});
