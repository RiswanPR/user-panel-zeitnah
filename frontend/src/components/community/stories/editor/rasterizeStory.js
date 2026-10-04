/**
 * rasterizeStory.js
 * 
 * Composites base image, filter effects, drawing paths, text overlays, and stickers
 * onto a stable 9:16 canvas and exports as an optimized JPEG Blob/File.
 * Fully memory-safe with automatic canvas cleanup.
 */

const FILTER_STYLES = {
  none: 'none',
  vivid: 'contrast(1.15) saturate(1.3)',
  cinematic: 'contrast(1.1) brightness(0.95) saturate(0.85)',
  warm: 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)',
  noir: 'grayscale(1) contrast(1.2)',
};

/**
 * Loads an image from a URL or Object URL into an HTMLImageElement
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for story rasterization: ' + e));
    img.src = src;
  });
}

/**
 * Renders rounded rectangle on a 2D canvas context
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Rasterizes an edited story into a single composited JPEG File.
 * 
 * @param {Object} params
 * @param {string} params.imageSrc - Object URL or data URL of source image
 * @param {string} [params.filter='none'] - Filter preset ID
 * @param {Array} [params.drawingPaths=[]] - Array of stroke paths with points [{x, y}] (0-1 normalized)
 * @param {Array} [params.textOverlays=[]] - Array of text overlays [{id, text, x, y, color, bgStyle, align, size}]
 * @param {Array} [params.stickers=[]] - Array of stickers [{id, emoji, x, y, scale}]
 * @param {string} [params.fileName='story.jpg'] - Original file name for output File
 * @returns {Promise<File>} Composited image file
 */
export async function rasterizeStoryImage({
  imageSrc,
  filter = 'none',
  drawingPaths = [],
  textOverlays = [],
  stickers = [],
  fileName = 'story.jpg',
}) {
  const img = await loadImage(imageSrc);

  // Standard 9:16 target dimensions (high-definition portrait: 1080 x 1920)
  const targetWidth = 1080;
  const targetHeight = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for rasterization');
  }

  // 1. Fill base dark background
  ctx.fillStyle = '#070B14';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Draw base image with cover-fit aspect ratio
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;

  if (imgAspect > targetAspect) {
    // Image is wider than 9:16 -> crop horizontal sides
    sWidth = img.naturalHeight * targetAspect;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    // Image is taller than 9:16 -> crop top and bottom
    sHeight = img.naturalWidth / targetAspect;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  // Apply visual filter
  const filterStyle = FILTER_STYLES[filter] || 'none';
  if (filterStyle !== 'none' && ctx.filter !== undefined) {
    ctx.filter = filterStyle;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

  // Reset filter for overlays
  if (ctx.filter !== undefined) {
    ctx.filter = 'none';
  }

  // 3. Draw Drawing Strokes
  if (Array.isArray(drawingPaths) && drawingPaths.length > 0) {
    drawingPaths.forEach((path) => {
      if (!path.points || path.points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = path.color || '#00F5A0';
      // Scale stroke width proportionally to 1080 canvas from preview ~360px
      const scaleFactor = targetWidth / 360;
      ctx.lineWidth = (path.width || 4) * scaleFactor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const first = path.points[0];
      ctx.moveTo(first.x * targetWidth, first.y * targetHeight);

      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        ctx.lineTo(pt.x * targetWidth, pt.y * targetHeight);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  // 4. Draw Text Overlays
  if (Array.isArray(textOverlays) && textOverlays.length > 0) {
    const scaleFactor = targetWidth / 360;

    textOverlays.forEach((overlay) => {
      if (!overlay.text || !overlay.text.trim()) return;

      ctx.save();
      const fontSize = Math.round((overlay.size || 22) * scaleFactor);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = overlay.align || 'center';
      ctx.textBaseline = 'middle';

      const lines = overlay.text.split('\n');
      const lineHeight = fontSize * 1.28;
      const totalTextHeight = lines.length * lineHeight;

      const posX = (overlay.x ?? 0.5) * targetWidth;
      const posY = (overlay.y ?? 0.5) * targetHeight;

      // Draw background pill if requested
      if (overlay.bgStyle && overlay.bgStyle !== 'none') {
        let maxLineWidth = 0;
        lines.forEach((l) => {
          const w = ctx.measureText(l).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });

        const paddingX = fontSize * 0.7;
        const paddingY = fontSize * 0.45;
        const boxWidth = maxLineWidth + paddingX * 2;
        const boxHeight = totalTextHeight + paddingY * 2;

        let boxX = posX - boxWidth / 2;
        if (overlay.align === 'left') boxX = posX - paddingX;
        if (overlay.align === 'right') boxX = posX - boxWidth + paddingX;
        const boxY = posY - boxHeight / 2;

        ctx.fillStyle = overlay.bgStyle === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.68)';
        roundRect(ctx, boxX, boxY, boxWidth, boxHeight, fontSize * 0.4);
        ctx.fill();
      }

      // Draw text lines
      ctx.fillStyle = overlay.bgStyle === 'light' ? '#070B14' : (overlay.color || '#FFFFFF');
      if (overlay.bgStyle === 'none') {
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = 8 * scaleFactor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 * scaleFactor;
      }

      const startY = posY - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, posX, startY + idx * lineHeight);
      });

      ctx.restore();
    });
  }

  // 5. Draw Stickers
  if (Array.isArray(stickers) && stickers.length > 0) {
    const scaleFactor = targetWidth / 360;

    stickers.forEach((stk) => {
      if (!stk.emoji) return;

      ctx.save();
      const fontSize = Math.round((stk.scale || 44) * scaleFactor);
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const posX = (stk.x ?? 0.5) * targetWidth;
      const posY = (stk.y ?? 0.5) * targetHeight;

      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 10 * scaleFactor;
      ctx.fillText(stk.emoji, posX, posY);
      ctx.restore();
    });
  }

  // 6. Convert Canvas to JPEG Blob and wrap into File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob from canvas'));
          return;
        }
        const outputFileName = fileName.replace(/\.[^.]+$/, '') + '-edited.jpg';
        const compositedFile = new File([blob], outputFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(compositedFile);
      },
      'image/jpeg',
      0.92
    );
  });
}
