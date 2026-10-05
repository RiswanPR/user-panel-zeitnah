import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityMusic,
  CommunityMusicDocument,
} from '../schemas/music.schema';
import { ReelAudioConfig } from '../schemas/post.schema';

export interface MusicListQuery {
  category?: string;
  mood?: string;
  limit?: number;
  cursor?: string;
  skip?: number;
}

export interface MusicSearchQuery {
  q?: string;
  category?: string;
  mood?: string;
  limit?: number;
}

@Injectable()
export class CommunityMusicService implements OnModuleInit {
  private readonly logger = new Logger(CommunityMusicService.name);

  constructor(
    @InjectModel(CommunityMusic.name)
    private readonly musicModel: Model<CommunityMusicDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCatalogIfEmpty();
  }

  /**
   * Safe regex sanitizer to prevent ReDoS when searching user input.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Retrieves active music catalog tracks with pagination and category filtering.
   */
  async getCatalog(query: MusicListQuery): Promise<{
    items: CommunityMusicDocument[];
    total: number;
    nextCursor: string | null;
  }> {
    const limit = Math.max(1, Math.min(Number(query.limit) || 20, 50));
    const filter: Record<string, any> = { isActive: true };

    if (query.category && query.category.trim() && query.category !== 'ALL') {
      filter.category = query.category.trim().toUpperCase();
    }

    if (query.mood && query.mood.trim()) {
      filter.mood = { $regex: new RegExp(`^${this.escapeRegex(query.mood.trim())}$`, 'i') };
    }

    if (query.cursor) {
      filter.createdAt = { $lt: new Date(query.cursor) };
    }

    const skip = !query.cursor && query.skip ? Math.max(0, Number(query.skip)) : 0;

    const [items, total] = await Promise.all([
      this.musicModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1)
        .exec(),
      this.musicModel.countDocuments(filter).exec(),
    ]);

    const hasNext = items.length > limit;
    const paginatedItems = hasNext ? items.slice(0, limit) : items;
    const nextCursor =
      hasNext && paginatedItems.length > 0
        ? (paginatedItems[paginatedItems.length - 1] as any).createdAt?.toISOString() || null
        : null;

