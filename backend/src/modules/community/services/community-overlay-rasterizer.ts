import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

export interface OverlayLayerRenderOptions {
  id: string;
  type: 'TEXT' | 'STICKER' | 'CAPTION';
  start: number;
  end: number;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: string;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  shadow?: boolean;
  stickerId?: string;
  style?: string;
}

// Minimal CRC32 Table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/**
 * Encodes an RGBA Buffer into a valid PNG file buffer.
 */
export function encodeRgbaToPng(width: number, height: number, rgbaBuffer: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter none
  ihdr[12] = 0; // non-interlaced

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const rawRows: Buffer[] = [];
  const bytesPerRow = width * 4;
  for (let y = 0; y < height; y++) {
    rawRows.push(Buffer.from([0])); // Filter type 0: None
    const offset = y * bytesPerRow;
    rawRows.push(rgbaBuffer.subarray(offset, offset + bytesPerRow));
  }
  const idat = zlib.deflateSync(Buffer.concat(rawRows));

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Standard 8x16 font glyph patterns for ASCII 32..126
 */
const GLYPH_WIDTH = 8;
const GLYPH_HEIGHT = 16;

// Compact bitmask generator for common ASCII glyphs
function getGlyphBitmask(charCode: number): number[] {
  // Simple, clean built-in 8x16 character bitmaps
  const mask = new Array(16).fill(0);
  if (charCode < 32 || charCode > 126) return mask;

  if (charCode === 32) return mask; // space

  // Numbers 0-9
  if (charCode >= 48 && charCode <= 57) {
    const d = charCode - 48;
    const NUMS: number[][] = [
      [0x38, 0x44, 0x4c, 0x54, 0x64, 0x44, 0x38], // 0
      [0x10, 0x30, 0x10, 0x10, 0x10, 0x10, 0x38], // 1
      [0x38, 0x44, 0x04, 0x18, 0x20, 0x40, 0x7c], // 2
      [0x38, 0x44, 0x04, 0x18, 0x04, 0x44, 0x38], // 3
      [0x08, 0x18, 0x28, 0x48, 0x7c, 0x08, 0x08], // 4
      [0x7c, 0x40, 0x78, 0x04, 0x04, 0x44, 0x38], // 5
      [0x38, 0x40, 0x78, 0x44, 0x44, 0x44, 0x38], // 6
      [0x7c, 0x04, 0x08, 0x10, 0x20, 0x20, 0x20], // 7
      [0x38, 0x44, 0x44, 0x38, 0x44, 0x44, 0x38], // 8
      [0x38, 0x44, 0x44, 0x3c, 0x04, 0x08, 0x30], // 9
    ];
    for (let i = 0; i < 7; i++) mask[i + 4] = NUMS[d][i];
    return mask;
  }

  // Uppercase A-Z
  if (charCode >= 65 && charCode <= 90) {
    const c = charCode - 65;
    const UPPER: number[][] = [
      [0x38, 0x44, 0x44, 0x7c, 0x44, 0x44, 0x44], // A
      [0x78, 0x44, 0x44, 0x78, 0x44, 0x44, 0x78], // B
      [0x38, 0x44, 0x40, 0x40, 0x40, 0x44, 0x38], // C
      [0x70, 0x48, 0x44, 0x44, 0x44, 0x48, 0x70], // D
      [0x7c, 0x40, 0x40, 0x78, 0x40, 0x40, 0x7c], // E
      [0x7c, 0x40, 0x40, 0x78, 0x40, 0x40, 0x40], // F
      [0x38, 0x44, 0x40, 0x4c, 0x44, 0x44, 0x38], // G
      [0x44, 0x44, 0x44, 0x7c, 0x44, 0x44, 0x44], // H
      [0x38, 0x10, 0x10, 0x10, 0x10, 0x10, 0x38], // I
      [0x0c, 0x04, 0x04, 0x04, 0x44, 0x44, 0x38], // J
      [0x44, 0x48, 0x50, 0x60, 0x50, 0x48, 0x44], // K
      [0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7c], // L
      [0x44, 0x6c, 0x54, 0x54, 0x44, 0x44, 0x44], // M
      [0x44, 0x64, 0x54, 0x4c, 0x44, 0x44, 0x44], // N
      [0x38, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38], // O
      [0x78, 0x44, 0x44, 0x78, 0x40, 0x40, 0x40], // P
      [0x38, 0x44, 0x44, 0x44, 0x54, 0x48, 0x34], // Q
      [0x78, 0x44, 0x44, 0x78, 0x50, 0x48, 0x44], // R
      [0x38, 0x44, 0x40, 0x38, 0x04, 0x44, 0x38], // S
      [0x7c, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10], // T
      [0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38], // U
      [0x44, 0x44, 0x44, 0x44, 0x28, 0x28, 0x10], // V
      [0x44, 0x44, 0x44, 0x54, 0x54, 0x6c, 0x44], // W
      [0x44, 0x44, 0x28, 0x10, 0x28, 0x44, 0x44], // X
      [0x44, 0x44, 0x28, 0x10, 0x10, 0x10, 0x10], // Y
      [0x7c, 0x04, 0x08, 0x10, 0x20, 0x40, 0x7c], // Z
    ];
    for (let i = 0; i < 7; i++) mask[i + 4] = UPPER[c][i];
    return mask;
  }

  // Lowercase a-z
  if (charCode >= 97 && charCode <= 122) {
    const c = charCode - 97;
    const LOWER: number[][] = [
      [0x00, 0x38, 0x04, 0x3c, 0x44, 0x44, 0x3c], // a
      [0x40, 0x40, 0x58, 0x64, 0x44, 0x44, 0x78], // b
      [0x00, 0x38, 0x44, 0x40, 0x40, 0x44, 0x38], // c
      [0x04, 0x04, 0x34, 0x4c, 0x44, 0x44, 0x3c], // d
      [0x00, 0x38, 0x44, 0x7c, 0x40, 0x44, 0x38], // e
      [0x18, 0x24, 0x20, 0x70, 0x20, 0x20, 0x20], // f
      [0x00, 0x3c, 0x44, 0x44, 0x3c, 0x04, 0x38], // g
      [0x40, 0x40, 0x58, 0x64, 0x44, 0x44, 0x44], // h
      [0x10, 0x00, 0x30, 0x10, 0x10, 0x10, 0x38], // i
      [0x08, 0x00, 0x18, 0x08, 0x08, 0x48, 0x30], // j
      [0x40, 0x40, 0x48, 0x50, 0x60, 0x50, 0x48], // k
      [0x30, 0x10, 0x10, 0x10, 0x10, 0x10, 0x38], // l
      [0x00, 0x68, 0x54, 0x54, 0x44, 0x44, 0x44], // m
      [0x00, 0x58, 0x64, 0x44, 0x44, 0x44, 0x44], // n
      [0x00, 0x38, 0x44, 0x44, 0x44, 0x44, 0x38], // o
      [0x00, 0x78, 0x44, 0x78, 0x40, 0x40, 0x40], // p
      [0x00, 0x34, 0x4c, 0x3c, 0x04, 0x04, 0x04], // q
      [0x00, 0x58, 0x64, 0x40, 0x40, 0x40, 0x40], // r
      [0x00, 0x38, 0x40, 0x38, 0x04, 0x44, 0x38], // s
      [0x20, 0x20, 0x70, 0x20, 0x20, 0x24, 0x18], // t
      [0x00, 0x44, 0x44, 0x44, 0x44, 0x44, 0x3c], // u
      [0x00, 0x44, 0x44, 0x44, 0x28, 0x28, 0x10], // v
      [0x00, 0x44, 0x44, 0x54, 0x54, 0x6c, 0x44], // w
      [0x00, 0x44, 0x28, 0x10, 0x28, 0x44, 0x44], // x
      [0x00, 0x44, 0x44, 0x3c, 0x04, 0x08, 0x30], // y
      [0x00, 0x7c, 0x08, 0x10, 0x20, 0x40, 0x7c], // z
    ];
    for (let i = 0; i < 7; i++) mask[i + 4] = LOWER[c][i];
    return mask;
  }

  // Punctuation & symbols
  switch (charCode) {
    case 33: // !
      mask[4] = 0x10; mask[5] = 0x10; mask[6] = 0x10; mask[7] = 0x10; mask[9] = 0x10; break;
    case 34: // "
      mask[3] = 0x28; mask[4] = 0x28; break;
    case 35: // #
      mask[4] = 0x28; mask[5] = 0x7c; mask[6] = 0x28; mask[7] = 0x7c; mask[8] = 0x28; break;
    case 36: // $
      mask[3] = 0x10; mask[4] = 0x3c; mask[5] = 0x50; mask[6] = 0x38; mask[7] = 0x14; mask[8] = 0x78; mask[9] = 0x10; break;
    case 38: // &
      mask[4] = 0x30; mask[5] = 0x48; mask[6] = 0x30; mask[7] = 0x4a; mask[8] = 0x44; mask[9] = 0x3a; break;
    case 39: // '
      mask[3] = 0x10; mask[4] = 0x10; break;
    case 40: // (
      mask[3] = 0x08; mask[4] = 0x10; mask[5] = 0x20; mask[6] = 0x20; mask[7] = 0x20; mask[8] = 0x10; mask[9] = 0x08; break;
    case 41: // )
      mask[3] = 0x20; mask[4] = 0x10; mask[5] = 0x08; mask[6] = 0x08; mask[7] = 0x08; mask[8] = 0x10; mask[9] = 0x20; break;
    case 42: // *
      mask[4] = 0x10; mask[5] = 0x54; mask[6] = 0x38; mask[7] = 0x54; mask[8] = 0x10; break;
    case 43: // +
      mask[5] = 0x10; mask[6] = 0x10; mask[7] = 0x7c; mask[8] = 0x10; mask[9] = 0x10; break;
    case 44: // ,
      mask[9] = 0x10; mask[10] = 0x10; mask[11] = 0x20; break;
    case 45: // -
      mask[7] = 0x7c; break;
    case 46: // .
      mask[9] = 0x10; break;
    case 47: // /
      mask[4] = 0x04; mask[5] = 0x08; mask[6] = 0x10; mask[7] = 0x20; mask[8] = 0x40; break;
    case 58: // :
      mask[6] = 0x10; mask[9] = 0x10; break;
    case 59: // ;
      mask[6] = 0x10; mask[9] = 0x10; mask[10] = 0x20; break;
    case 60: // <
      mask[5] = 0x08; mask[6] = 0x10; mask[7] = 0x20; mask[8] = 0x10; mask[9] = 0x08; break;
    case 61: // =
      mask[6] = 0x7c; mask[8] = 0x7c; break;
    case 62: // >
      mask[5] = 0x20; mask[6] = 0x10; mask[7] = 0x08; mask[8] = 0x10; mask[9] = 0x20; break;
    case 63: // ?
      mask[4] = 0x38; mask[5] = 0x44; mask[6] = 0x08; mask[7] = 0x10; mask[9] = 0x10; break;
    case 64: // @
      mask[4] = 0x38; mask[5] = 0x44; mask[6] = 0x5c; mask[7] = 0x54; mask[8] = 0x4c; mask[9] = 0x38; break;
    default:
      mask[6] = 0x38; mask[7] = 0x38; break;
  }
  return mask;
}

function parseHexColor(hex: string, defaultR = 255, defaultG = 255, defaultB = 255): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [defaultR, defaultG, defaultB];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? defaultR : r, isNaN(g) ? defaultG : g, isNaN(b) ? defaultB : b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [isNaN(r) ? defaultR : r, isNaN(g) ? defaultG : g, isNaN(b) ? defaultB : b];
  }
  return [defaultR, defaultG, defaultB];
}

