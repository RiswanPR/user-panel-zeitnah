import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  AudioConfigDto,
  EditorLayerDto,
  EditorConfigDto,
  CreatePostMediaDto,
  CreatePostDto,
  UpdatePostDto,
  ReactionDto,
  QuotePostDto,
} from './dto/post.dto';
import { PostController } from './controllers/post.controller';
import { PostType, PostAudience } from './domain/post.model';

describe('Community DTO Initialization & TDZ Regression (Production Fix)', () => {
  describe('1. DTO Class Loading & TDZ Safety', () => {
    it('should successfully initialize AudioConfigDto without ReferenceError', () => {
      expect(AudioConfigDto).toBeDefined();
      expect(typeof AudioConfigDto).toBe('function');
      const audioConfig = new AudioConfigDto();
      expect(audioConfig).toBeInstanceOf(AudioConfigDto);
    });

    it('should successfully initialize EditorLayerDto and EditorConfigDto without ReferenceError', () => {
      expect(EditorLayerDto).toBeDefined();
      expect(typeof EditorLayerDto).toBe('function');
      const layer = new EditorLayerDto();
      expect(layer).toBeInstanceOf(EditorLayerDto);

      expect(EditorConfigDto).toBeDefined();
      expect(typeof EditorConfigDto).toBe('function');
      const config = new EditorConfigDto();
      expect(config).toBeInstanceOf(EditorConfigDto);
    });

    it('should successfully initialize CreatePostMediaDto with nested DTO references', () => {
      expect(CreatePostMediaDto).toBeDefined();
      expect(typeof CreatePostMediaDto).toBe('function');
      const media = new CreatePostMediaDto();
      expect(media).toBeInstanceOf(CreatePostMediaDto);
    });

    it('should successfully initialize CreatePostDto, UpdatePostDto, ReactionDto, QuotePostDto', () => {
      expect(CreatePostDto).toBeDefined();
      expect(UpdatePostDto).toBeDefined();
      expect(ReactionDto).toBeDefined();
      expect(QuotePostDto).toBeDefined();
    });

    it('should allow PostController to be imported and loaded without runtime crash', () => {
      expect(PostController).toBeDefined();
      expect(typeof PostController).toBe('function');
    });
  });

  describe('2. Validation & Nested Transformation Contract', () => {
    it('should accept valid CreatePostDto with nested AudioConfigDto and EditorConfigDto', async () => {
      const payload = {
        content: 'Structural BIM verification workflow',
        type: PostType.VIDEO,
        audience: PostAudience.PUBLIC,
        media: [
          {
            url: 'https://cdn.zeitnah.com/videos/reel-1.mp4',
            type: 'video',
            audioConfig: {
              audioMode: 'MIXED',
              musicId: 'track-101',
              musicTitle: 'Ambient Focus',
              musicArtist: 'Zeitnah Sound Studio',
              originalVolume: 0.8,
              musicVolume: 0.6,
            },
            editorConfig: {
              version: 1,
              layers: [
                {
                  id: 'layer-1',
                  type: 'TEXT',
                  start: 0,
                  end: 5,
                  x: 0.5,
                  y: 0.5,
                  content: 'Grid A-4 Column Check',
                },
              ],
            },
          },
        ],
      };

      const dto = plainToInstance(CreatePostDto, payload);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.media?.[0].audioConfig).toBeInstanceOf(AudioConfigDto);
      expect(dto.media?.[0].editorConfig).toBeInstanceOf(EditorConfigDto);
      expect(dto.media?.[0].editorConfig?.layers?.[0]).toBeInstanceOf(
        EditorLayerDto,
      );
    });

    it('should reject invalid AudioConfigDto audioMode', async () => {
      const payload = {
        content: 'Testing invalid audio mode',
        type: PostType.VIDEO,
        audience: PostAudience.PUBLIC,
        media: [
          {
            url: 'https://cdn.zeitnah.com/videos/reel-2.mp4',
            type: 'video',
            audioConfig: {
              audioMode: 'UNSUPPORTED_MODE',
            },
          },
        ],
      };

      const dto = plainToInstance(CreatePostDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const mediaError = errors.find((e) => e.property === 'media');
      expect(mediaError).toBeDefined();
    });

    it('should reject invalid EditorLayerDto type', async () => {
      const payload = {
        content: 'Testing invalid layer type',
        type: PostType.VIDEO,
        audience: PostAudience.PUBLIC,
        media: [
          {
            url: 'https://cdn.zeitnah.com/videos/reel-3.mp4',
            type: 'video',
            editorConfig: {
              version: 1,
              layers: [
                {
                  id: 'layer-invalid',
                  type: 'INVALID_LAYER_TYPE',
                  start: 0,
                  end: 5,
                  x: 0.5,
                  y: 0.5,
                },
              ],
            },
          },
        ],
      };

      const dto = plainToInstance(CreatePostDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid standard Post without audio or editor config (backward compatibility)', async () => {
      const payload = {
        content: 'Standard image post without extra media configs',
        type: PostType.IMAGE,
        audience: PostAudience.PUBLIC,
        media: [
          {
            url: 'https://cdn.zeitnah.com/images/blueprint-1.jpg',
            type: 'image',
          },
        ],
      };

      const dto = plainToInstance(CreatePostDto, payload);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.media?.[0].audioConfig).toBeUndefined();
      expect(dto.media?.[0].editorConfig).toBeUndefined();
    });
  });
});
