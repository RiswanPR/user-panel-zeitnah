import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ModerationService } from '../moderation/moderation.service';
import {
  Report,
  ReportTargetType,
  ReportStatus,
} from '../moderation/schemas/report.schema';
import { Block } from '../moderation/schemas/block.schema';
import { CommunityModerationService } from './services/community-moderation.service';
import { ModerationController } from './controllers/moderation.controller';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { ModerationLog } from './schemas/moderation-log.schema';
import { Report as LegacyReport } from './schemas/metadata.schema';

describe('Zeitnah Community — Phase A: Moderation Reporting Pipeline Verification', () => {
  let moderationService: ModerationService;
  let communityModService: CommunityModerationService;
  let communityModController: ModerationController;

  let mockReportModel: any;
  let mockBlockModel: any;
  let mockLegacyReportModel: any;
  let mockModLogModel: any;
  let mockPostRepository: any;
  let mockCommentRepository: any;

  const validReporterId = new Types.ObjectId().toString();
  const validModeratorId = new Types.ObjectId().toString();
  const validPostId = new Types.ObjectId().toString();
  const validCommentId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockReportModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation(async (filter: any, update: any) => {
          const id = filter?._id ? String(filter._id) : '';
          const doc = await mockReportModel.findById(id);
          if (!doc) return null;
          if (filter.status?.$in && !filter.status.$in.includes(doc.status)) {
            return null; // Atomic CAS mismatch: already transitioned
          }
          if (update?.$set) {
            Object.assign(doc, update.$set);
          }
          return doc;
        }),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockBlockModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      deleteOne: jest.fn(),
      lean: jest.fn().mockResolvedValue([]),
    };

    mockLegacyReportModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation(async (filter: any, update: any) => {
          const id = filter?._id ? String(filter._id) : '';
          const doc = await mockLegacyReportModel.findById(id);
          if (!doc) return null;
          if (filter.status?.$in && !filter.status.$in.includes(doc.status)) {
            return null;
          }
          if (update?.$set) {
            Object.assign(doc, update.$set);
          }
          return doc;
        }),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockModLogModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(true),
    }));

    mockPostRepository = {
      findById: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      setLockStatus: jest.fn().mockResolvedValue(true),
    };

    mockCommentRepository = {
      findById: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(true),
    };

    moderationService = new ModerationService(mockBlockModel, mockReportModel);

    communityModService = new CommunityModerationService(
      mockLegacyReportModel,
      mockModLogModel,
      mockPostRepository,
      mockCommentRepository,
      moderationService,
    );

    communityModController = new ModerationController(communityModService);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Submitting Reports for Community Posts & Comments
  // ─────────────────────────────────────────────────────────────
  describe('1. Submitting Reports for Community Posts & Comments', () => {
    it('successfully submits a report for a Community post via ModerationService', async () => {
      const createdReport = {
        _id: new Types.ObjectId(),
        reporterId: new Types.ObjectId(validReporterId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: validPostId,
        reason: 'SPAM_OR_SCAM',
        details: 'Misleading commercial spam post',
        status: ReportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReportModel.findOne.mockResolvedValue(null);
      mockReportModel.create.mockResolvedValue(createdReport);

      const result = await moderationService.createReport(validReporterId, {
        targetType: ReportTargetType.COMMUNITY,
        targetId: validPostId,
        reason: 'SPAM_OR_SCAM',
        details: 'Misleading commercial spam post',
      });

      expect(result).toBe(createdReport);
      expect(mockReportModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: expect.any(Types.ObjectId),
          targetType: ReportTargetType.COMMUNITY,
          targetId: validPostId,
          reason: 'SPAM_OR_SCAM',
          status: ReportStatus.PENDING,
        }),
      );
    });

    it('successfully submits a report for a Community comment via ModerationService', async () => {
      const createdCommentReport = {
        _id: new Types.ObjectId(),
        reporterId: new Types.ObjectId(validReporterId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: validCommentId,
        reason: 'HARASSMENT',
        details: 'Harassing comment targeted at an individual',
        status: ReportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReportModel.findOne.mockResolvedValue(null);
      mockReportModel.create.mockResolvedValue(createdCommentReport);

      const result = await moderationService.createReport(validReporterId, {
        targetType: ReportTargetType.COMMUNITY,
        targetId: validCommentId,
        reason: 'HARASSMENT',
        details: 'Harassing comment targeted at an individual',
      });

      expect(result).toBe(createdCommentReport);
      expect(mockReportModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: ReportTargetType.COMMUNITY,
          targetId: validCommentId,
          reason: 'HARASSMENT',
        }),
      );
    });

    it('deduplicates identical pending reports from the same reporter', async () => {
      const existingReport = {
        _id: new Types.ObjectId(),
        reporterId: new Types.ObjectId(validReporterId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: validPostId,
        reason: 'INAPPROPRIATE_CONTENT',
        status: ReportStatus.PENDING,
      };

      mockReportModel.findOne.mockResolvedValue(existingReport);

      const result = await moderationService.createReport(validReporterId, {
        targetType: ReportTargetType.COMMUNITY,
        targetId: validPostId,
        reason: 'INAPPROPRIATE_CONTENT',
      });

      expect(result).toBe(existingReport);
      expect(mockReportModel.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Report Payload & Target Type Validation (Safety & Tamper Resistance)
  // ─────────────────────────────────────────────────────────────
  describe('2. Validation & Security Checks', () => {
    it('rejects forged or invalid targetType with BadRequestException', async () => {
      await expect(
        moderationService.createReport(validReporterId, {
          targetType: 'FORGED_INVALID_TYPE' as any,
          targetId: validPostId,
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects missing or empty targetId', async () => {
      await expect(
        moderationService.createReport(validReporterId, {
          targetType: ReportTargetType.COMMUNITY,
          targetId: '   ',
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects missing or empty reason', async () => {
      await expect(
        moderationService.createReport(validReporterId, {
          targetType: ReportTargetType.COMMUNITY,
          targetId: validPostId,
          reason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid reporterId ObjectId format', async () => {
      await expect(
        moderationService.createReport('non-object-id', {
          targetType: ReportTargetType.COMMUNITY,
          targetId: validPostId,
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-ObjectId targetId when targetType is USER', async () => {
      await expect(
        moderationService.createReport(validReporterId, {
          targetType: ReportTargetType.USER,
          targetId: 'invalid-user-target',
          reason: 'IMPERSONATION',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Authorized Dashboard Retrieval & Dual-Contract Compatibility
  // ─────────────────────────────────────────────────────────────
  describe('3. Authorized Dashboard Retrieval & Compatibility', () => {
    it('allows moderator to retrieve pending community reports', async () => {
      const activeReportDoc = {
        _id: new Types.ObjectId(),
        reporterId: new Types.ObjectId(validReporterId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: validPostId,
        reason: 'INAPPROPRIATE_CONTENT',
        details: 'Reported community post text',
        status: ReportStatus.PENDING,
        createdAt: new Date('2026-10-14T10:00:00Z'),
        updatedAt: new Date('2026-10-14T10:00:00Z'),
      };

      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([activeReportDoc]),
      });

      const req = { user: { role: 'moderator', userId: validModeratorId } };
      const reports = await communityModController.getReports(req);

      expect(Array.isArray(reports)).toBe(true);
      expect(reports).toHaveLength(1);

      const report = reports[0];
      // Verify both global contracts and community dashboard contracts exist
      expect(report.targetType).toBe(ReportTargetType.COMMUNITY);
      expect(report.entityType).toBe('community');
      expect(report.targetId).toBe(validPostId);
      expect(report.entityId).toBe(validPostId);
      expect(report.details).toBe('Reported community post text');
      expect(report.description).toBe('Reported community post text');
      expect(report.status).toBe(ReportStatus.PENDING);
      expect(report.source).toBe('active');
    });

    it('seamlessly incorporates legacy community_reports when active count is below limit', async () => {
      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]), // no active reports
      });

      const legacyReportDoc = {
        _id: 'legacy-uuid-1234',
        reporterId: validReporterId,
        entityType: 'post',
        entityId: validPostId,
        reason: 'SPAM',
        description: 'Legacy reported post',
        status: 'pending',
        createdAt: new Date('2026-09-01T12:00:00Z'),
        updatedAt: new Date('2026-09-01T12:00:00Z'),
      };

      mockLegacyReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([legacyReportDoc]),
      });

      const req = { user: { role: 'admin', userId: validModeratorId } };
      const reports = await communityModController.getReports(req);

      expect(reports).toHaveLength(1);
      expect(reports[0].entityId).toBe(validPostId);
      expect(reports[0].targetId).toBe(validPostId);
      expect(reports[0].description).toBe('Legacy reported post');
      expect(reports[0].source).toBe('legacy');
    });

    it('rejects unauthorized users from accessing the moderation dashboard', async () => {
      const normalUserReq = { user: { role: 'user', userId: validReporterId } };
      await expect(
        communityModController.getReports(normalUserReq),
      ).rejects.toThrow(ForbiddenException);

      const studentReq = { user: { role: 'student', userId: validReporterId } };
      await expect(
        communityModController.getReports(studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('supports case-insensitive moderator roles (admin, superadmin, moderator)', async () => {
      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        communityModController.getReports({ user: { role: 'ADMIN' } }),
      ).resolves.not.toThrow();

      await expect(
        communityModController.getReports({ user: { role: 'SuperAdmin' } }),
      ).resolves.not.toThrow();

      await expect(
        communityModController.getReports({ user: { role: 'MODERATOR' } }),
      ).resolves.not.toThrow();
    });

    it('merges canonical and legacy reports and does not starve or omit older legacy records across pages when canonical fills limit', async () => {
      const activeReports = [
        {
          _id: new Types.ObjectId(),
          reporterId: new Types.ObjectId(validReporterId),
          targetType: ReportTargetType.COMMUNITY,
          targetId: 'post-c1',
          reason: 'SPAM',
          status: ReportStatus.PENDING,
          createdAt: new Date('2026-10-10T00:00:00Z'),
        },
        {
          _id: new Types.ObjectId(),
          reporterId: new Types.ObjectId(validReporterId),
          targetType: ReportTargetType.COMMUNITY,
          targetId: 'post-c2',
          reason: 'SPAM',
          status: ReportStatus.PENDING,
          createdAt: new Date('2026-10-11T00:00:00Z'),
        },
        {
          _id: new Types.ObjectId(),
          reporterId: new Types.ObjectId(validReporterId),
          targetType: ReportTargetType.COMMUNITY,
          targetId: 'post-c3',
          reason: 'SPAM',
          status: ReportStatus.PENDING,
          createdAt: new Date('2026-10-12T00:00:00Z'),
        },
      ];

      const legacyReports = [
        {
          _id: 'legacy-1',
          reporterId: validReporterId,
          entityType: 'post',
          entityId: 'post-l1',
          reason: 'HARASSMENT',
          status: 'pending',
          createdAt: new Date('2026-09-01T00:00:00Z'),
        },
        {
          _id: 'legacy-2',
          reporterId: validReporterId,
          entityType: 'post',
          entityId: 'post-l2',
          reason: 'HARASSMENT',
          status: 'pending',
          createdAt: new Date('2026-09-02T00:00:00Z'),
        },
      ];

      // Mock active query to return slice up to fetchLimit
      mockReportModel.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation((limitCount: number) => ({
          exec: jest.fn().mockResolvedValue(activeReports.slice(0, limitCount)),
        })),
      }));

      // Mock legacy query to return slice up to fetchLimit
      mockLegacyReportModel.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation((limitCount: number) => ({
          exec: jest.fn().mockResolvedValue(legacyReports.slice(0, limitCount)),
        })),
      }));

      // Page 1: limit 2, skip 0 -> should return legacy-1 and legacy-2 (oldest)
      const page1 = await communityModService.getPendingReports(2, 0);
      expect(page1).toHaveLength(2);
      expect(page1[0].id).toBe('legacy-1');
      expect(page1[1].id).toBe('legacy-2');

      // Page 2: limit 2, skip 2 -> should return post-c1 and post-c2
      const page2 = await communityModService.getPendingReports(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].entityId).toBe('post-c1');
      expect(page2[1].entityId).toBe('post-c2');

      // Page 3: limit 2, skip 4 -> should return post-c3
      const page3 = await communityModService.getPendingReports(2, 4);
      expect(page3).toHaveLength(1);
      expect(page3[0].entityId).toBe('post-c3');

      // Page 4: limit 2, skip 6 -> empty
      const page4 = await communityModService.getPendingReports(2, 6);
      expect(page4).toHaveLength(0);
    });

    it('supports status=all and targetType=all filters against both active and legacy schemas', async () => {
      const getReportsSpy = jest.spyOn(moderationService, 'getReports');

      mockLegacyReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await communityModService.getPendingReports(20, 0, 'all', 'all');

      expect(getReportsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: 'ALL',
          status: 'all',
        }),
      );

      // Verify legacyQuery did not enforce status or entityType
      expect(mockLegacyReportModel.find).toHaveBeenCalledWith({});
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Report Resolution, Dismissal & Entity Hiding
  // ─────────────────────────────────────────────────────────────
  describe('4. Resolution Lifecycle & Entity Hiding', () => {
    it('resolves a report with DISMISSED status when action is dismiss', async () => {
      const reportId = new Types.ObjectId().toString();
      const mockReport = {
        _id: new Types.ObjectId(reportId),
        targetId: validPostId,
        targetType: ReportTargetType.COMMUNITY,
        reason: 'FALSE_ALARM',
        details: 'Initial report details',
        status: ReportStatus.PENDING,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockReportModel.findById.mockResolvedValue(mockReport);

      const req = { user: { role: 'moderator', userId: validModeratorId } };
      const result = await communityModController.resolveReport(
        req,
        reportId,
        'dismiss',
        'Not a violation of community guidelines',
      );

      expect(mockReport.status).toBe(ReportStatus.DISMISSED);
      expect(mockReport.details).toContain(
        '[Mod ' + validModeratorId + ']: Not a violation',
      );
      expect(result.status).toBe(ReportStatus.DISMISSED);
      expect(mockPostRepository.softDelete).not.toHaveBeenCalled();
    });

    it('resolves a report and soft-deletes a post when action is hide', async () => {
      const reportId = new Types.ObjectId().toString();
      const mockReport = {
        _id: new Types.ObjectId(reportId),
        targetId: validPostId,
        targetType: ReportTargetType.COMMUNITY,
        reason: 'SEVERE_OFFENSE',
        details: '',
        status: ReportStatus.PENDING,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockReportModel.findById.mockResolvedValue(mockReport);
      mockPostRepository.findById.mockResolvedValue({
        _id: validPostId,
        content: 'Bad post',
      });

      const req = { user: { role: 'moderator', userId: validModeratorId } };
      const result = await communityModController.resolveReport(
        req,
        reportId,
        'hide',
        'Removed due to terms violation',
      );

      expect(mockReport.status).toBe(ReportStatus.RESOLVED);
      expect(mockPostRepository.softDelete).toHaveBeenCalledWith(validPostId);
      expect(result.status).toBe(ReportStatus.RESOLVED);
    });

    it('soft-deletes a comment and decrements parent post comment counts when reported entity is a comment', async () => {
      mockPostRepository.findById.mockResolvedValue(null); // not a post
      mockCommentRepository.findById.mockResolvedValue({
        _id: validCommentId,
        postId: validPostId,
        content: 'Toxic comment',
      });
      mockCommentRepository.softDelete.mockResolvedValue(true);

      await communityModService.hideEntity(
        validCommentId,
        'comment',
        validModeratorId,
        'Abusive language',
      );

      expect(mockCommentRepository.softDelete).toHaveBeenCalledWith(
        validCommentId,
      );
      expect(mockPostRepository.update).toHaveBeenCalledWith(
        validPostId,
        expect.objectContaining({
          $inc: { 'stats.comments': -1 },
        }),
      );
    });

    it('does not decrement comment counts or log audit events if comment was already soft-deleted', async () => {
      mockPostRepository.findById.mockResolvedValue(null);
      mockCommentRepository.findById.mockResolvedValue({
        _id: validCommentId,
        postId: validPostId,
        content: 'Already deleted comment',
      });
      mockCommentRepository.softDelete.mockResolvedValue(false); // already deleted

      const result = await communityModService.hideEntity(
        validCommentId,
        'comment',
        validModeratorId,
        'Abusive language',
      );

      expect(result).toBe(false);
      expect(mockPostRepository.update).not.toHaveBeenCalled();
    });

    it('decrements both parent comment stats.replies and post stats.comments when hiding a threaded reply', async () => {
      const parentCommentId = new Types.ObjectId().toString();
      mockCommentRepository.findById.mockResolvedValue({
        _id: validCommentId,
        postId: validPostId,
        parentId: parentCommentId,
        content: 'Toxic threaded reply',
      });
      mockCommentRepository.softDelete.mockResolvedValue(true);
      mockCommentRepository.update = jest.fn().mockResolvedValue(true);

      const result = await communityModService.hideEntity(
        validCommentId,
        'comment',
        validModeratorId,
        'Toxic reply',
      );

      expect(result).toBe(true);
      expect(mockPostRepository.update).toHaveBeenCalledWith(
        validPostId,
        expect.objectContaining({
          $inc: { 'stats.comments': -1 },
        }),
      );
      expect(mockCommentRepository.update).toHaveBeenCalledWith(
        parentCommentId,
        expect.objectContaining({
          $inc: { 'stats.replies': -1 },
        }),
      );
    });

    it('guarantees repeated resolution is idempotent and does not re-run destructive actions or duplicate audit logs', async () => {
      const reportId = new Types.ObjectId().toString();
      const mockReport = {
        _id: new Types.ObjectId(reportId),
        targetId: validPostId,
        targetType: ReportTargetType.COMMUNITY,
        reason: 'SPAM',
        details: 'Initial report',
        status: ReportStatus.RESOLVED, // already resolved
        save: jest.fn().mockResolvedValue(true),
      };

      mockReportModel.findById.mockResolvedValue(mockReport);

      const req = { user: { role: 'moderator', userId: validModeratorId } };
      const result = await communityModController.resolveReport(
        req,
        reportId,
        'hide',
        'Duplicate resolution call',
      );

      expect(result.status).toBe(ReportStatus.RESOLVED);
      // Because wasAlreadyResolved is true, softDelete and new audit logs are not executed
      expect(mockPostRepository.softDelete).not.toHaveBeenCalled();
    });

    it('rejects resolution of unknown report with NotFoundException', async () => {
      const unknownId = new Types.ObjectId().toString();
      mockReportModel.findById.mockResolvedValue(null);
      mockLegacyReportModel.findById.mockResolvedValue(null);

      const req = { user: { role: 'moderator', userId: validModeratorId } };
      await expect(
        communityModController.resolveReport(req, unknownId, 'dismiss'),
      ).rejects.toThrow(NotFoundException);
    });

    it('safely handles two concurrent resolution attempts: exactly one transitions and executes side-effects', async () => {
      const reportId = new Types.ObjectId().toString();
      const sharedDoc = {
        _id: new Types.ObjectId(reportId),
        targetId: validPostId,
        targetType: ReportTargetType.COMMUNITY,
        reason: 'SPAM',
        details: 'Active pending report',
        status: ReportStatus.PENDING,
      };

      mockReportModel.findById.mockImplementation(async () => sharedDoc);
      mockPostRepository.findById.mockResolvedValue({
        _id: validPostId,
        content: 'Spam post',
      });
      mockPostRepository.softDelete.mockResolvedValue(true);

      const modLogSpy = jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(true),
      }));
      (communityModService as any).modLogModel = modLogSpy;

      // Two concurrent resolutions hitting resolveReport simultaneously
      const [res1, res2] = await Promise.all([
        communityModService.resolveReport(reportId, 'mod-1', 'hide', 'Note 1'),
        communityModService.resolveReport(reportId, 'mod-2', 'hide', 'Note 2'),
      ]);

      // Both callers receive the resolved report
      expect(res1.status).toBe(ReportStatus.RESOLVED);
      expect(res2.status).toBe(ReportStatus.RESOLVED);

      // But destructive side-effects and audit logging only executed for the transitioned resolution (mod-1)
      expect(mockPostRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(modLogSpy).toHaveBeenCalledTimes(2); // 1 for hideEntity, 1 for report resolution
      expect(modLogSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ moderatorId: 'mod-2' }),
      );
    });

    it('does not hide an entity or decrement stats if the target entity does not exist', async () => {
      mockPostRepository.findById.mockResolvedValue(null);
      mockCommentRepository.findById.mockResolvedValue(null);

      const postResult = await communityModService.hideEntity(
        'non-existent-post',
        'post',
        validModeratorId,
        'test',
      );
      expect(postResult).toBe(false);
      expect(mockPostRepository.softDelete).not.toHaveBeenCalled();

      const commentResult = await communityModService.hideEntity(
        'non-existent-comment',
        'comment',
        validModeratorId,
        'test',
      );
      expect(commentResult).toBe(false);
      expect(mockCommentRepository.softDelete).not.toHaveBeenCalled();
    });

    it('does not hide unrelated entity when targetId and entityType mismatch (e.g. comment ID supplied for post hide)', async () => {
      // Mock: comment exists, but post does not exist
      mockPostRepository.findById.mockResolvedValue(null);
      mockCommentRepository.findById.mockResolvedValue({
        _id: validCommentId,
        postId: validPostId,
        content: 'Existing comment',
      });

      // Calling hideEntity with type 'post' and a comment ID
      const result = await communityModService.hideEntity(
        validCommentId,
        'post',
        validModeratorId,
        'attempt mismatched hide',
      );

      expect(result).toBe(false);
      expect(mockPostRepository.softDelete).not.toHaveBeenCalled();
      expect(mockCommentRepository.softDelete).not.toHaveBeenCalled();
    });

    it('rejects ordinary users from resolving reports or hiding posts', async () => {
      const normalUserReq = { user: { role: 'user', userId: validReporterId } };

      await expect(
        communityModController.resolveReport(
          normalUserReq,
          new Types.ObjectId().toString(),
          'hide',
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        communityModController.hidePost(
          normalUserReq,
          validPostId,
          'unauthorized hide attempt',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Existing Non-Community Workflows Preservation
  // ─────────────────────────────────────────────────────────────
  describe('5. Non-Community Workflows Preservation', () => {
    it('supports user blocking and unblocking without regression', async () => {
      const userA = new Types.ObjectId().toString();
      const userB = new Types.ObjectId().toString();

      mockBlockModel.findOne.mockResolvedValue(null);
      mockBlockModel.create.mockResolvedValue({ status: 'ACTIVE' });

      const blockRes = await moderationService.blockUser(userA, userB);
      expect(blockRes.success).toBe(true);

      mockBlockModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      const unblockRes = await moderationService.unblockUser(userA, userB);
      expect(unblockRes.success).toBe(true);
    });

    it('supports non-community report target types (USER, MESSAGE, CONVERSATION)', async () => {
      const targetUserId = new Types.ObjectId().toString();
      mockReportModel.findOne.mockResolvedValue(null);
      mockReportModel.create.mockResolvedValue({
        targetType: ReportTargetType.USER,
        targetId: targetUserId,
      });

      const userReport = await moderationService.createReport(validReporterId, {
        targetType: ReportTargetType.USER,
        targetId: targetUserId,
        reason: 'IMPERSONATION',
      });

      expect(userReport.targetType).toBe(ReportTargetType.USER);
    });
  });
});