    return {
      items: paginatedItems,
      total,
      nextCursor,
    };
  }

  /**
   * Searches the active music library by title, artist, tags, and category.
   */
  async searchMusic(query: MusicSearchQuery): Promise<{
    items: CommunityMusicDocument[];
    total: number;
  }> {
    const limit = Math.max(1, Math.min(Number(query.limit) || 20, 50));
    const filter: Record<string, any> = { isActive: true };

    if (query.category && query.category.trim() && query.category !== 'ALL') {
      filter.category = query.category.trim().toUpperCase();
    }

    if (query.mood && query.mood.trim()) {
      filter.mood = { $regex: new RegExp(`^${this.escapeRegex(query.mood.trim())}$`, 'i') };
    }

    const q = (query.q || '').trim();
    if (q) {
      const sanitized = this.escapeRegex(q);
      const regex = new RegExp(sanitized, 'i');
      filter.$or = [
        { title: { $regex: regex } },
        { artist: { $regex: regex } },
        { tags: { $in: [regex] } },
        { album: { $regex: regex } },
      ];
    }

    const items = await this.musicModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return {
      items,
      total: items.length,
    };
  }

  /**
   * Retrieves a single active music track by ID.
   */
  async getTrackById(id: string): Promise<CommunityMusicDocument> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Valid music track ID is required');
    }

    const track = await this.musicModel.findById(id).exec();
    if (!track || !track.isActive) {
      throw new NotFoundException(`Music track with ID ${id} not found or inactive`);
    }

    return track;
  }

  /**
   * Authoritative server-side validation and canonical resolution for Reel Audio Config (Section 24).
   * Verifies track existence, active status, valid timing ranges, and volume bounds.
   * Resolves canonical metadata directly from the database (never trusts client strings).
   */
  async validateAndResolveAudioConfig(
    rawConfig?: Partial<ReelAudioConfig> | null,
    creatorHandle?: string,
  ): Promise<ReelAudioConfig | undefined> {
    if (!rawConfig) {
      return undefined;
    }

    const audioMode = rawConfig.audioMode || 'ORIGINAL_ONLY';
    const validModes = ['ORIGINAL_ONLY', 'MUSIC_ONLY', 'MIXED'];
    if (!validModes.includes(audioMode)) {
      throw new BadRequestException({
        code: 'INVALID_AUDIO_MODE',
        message: `Invalid audioMode '${audioMode}'. Must be one of: ${validModes.join(', ')}`,
      });
    }

    // Validate volume parameters
    let originalVolume = Number(rawConfig.originalVolume ?? 1.0);
    let musicVolume = Number(rawConfig.musicVolume ?? 1.0);

    if (isNaN(originalVolume) || originalVolume < 0 || originalVolume > 1) {
      throw new BadRequestException({
        code: 'INVALID_ORIGINAL_VOLUME',
        message: 'originalVolume must be a number between 0.0 and 1.0',
      });
    }

    if (isNaN(musicVolume) || musicVolume < 0 || musicVolume > 1) {
      throw new BadRequestException({
        code: 'INVALID_MUSIC_VOLUME',
        message: 'musicVolume must be a number between 0.0 and 1.0',
      });
    }

    const defaultAudioName = creatorHandle
      ? `Original audio · @${creatorHandle.replace(/^@/, '')}`
      : 'Original audio';

    // 1. ORIGINAL_ONLY Mode
    if (audioMode === 'ORIGINAL_ONLY') {
      return {
        audioMode: 'ORIGINAL_ONLY',
        sourceType: 'ORIGINAL',
        originalVolume,
        musicVolume: 0,
        originalAudioName: defaultAudioName,
      };
    }

    // 2. MUSIC_ONLY or MIXED Mode requires valid music track
    if (!rawConfig.musicId || typeof rawConfig.musicId !== 'string') {
      throw new BadRequestException({
        code: 'MISSING_MUSIC_ID',
        message: `musicId is required when audioMode is '${audioMode}'`,
      });
    }

    const track = await this.getTrackById(rawConfig.musicId);

    // Validate trim range boundaries
    let sourceStart = Number(rawConfig.sourceStart ?? 0);
    if (isNaN(sourceStart) || sourceStart < 0) {
      sourceStart = 0;
    }

    let sourceEnd =
      rawConfig.sourceEnd !== undefined &&
      rawConfig.sourceEnd !== null &&
      !isNaN(Number(rawConfig.sourceEnd))
        ? Number(rawConfig.sourceEnd)
        : Math.min(track.duration, 90);

    if (sourceEnd > track.duration) {
      sourceEnd = track.duration;
    }

    if (sourceEnd <= sourceStart) {
      throw new BadRequestException({
        code: 'INVALID_AUDIO_RANGE',
        message: `sourceEnd (${sourceEnd.toFixed(2)}s) must be greater than sourceStart (${sourceStart.toFixed(2)}s)`,
      });
    }

    // Return authoritative resolved canonical config
    return {
      audioMode,
      sourceType: 'MUSIC',
      musicId: track._id,
      musicTitle: track.title,
      musicArtist: track.artist,
      musicCoverUrl: track.coverUrl,
      sourceStart,
      sourceEnd,
      originalVolume: audioMode === 'MUSIC_ONLY' ? 0 : originalVolume,
      musicVolume,
      originalAudioName: defaultAudioName,
      attributionText: track.attributionRequired
        ? track.attributionText || `${track.title} by ${track.artist}`
        : undefined,
    };
  }

  /**
   * Seeds deterministic royalty-free test foundation tracks if the collection is empty.
   * Clearly marked as royalty-free foundation assets.
   */
  async seedDefaultCatalogIfEmpty(): Promise<void> {
    try {
      const count = await this.musicModel.countDocuments().exec();
      if (count > 0) return;

      this.logger.log('Seeding initial Community Music foundation catalog (Royalty-Free / Test Audio)...');

      const seedTracks: Partial<CommunityMusic>[] = [
        {
          _id: 'track-zeitnah-uplift-01',
          title: 'Zeitnah Momentum',
          artist: 'Zeitnah Studio',
          album: 'Creator Foundations Vol. 1',
          duration: 60,
          category: 'UPBEAT',
          mood: 'Energetic',
          tags: ['tech', 'modern', 'engineering', 'upbeat'],
          audioKey: 'community/music/track-zeitnah-uplift-01/audio.mp3',
          audioUrl: 'https://cdn.zeitnah.app/music/zeitnah-momentum.mp3',
          coverUrl: 'https://cdn.zeitnah.app/music/covers/momentum.jpg',
          licenseType: 'ROYALTY_FREE',
          attributionRequired: false,
          isActive: true,
        },
        {
          _id: 'track-zeitnah-chill-02',
          title: 'Deep Architecture',
          artist: 'Zeitnah Sound Lab',
          album: 'Creator Foundations Vol. 1',
          duration: 90,
          category: 'CHILL',
          mood: 'Relaxed',
          tags: ['ambient', 'minimal', 'focus', 'chill'],
          audioKey: 'community/music/track-zeitnah-chill-02/audio.mp3',
          audioUrl: 'https://cdn.zeitnah.app/music/deep-architecture.mp3',
          coverUrl: 'https://cdn.zeitnah.app/music/covers/deep-architecture.jpg',
          licenseType: 'ROYALTY_FREE',
          attributionRequired: false,
          isActive: true,
        },
        {
          _id: 'track-zeitnah-inspiring-03',
          title: 'Horizon Blueprint',
          artist: 'Aura Vector',
          album: 'Future Builders',
          duration: 75,
          category: 'INSPIRING',
          mood: 'Optimistic',
          tags: ['inspiring', 'cinematic', 'construction', 'builders'],
          audioKey: 'community/music/track-zeitnah-inspiring-03/audio.mp3',
          audioUrl: 'https://cdn.zeitnah.app/music/horizon-blueprint.mp3',
          coverUrl: 'https://cdn.zeitnah.app/music/covers/horizon-blueprint.jpg',
          licenseType: 'ROYALTY_FREE',
          attributionRequired: true,
          attributionText: 'Horizon Blueprint by Aura Vector (Royalty-Free CC-BY)',
          isActive: true,
        },
        {
          _id: 'track-zeitnah-focus-04',
          title: 'Pulse of Synthesis',
          artist: 'Modular Minds',
          album: 'Structural Flow',
          duration: 80,
          category: 'FOCUS',
          mood: 'Focus',
          tags: ['lofi', 'coding', 'study', 'focus'],
          audioKey: 'community/music/track-zeitnah-focus-04/audio.mp3',
          audioUrl: 'https://cdn.zeitnah.app/music/pulse-of-synthesis.mp3',
          coverUrl: 'https://cdn.zeitnah.app/music/covers/pulse.jpg',
          licenseType: 'ROYALTY_FREE',
          attributionRequired: false,
          isActive: true,
        },
      ];

      await this.musicModel.insertMany(seedTracks);
      this.logger.log(`Successfully seeded ${seedTracks.length} music catalog tracks.`);
    } catch (err: any) {
      this.logger.warn(`Could not seed initial music catalog: ${err.message}`);
    }
  }
}
