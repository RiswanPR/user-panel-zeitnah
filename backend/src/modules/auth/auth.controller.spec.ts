import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockSignedUrlService: Partial<SignedUrlService>;

  beforeEach(async () => {
    mockSignedUrlService = {
      generateSignedImageUrl: jest
        .fn()
        .mockImplementation(async (key: string) => {
          return `https://s3.signed.cdn/${key}?signature=valid_sig`;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: SignedUrlService,
          useValue: mockSignedUrlService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe avatar resolution and contract tests', () => {
    it('✓ resolves and returns presigned S3 URL when user has an avatar key', async () => {
      const mockReq: any = {
        user: {
          userId: 'user-uuid-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          username: 'janedoe',
          usernameClaimed: true,
          primaryRole: 'STUDENT',
          role: 'student',
          deviceId: 'dev-abc',
          avatar: 'profiles/jane-123.jpg',
        },
      };

      const result = await controller.getMe(mockReq);

      expect(mockSignedUrlService.generateSignedImageUrl).toHaveBeenCalledWith(
        'profiles/jane-123.jpg',
      );
      expect(result).toEqual({
        success: true,
        user: {
          id: 'user-uuid-123',
          userId: 'user-uuid-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          username: 'janedoe',
          usernameClaimed: true,
          primaryRole: 'STUDENT',
          role: 'student',
          deviceId: 'dev-abc',
          avatar:
            'https://s3.signed.cdn/profiles/jane-123.jpg?signature=valid_sig',
        },
      });
    });

    it('✓ returns empty string when user avatar is empty', async () => {
      const mockReq: any = {
        user: {
          userId: 'user-uuid-456',
          name: 'Alex Smith',
          email: 'alex@example.com',
          username: 'alexsmith',
          usernameClaimed: false,
          primaryRole: 'EDUCATOR',
          role: 'teacher',
          deviceId: 'dev-xyz',
          avatar: '',
        },
      };

      const result = await controller.getMe(mockReq);

      expect(
        mockSignedUrlService.generateSignedImageUrl,
      ).not.toHaveBeenCalled();
      expect(result.user.avatar).toBe('');
      expect(result.user.primaryRole).toBe('EDUCATOR');
    });

    it('✓ operates safely without signedUrlService provided (backward compatibility)', async () => {
      const standaloneController = new AuthController({} as any, undefined);
      const mockReq: any = {
        user: {
          userId: 'user-uuid-789',
          name: 'Chris Lee',
          email: 'chris@example.com',
          username: 'chrislee',
          usernameClaimed: true,
          primaryRole: 'RECRUITER',
          role: 'recruiter',
          deviceId: 'dev-111',
          avatar: 'profiles/chris.png',
        },
      };

      const result = await standaloneController.getMe(mockReq);

      expect(result.success).toBe(true);
      expect(result.user.avatar).toBe('profiles/chris.png');
    });
  });
});
