import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { renderStickerPng } from './community-overlay-rasterizer';

export interface StickerItem {
  id: string;
  name: string;
  category: 'ZEITNAH' | 'REACTIONS' | 'CELEBRATION' | 'EMOJI' | 'SHAPES';
  svg: string;
  isActive: boolean;
}

export const CURATED_STICKERS: StickerItem[] = [
  {
    id: 'zn-verified',
    name: 'Verified Badge',
    category: 'ZEITNAH',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#10B981"/><path d="M14 24L21 31L34 17" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'zn-logo',
    name: 'Zeitnah Symbol',
    category: 'ZEITNAH',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#070B14" stroke="#10B981" stroke-width="2"/><path d="M15 15H33L15 33H33" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'fire',
    name: 'Fire',
    category: 'REACTIONS',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4C24 4 14 16 14 28C14 34.627 18.477 40 24 40C29.523 40 34 34.627 34 28C34 16 24 4 24 4Z" fill="#F97316"/><path d="M24 16C24 16 18 24 18 30C18 33.314 20.686 36 24 36C27.314 36 30 33.314 30 30C30 24 24 16 24 16Z" fill="#FACC15"/></svg>`,
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'REACTIONS',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 42L20.8 39.09C10.5 29.74 4 23.84 4 16.5C4 10.5 8.7 6 14.5 6C17.8 6 20.9 7.55 24 10C27.1 7.55 30.2 6 33.5 6C39.3 6 44 10.5 44 16.5C44 23.84 37.5 29.74 27.2 39.09L24 42Z" fill="#EF4444"/></svg>`,
  },
  {
    id: 'star',
    name: 'Gold Star',
    category: 'SHAPES',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4L30.18 16.52L44 18.53L34 28.28L36.36 42.04L24 35.54L11.64 42.04L14 28.28L4 18.53L17.82 16.52L24 4Z" fill="#F59E0B"/></svg>`,
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    category: 'CELEBRATION',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6L27 18L39 21L27 24L24 36L21 24L9 21L21 18L24 6Z" fill="#10B981"/><path d="M37 29L38.5 35L44.5 36.5L38.5 38L37 44L35.5 38L29.5 36.5L35.5 35L37 29Z" fill="#FBBF24"/></svg>`,
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    category: 'REACTIONS',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#0EA5E9"/><path d="M16 22V36M16 26H28C30.2 26 32 24.2 32 22C32 20.8 31 18 29 18H24L25.5 12C25.8 10.9 25 10 24 10C23 10 22 11 21.5 12L16 22Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'CELEBRATION',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8H34V20C34 25.52 29.52 30 24 30C18.48 30 14 25.52 14 20V8Z" fill="#F59E0B"/><path d="M20 30V38H28V30M16 42H32M14 12H8C6.9 12 6 12.9 6 14C6 17.5 9 20 14 20M34 12H40C41.1 12 42 12.9 42 14C42 17.5 39 20 34 20" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'party',
    name: 'Party Popper',
    category: 'CELEBRATION',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 40L16 20L28 32L8 40Z" fill="#8B5CF6"/><circle cx="28" cy="14" r="3" fill="#EF4444"/><circle cx="36" cy="22" r="3" fill="#10B981"/><circle cx="34" cy="10" r="2.5" fill="#F59E0B"/><circle cx="42" cy="16" r="2.5" fill="#3B82F6"/></svg>`,
  },
  {
    id: 'rocket',
    name: 'Rocket',
    category: 'REACTIONS',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 6C30 6 36 12 36 22L26 32C16 32 10 26 10 26L16 20L18 22L24 16L22 14L30 6Z" fill="#0EA5E9"/><path d="M12 36L8 40M16 38L12 42M20 34L18 42" stroke="#F97316" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'bulb',
    name: 'Idea Lightbulb',
    category: 'EMOJI',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="20" r="14" fill="#FBBF24"/><path d="M18 34H30M20 38H28M22 42H26" stroke="#D97706" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'check',
    name: 'Check Circle',
    category: 'SHAPES',
    isActive: true,
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#10B981"/><path d="M16 24L22 30L32 18" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
];

@Injectable()
export class CommunityStickerService {
  private readonly stickerCacheDir: string;

  constructor() {
    this.stickerCacheDir = path.join(os.tmpdir(), 'zeitnah-stickers');
    try {
      fs.mkdirSync(this.stickerCacheDir, { recursive: true });
    } catch {}
  }

  /**
   * Retrieves active curated stickers with optional category filtering and cursor pagination.
   */
  getStickerCatalog(
    options: { category?: string; limit?: number; cursor?: string } = {},
  ) {
    const limit = Math.max(1, Math.min(Number(options.limit) || 20, 50));
    let items = CURATED_STICKERS.filter((s) => s.isActive);

    if (options.category && options.category !== 'ALL') {
      items = items.filter(
        (s) => s.category.toUpperCase() === options.category.toUpperCase(),
      );
    }

    let startIndex = 0;
    if (options.cursor) {
      const idx = items.findIndex((s) => s.id === options.cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const paginated = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    const nextCursor =
      hasMore && paginated.length > 0
        ? paginated[paginated.length - 1].id
        : null;

    return {
      items: paginated,
      categories: [
        'ALL',
        'ZEITNAH',
        'REACTIONS',
        'CELEBRATION',
        'EMOJI',
        'SHAPES',
      ],
      total: items.length,
      nextCursor,
    };
  }

  /**
   * Finds a sticker by ID.
   */
  getStickerById(id: string): StickerItem | null {
    if (!id) return null;
    return CURATED_STICKERS.find((s) => s.id === id && s.isActive) || null;
  }

  /**
   * Validates if a sticker ID exists and is active.
   */
  isValidStickerId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Strictly reject paths, traversal, URLs, and data URLs
    if (/[\/\\]|\.\.|^https?:|^data:/i.test(id)) return false;
    return Boolean(this.getStickerById(id));
  }

  /**
   * Resolves or renders a sticker PNG file to a deterministic local path.
   */
  resolveStickerAsset(
    stickerId: string,
    outputDir?: string,
  ): { filePath: string; width: number; height: number } {
    if (!this.isValidStickerId(stickerId)) {
      throw new NotFoundException(
        `Sticker ${stickerId} does not exist or is inactive.`,
      );
    }
    const sticker = this.getStickerById(stickerId);
    if (!sticker) {
      throw new NotFoundException(
        `Sticker ${stickerId} does not exist or is inactive.`,
      );
    }

    const targetDir = outputDir || this.stickerCacheDir;
    fs.mkdirSync(targetDir, { recursive: true });
    const targetFilePath = path.join(targetDir, `sticker_${sticker.id}.png`);

    if (
      !fs.existsSync(targetFilePath) ||
      fs.statSync(targetFilePath).size === 0
    ) {
      renderStickerPng(sticker.id, targetFilePath, 140);
    }

    return { filePath: targetFilePath, width: 140, height: 140 };
  }
}