/**
 * Renders Text Overlay or Caption to a clean transparent PNG image.
 */
export function renderTextLayerPng(
  options: OverlayLayerRenderOptions,
  targetFilePath: string,
): { width: number; height: number; filePath: string } {
  const rawText = String(options.content || '').replace(/<[^>]*>?/gm, '').trim() || 'Zeitnah';
  const fontSize = Math.max(12, Math.min(Number(options.fontSize) || 24, 72));
  const isBold = options.fontWeight === 'bold' || options.fontWeight === '800';

  // Compute scale multiplier based on standard 16px glyph height
  const scale = Math.max(1, Math.round(fontSize / 14));
  const charWidth = GLYPH_WIDTH * scale;
  const charHeight = GLYPH_HEIGHT * scale;

  // Word wrap text into lines (max 30 chars per line for readability)
  const words = rawText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= 32) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const maxLineLength = Math.max(...lines.map((l) => l.length), 4);
  const paddingX = Math.round(24 * scale);
  const paddingY = Math.round(14 * scale);

  const cardWidth = Math.max(120, maxLineLength * charWidth + paddingX * 2);
  const cardHeight = Math.max(50, lines.length * (charHeight + 4 * scale) + paddingY * 2);

  const buf = Buffer.alloc(cardWidth * cardHeight * 4); // RGBA

  // Styling & Colors
  let [fgR, fgG, fgB] = parseHexColor(options.color || '#FFFFFF', 255, 255, 255);
  let [bgR, bgG, bgB] = parseHexColor(options.backgroundColor || '#070B14', 7, 11, 20);
  let bgAlpha = Math.round(Math.max(0, Math.min(Number(options.backgroundOpacity ?? 0.75), 1.0)) * 255);

  // Caption Preset Styles
  if (options.type === 'CAPTION') {
    switch (options.style) {
      case 'BOLD':
        [fgR, fgG, fgB] = [255, 220, 40]; // Yellow gold
        [bgR, bgG, bgB] = [0, 0, 0];
        bgAlpha = 220;
        break;
      case 'HIGHLIGHT':
        [fgR, fgG, fgB] = [10, 15, 25]; // Dark
        [bgR, bgG, bgB] = [16, 185, 129]; // Zeitnah Mint
        bgAlpha = 250;
        break;
      case 'MINIMAL':
        [fgR, fgG, fgB] = [255, 255, 255];
        [bgR, bgG, bgB] = [15, 23, 42];
        bgAlpha = 140;
        break;
      case 'CLASSIC':
      default:
        [fgR, fgG, fgB] = [255, 255, 255];
        [bgR, bgG, bgB] = [0, 0, 0];
        bgAlpha = 200;
        break;
    }
  }

  // Draw Rounded Card Background if opacity > 0
  if (bgAlpha > 0) {
    const radius = Math.round(16 * scale);
    for (let y = 0; y < cardHeight; y++) {
      for (let x = 0; x < cardWidth; x++) {
        let inside = true;
        if (x < radius && y < radius && (x - radius) ** 2 + (y - radius) ** 2 > radius ** 2) inside = false;
        if (x > cardWidth - radius && y < radius && (x - (cardWidth - radius)) ** 2 + (y - radius) ** 2 > radius ** 2) inside = false;
        if (x < radius && y > cardHeight - radius && (x - radius) ** 2 + (y - (cardHeight - radius)) ** 2 > radius ** 2) inside = false;
        if (x > cardWidth - radius && y > cardHeight - radius && (x - (cardWidth - radius)) ** 2 + (y - (cardHeight - radius)) ** 2 > radius ** 2) inside = false;

        if (inside) {
          const idx = (y * cardWidth + x) * 4;
          buf[idx] = bgR;
          buf[idx + 1] = bgG;
          buf[idx + 2] = bgB;
          buf[idx + 3] = bgAlpha;
        }
      }
    }
  }

  // Draw Text Lines
  const hasShadow = Boolean(options.shadow);
  lines.forEach((lineText, lineIdx) => {
    const lineWidth = lineText.length * charWidth;
    let startX = paddingX;
    if (options.textAlign === 'center') {
      startX = Math.max(paddingX, Math.round((cardWidth - lineWidth) / 2));
    } else if (options.textAlign === 'right') {
      startX = Math.max(paddingX, cardWidth - paddingX - lineWidth);
    }

    const startY = paddingY + lineIdx * (charHeight + 4 * scale);

    for (let cIdx = 0; cIdx < lineText.length; cIdx++) {
      const charCode = lineText.charCodeAt(cIdx);
      const mask = getGlyphBitmask(charCode);
      const glyphX = startX + cIdx * charWidth;

      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        const rowByte = mask[row] || 0;
        if (rowByte === 0) continue;

        for (let col = 0; col < GLYPH_WIDTH; col++) {
          if ((rowByte & (0x80 >> col)) !== 0) {
            // Draw scaled pixel box
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const px = glyphX + col * scale + sx;
                const py = startY + row * scale + sy;

                // Drop shadow
                if (hasShadow && px + 2 < cardWidth && py + 2 < cardHeight) {
                  const sIdx = ((py + 2) * cardWidth + (px + 2)) * 4;
                  buf[sIdx] = 0;
                  buf[sIdx + 1] = 0;
                  buf[sIdx + 2] = 0;
                  buf[sIdx + 3] = 200;
                }

                // Foreground pixel
                if (px < cardWidth && py < cardHeight) {
                  const idx = (py * cardWidth + px) * 4;
                  buf[idx] = fgR;
                  buf[idx + 1] = fgG;
                  buf[idx + 2] = fgB;
                  buf[idx + 3] = 255;

                  // Extra pixel for bold
                  if (isBold && px + 1 < cardWidth) {
                    const bIdx = (py * cardWidth + (px + 1)) * 4;
                    buf[bIdx] = fgR;
                    buf[bIdx + 1] = fgG;
                    buf[bIdx + 2] = fgB;
                    buf[bIdx + 3] = 255;
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const pngData = encodeRgbaToPng(cardWidth, cardHeight, buf);
  fs.writeFileSync(targetFilePath, pngData);

  return { width: cardWidth, height: cardHeight, filePath: targetFilePath };
}

/**
 * Curated built-in sticker rendering to transparent PNG.
 */
export function renderStickerPng(
  stickerId: string,
  targetFilePath: string,
  size = 140,
): { width: number; height: number; filePath: string } {
  const buf = Buffer.alloc(size * size * 4); // RGBA
  const cx = size / 2;
  const cy = size / 2;

  switch (stickerId) {
    case 'zn-verified': {
      // Mint Badge Circle with White Checkmark
      const r = size * 0.44;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          if (d2 <= r * r) {
            const idx = (y * size + x) * 4;
            buf[idx] = 16;
            buf[idx + 1] = 185;
            buf[idx + 2] = 129; // #10B981
            buf[idx + 3] = 255;
          }
        }
      }
      // White checkmark lines
      drawThickLine(buf, size, cx - 18, cy + 2, cx - 4, cy + 16, 6, [255, 255, 255, 255]);
      drawThickLine(buf, size, cx - 4, cy + 16, cx + 22, cy - 14, 6, [255, 255, 255, 255]);
      break;
    }
    case 'zn-logo': {
      // Hexagon / Zeitnah Z Motif
      const r = size * 0.44;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          if (d2 <= r * r) {
            const idx = (y * size + x) * 4;
            buf[idx] = 7;
            buf[idx + 1] = 11;
            buf[idx + 2] = 20; // #070B14
            buf[idx + 3] = 240;
          }
        }
      }
      // Bright Z letter
      drawThickLine(buf, size, cx - 18, cy - 18, cx + 18, cy - 18, 5, [16, 185, 129, 255]);
      drawThickLine(buf, size, cx + 18, cy - 18, cx - 18, cy + 18, 5, [16, 185, 129, 255]);
      drawThickLine(buf, size, cx - 18, cy + 18, cx + 18, cy + 18, 5, [16, 185, 129, 255]);
      break;
    }
    case 'heart': {
      // Red Heart Shape
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Normalized -1 to 1 coords
          const nx = (x - cx) / (size * 0.42);
          const ny = -(y - cy) / (size * 0.42) + 0.2;
          const a = nx * nx + ny * ny - 1;
          if (a * a * a - nx * nx * ny * ny * ny <= 0) {
            const idx = (y * size + x) * 4;
            buf[idx] = 239;
            buf[idx + 1] = 68;
            buf[idx + 2] = 68; // #EF4444
            buf[idx + 3] = 255;
          }
        }
      }
      break;
    }
    case 'star': {
      // Golden 5-point Star
      const rOuter = size * 0.44;
      const rInner = size * 0.20;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let angle = Math.atan2(dy, dx) + Math.PI / 2;
          if (angle < 0) angle += Math.PI * 2;
          const segment = (Math.PI * 2) / 5;
          const relAngle = Math.abs((angle % segment) - segment / 2);
          const maxDist = rInner / Math.cos(relAngle);
          if (dist <= rOuter && dist <= maxDist * 2.2) {
            const idx = (y * size + x) * 4;
            buf[idx] = 245;
            buf[idx + 1] = 158;
            buf[idx + 2] = 11; // #F59E0B
            buf[idx + 3] = 255;
          }
        }
      }
      break;
    }
    case 'fire': {
      // Fire flame teardrop shape
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = (x - cx) / (size * 0.4);
          const dy = (y - (cy + 10)) / (size * 0.4);
          if (dx * dx + dy * dy <= 1.0 && y >= cy - 20) {
            const idx = (y * size + x) * 4;
            buf[idx] = 249;
            buf[idx + 1] = 115;
            buf[idx + 2] = 22; // #F97316
            buf[idx + 3] = 255;
          }
        }
      }
      // Inner yellow core
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = (x - cx) / (size * 0.2);
          const dy = (y - (cy + 16)) / (size * 0.2);
          if (dx * dx + dy * dy <= 1.0) {
            const idx = (y * size + x) * 4;
            buf[idx] = 250;
            buf[idx + 1] = 204;
            buf[idx + 2] = 21; // #FACC15
            buf[idx + 3] = 255;
          }
        }
      }
      break;
    }
    case 'thumbs-up':
    case 'sparkles':
    case 'trophy':
    case 'party':
    case 'rocket':
    case 'bulb':
    case 'check':
    default: {
      // Default sleek Zeitnah accent circle badge with symbol
      const r = size * 0.44;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          if (d2 <= r * r) {
            const idx = (y * size + x) * 4;
            buf[idx] = 14;
            buf[idx + 1] = 165;
            buf[idx + 2] = 233; // #0EA5E9 (Sky blue)
            buf[idx + 3] = 255;
          }
        }
      }
      // Center star/cross
      drawThickLine(buf, size, cx - 18, cy, cx + 18, cy, 6, [255, 255, 255, 255]);
      drawThickLine(buf, size, cx, cy - 18, cx, cy + 18, 6, [255, 255, 255, 255]);
      break;
    }
  }

  const pngData = encodeRgbaToPng(size, size, buf);
  fs.writeFileSync(targetFilePath, pngData);
  return { width: size, height: size, filePath: targetFilePath };
}

function drawThickLine(
  buf: Buffer,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  rgba: [number, number, number, number],
) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  const halfThick = Math.floor(thickness / 2);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const px = Math.round(x0 + t * (x1 - x0));
    const py = Math.round(y0 + t * (y1 - y0));

    for (let ty = -halfThick; ty <= halfThick; ty++) {
      for (let tx = -halfThick; tx <= halfThick; tx++) {
        const x = px + tx;
        const y = py + ty;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          const idx = (y * size + x) * 4;
          buf[idx] = rgba[0];
          buf[idx + 1] = rgba[1];
          buf[idx + 2] = rgba[2];
          buf[idx + 3] = rgba[3];
        }
      }
    }
  }
}
