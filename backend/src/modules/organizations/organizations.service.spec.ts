import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  OrganizationType,
  OrganizationVerificationStatus,
  BusinessStatus,
  OrganizationVisibility,
} from './schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from './schemas/organization-membership.schema';
import { User } from '../auth/schemas/user.schema';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { Types } from 'mongoose';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockUserModel: any;
  let mockUploadService: any;
  let mockSignedUrlService: any;

  // Helper buffers with valid magic numbers
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x20, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20,
  ]);
  const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);

  beforeEach(async () => {
    mockOrgModel = {
      findOne: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          name: 'Zeitnah Labs',
          slug: 'zeitnah-labs',
          type: OrganizationType.STARTUP,
        }),
      })),
      findById: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        name: 'Zeitnah Labs',
        logo: 'organizations/logos/old-logo.png',
        save: jest.fn().mockResolvedValue(true),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: new Types.ObjectId(),
                  name: 'Zeitnah Labs',
                  slug: 'zeitnah-labs',
                },
              ]),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
      create: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
        ),
    };

    mockMembershipModel = {
      create: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
        ),
      findOne: jest.fn().mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      }),
      aggregate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(5),
    };

    mockUserModel = {
      findById: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        primaryRole: 'RECRUITER',
        role: 'user',
      }),
    };

    mockUploadService = {
      uploadFile: jest.fn().mockResolvedValue('uploaded-key'),
      deleteFile: jest.fn().mockResolvedValue(true),
      s3Service: {
        bucketName: 'test-bucket',
        region: 'us-east-1',
      },
    };

    mockSignedUrlService = {
      generateSignedImageUrl: jest.fn().mockImplementation((k) => `https://cdn.zeitnah.com/${k}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        {
          provide: getModelToken(OrganizationMembership.name),
          useValue: mockMembershipModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: UploadService, useValue: mockUploadService },
        { provide: SignedUrlService, useValue: mockSignedUrlService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list organizations', async () => {
    const res = await service.getOrganizations({});
    expect(res).toBeDefined();
    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it('should get organization by slug', async () => {
    const res = await service.getOrganizationBySlug('zeitnah-labs');
    expect(res).toBeDefined();
    expect(res.name).toBe('Zeitnah Labs');
    expect(res.memberCount).toBe(5);
  });

  describe('Business Logo Upload & Validation', () => {
    const userId = new Types.ObjectId().toString();

    it('should successfully upload a valid PNG logo for authorized recruiter', async () => {
      const mockFile: any = {
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
        originalname: 'company-logo.png',
      };

      const result = await service.uploadLogo(userId, mockFile);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.url).toContain('https://cdn.zeitnah.com/organizations/logos/');
      expect(result.key).toMatch(/^organizations\/logos\/.+\.png$/);
      expect(mockUploadService.uploadFile).toHaveBeenCalledWith(
        result.key,
        mockFile.buffer,
        'image/png'
      );
    });

    it('should successfully upload a valid JPEG logo for authorized founder', async () => {
      mockUserModel.findById.mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        primaryRole: 'FOUNDER',
        role: 'user',
      });

      const mockFile: any = {
        buffer: validJpgBuffer,
        mimetype: 'image/jpeg',
        size: validJpgBuffer.length,
        originalname: 'brand.jpg',
      };

      const result = await service.uploadLogo(userId, mockFile);

      expect(result.success).toBe(true);
      expect(result.key).toMatch(/\.jpg$/);
    });

    it('should successfully upload a valid WebP logo', async () => {
      const mockFile: any = {
        buffer: validWebpBuffer,
        mimetype: 'image/webp',
        size: validWebpBuffer.length,
        originalname: 'brand.webp',
      };

      const result = await service.uploadLogo(userId, mockFile);

      expect(result.success).toBe(true);
      expect(result.key).toMatch(/\.webp$/);
    });

    it('should reject unauthorized user role (e.g. STUDENT)', async () => {
      mockUserModel.findById.mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        primaryRole: 'STUDENT',
        role: 'user',
      });

      const mockFile: any = {
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      };

      await expect(service.uploadLogo(userId, mockFile)).rejects.toThrow(ForbiddenException);
    });

    it('should allow platform admin to upload business logo regardless of primaryRole', async () => {
      mockUserModel.findById.mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        primaryRole: 'STUDENT',
        role: 'admin',
      });

      const mockFile: any = {
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      };

      const result = await service.uploadLogo(userId, mockFile);
      expect(result.success).toBe(true);
    });

    it('should reject empty image buffer', async () => {
      const mockFile: any = {
        buffer: Buffer.alloc(0),
        mimetype: 'image/png',
        size: 0,
      };

      await expect(service.uploadLogo(userId, mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding 5 MB limit', async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
      // prepend PNG magic bytes
      validPngBuffer.copy(largeBuffer);

      const mockFile: any = {
        buffer: largeBuffer,
        mimetype: 'image/png',
        size: largeBuffer.length,
      };

      await expect(service.uploadLogo(userId, mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should reject unsupported MIME type (e.g. application/pdf, image/gif)', async () => {
      const mockFile: any = {
        buffer: validPngBuffer,
        mimetype: 'image/gif',
        size: validPngBuffer.length,
      };

      await expect(service.uploadLogo(userId, mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should reject file when binary magic numbers do not match MIME type (spoofed extension)', async () => {
      const mockFile: any = {
        buffer: invalidBuffer, // non-PNG bytes
        mimetype: 'image/png',
        size: invalidBuffer.length,
      };

      await expect(service.uploadLogo(userId, mockFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Business Creation & Update with Logo', () => {
    const userId = new Types.ObjectId().toString();

    it('should create business with uploaded logo reference', async () => {
      mockOrgModel.findOne.mockReturnValueOnce(null); // slug available

      const logoUrl = 'https://cdn.zeitnah.com/organizations/logos/user-123.png';
      const created = await service.createOrganization(userId, {
        name: 'Apex Infrastructure Ltd',
        logo: logoUrl,
        type: OrganizationType.COMPANY,
      });

      expect(created).toBeDefined();
      expect(mockOrgModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Apex Infrastructure Ltd',
          logo: logoUrl,
        })
      );
    });

    it('should create business without logo when logo is omitted (optional field)', async () => {
      mockOrgModel.findOne.mockReturnValueOnce(null);

      const created = await service.createOrganization(userId, {
        name: 'Bare Business',
        type: OrganizationType.STARTUP,
      });

      expect(created).toBeDefined();
      expect(mockOrgModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bare Business',
          logo: '',
        })
      );
    });

    it('should preserve backward compatibility for existing external logo URLs', async () => {
      mockOrgModel.findOne.mockReturnValueOnce(null);

      const externalUrl = 'https://external-partner.com/assets/logo.png';
      const created = await service.createOrganization(userId, {
        name: 'External Partner Org',
        logo: externalUrl,
      });

      expect(created).toBeDefined();
      expect(mockOrgModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logo: externalUrl,
        })
      );
    });

    it('should update organization logo and clean up previous S3 logo object', async () => {
      const orgId = new Types.ObjectId().toString();
      const existingOrg: any = {
        _id: orgId,
        name: 'Apex Infrastructure',
        logo: 'organizations/logos/old-logo-key.png',
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValueOnce(existingOrg);

      const newLogoUrl = 'https://cdn.zeitnah.com/organizations/logos/new-logo-key.png';
      await service.updateOrganization(userId, orgId, {
        logo: newLogoUrl,
      });

      expect(existingOrg.logo).toBe(newLogoUrl);
      expect(mockUploadService.deleteFile).toHaveBeenCalledWith('organizations/logos/old-logo-key.png');
      expect(existingOrg.save).toHaveBeenCalled();
    });

    it('should allow removing an existing logo by setting logo to empty string', async () => {
      const orgId = new Types.ObjectId().toString();
      const existingOrg: any = {
        _id: orgId,
        name: 'Apex Infrastructure',
        logo: 'organizations/logos/existing-to-remove.png',
        save: jest.fn().mockResolvedValue(true),
      };
      mockOrgModel.findById.mockResolvedValueOnce(existingOrg);

      await service.updateOrganization(userId, orgId, {
        logo: '',
      });

      expect(existingOrg.logo).toBe('');
      expect(mockUploadService.deleteFile).toHaveBeenCalledWith('organizations/logos/existing-to-remove.png');
      expect(existingOrg.save).toHaveBeenCalled();
    });
  });

  describe('validateCompanyFeedAccess (Phase 3 Company Feed)', () => {
    const testUserId = new Types.ObjectId().toString();

    it('throws BadRequestException for invalid organization ID format', async () => {
      await expect(
        service.validateCompanyFeedAccess(testUserId, 'invalid-id-xyz'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when organization is not found', async () => {
      const nonExistentOrgId = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.validateCompanyFeedAccess(testUserId, nonExistentOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when organization is suspended or rejected', async () => {
      const orgId = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce({
          _id: orgId,
          name: 'Suspended Org',
          status: BusinessStatus.SUSPENDED,
        }),
      });

      await expect(
        service.validateCompanyFeedAccess(testUserId, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when private organization is accessed by non-member', async () => {
      const orgId = new Types.ObjectId().toString();
      const otherUser = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce({
          _id: orgId,
          name: 'Private Corp',
          status: BusinessStatus.APPROVED,
          visibility: OrganizationVisibility.PRIVATE,
          createdBy: new Types.ObjectId(otherUser),
        }),
      });
      mockMembershipModel.findOne = jest.fn().mockResolvedValueOnce(null);

      await expect(
        service.validateCompanyFeedAccess(testUserId, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows access to public approved organization', async () => {
      const orgId = new Types.ObjectId().toString();
      const orgDoc = {
        _id: orgId,
        name: 'Public Enterprise',
        status: BusinessStatus.APPROVED,
        visibility: OrganizationVisibility.PUBLIC,
        createdBy: new Types.ObjectId(),
      };
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(orgDoc),
      });

      const result = await service.validateCompanyFeedAccess(testUserId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe('Public Enterprise');
    });

    it('allows access to private organization for authorized member', async () => {
      const orgId = new Types.ObjectId().toString();
      const orgDoc = {
        _id: orgId,
        name: 'Private Member Org',
        status: BusinessStatus.APPROVED,
        visibility: OrganizationVisibility.PRIVATE,
        createdBy: new Types.ObjectId(),
      };
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(orgDoc),
      });
      mockMembershipModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.validateCompanyFeedAccess(testUserId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe('Private Member Org');
    });
  });

  describe('validateCompanyPublishingAccess (Phase 4 Business Create)', () => {
    const testUserId = new Types.ObjectId().toString();

    it('throws BadRequestException for invalid organization ID', async () => {
      await expect(
        service.validateCompanyPublishingAccess(testUserId, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when organization is not found', async () => {
      const orgId = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.validateCompanyPublishingAccess(testUserId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when organization is suspended or rejected', async () => {
      const orgId = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce({
          _id: orgId,
          name: 'Suspended Org',
          status: BusinessStatus.SUSPENDED,
        }),
      });

      await expect(
        service.validateCompanyPublishingAccess(testUserId, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user is neither creator nor active member', async () => {
      const orgId = new Types.ObjectId().toString();
      const otherUser = new Types.ObjectId().toString();
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce({
          _id: orgId,
          name: 'Target Company',
          status: BusinessStatus.APPROVED,
          createdBy: new Types.ObjectId(otherUser),
        }),
      });
      mockMembershipModel.findOne = jest.fn().mockResolvedValueOnce(null);

      await expect(
        service.validateCompanyPublishingAccess(testUserId, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows publishing for the creator of the company', async () => {
      const orgId = new Types.ObjectId().toString();
      const orgDoc = {
        _id: orgId,
        name: 'Creator Company',
        status: BusinessStatus.APPROVED,
        createdBy: new Types.ObjectId(testUserId),
      };
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(orgDoc),
      });

      const result = await service.validateCompanyPublishingAccess(testUserId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe('Creator Company');
    });

    it('allows publishing for an active member of the company', async () => {
      const orgId = new Types.ObjectId().toString();
      const otherUser = new Types.ObjectId().toString();
      const orgDoc = {
        _id: orgId,
        name: 'Member Company',
        status: BusinessStatus.APPROVED,
        createdBy: new Types.ObjectId(otherUser),
      };
      mockOrgModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce(orgDoc),
      });
      mockMembershipModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.validateCompanyPublishingAccess(testUserId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe('Member Company');
    });
  });
});
