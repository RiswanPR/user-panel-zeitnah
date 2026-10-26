import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController - Authorization & Role Boundary Audit', () => {
  let controller: OrganizationsController;
  let mockOrgService: any;

  beforeEach(async () => {
    mockOrgService = {
      getOrganizationsForAdmin: jest
        .fn()
        .mockResolvedValue({ organizations: [], total: 0 }),
      approveOrganization: jest.fn().mockResolvedValue({ success: true }),
      rejectOrganization: jest.fn().mockResolvedValue({ success: true }),
      suspendOrganization: jest.fn().mockResolvedValue({ success: true }),
      createOrganization: jest.fn().mockResolvedValue({ _id: 'org123' }),
      getMyOrganizations: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrgService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  describe('Admin Review & Governance Boundaries', () => {
    const nonAdminRoles = [
      { role: 'student', primaryRole: 'STUDENT' },
      { role: 'student', primaryRole: 'PROFESSIONAL' },
      { role: 'recruiter', primaryRole: 'RECRUITER' },
      { role: 'teacher', primaryRole: 'EDUCATOR' },
      // Legacy unmigrated role inputs
      { role: 'student', primaryRole: 'MENTOR' },
      { role: 'recruiter', primaryRole: 'FOUNDER' },
    ];

    it.each(nonAdminRoles)(
      'rejects non-admin role ($primaryRole / $role) from getOrganizationsForAdmin with 403 Forbidden',
      async (userContext) => {
        const req = { user: { userId: 'user_1', ...userContext } };
        await expect(
          controller.getOrganizationsForAdmin(req, {} as any),
        ).rejects.toThrow(ForbiddenException);
        expect(mockOrgService.getOrganizationsForAdmin).not.toHaveBeenCalled();
      },
    );

    it.each(nonAdminRoles)(
      'rejects non-admin role ($primaryRole / $role) from approveOrganization with 403 Forbidden',
      async (userContext) => {
        const req = { user: { userId: 'user_1', ...userContext } };
        await expect(
          controller.approveOrganization(req, 'org_123'),
        ).rejects.toThrow(ForbiddenException);
        expect(mockOrgService.approveOrganization).not.toHaveBeenCalled();
      },
    );

    it.each(nonAdminRoles)(
      'rejects non-admin role ($primaryRole / $role) from rejectOrganization with 403 Forbidden',
      async (userContext) => {
        const req = { user: { userId: 'user_1', ...userContext } };
        await expect(
          controller.rejectOrganization(req, 'org_123', {
            reason: 'Violates terms',
          }),
        ).rejects.toThrow(ForbiddenException);
        expect(mockOrgService.rejectOrganization).not.toHaveBeenCalled();
      },
    );

    it.each(nonAdminRoles)(
      'rejects non-admin role ($primaryRole / $role) from suspendOrganization with 403 Forbidden',
      async (userContext) => {
        const req = { user: { userId: 'user_1', ...userContext } };
        await expect(
          controller.suspendOrganization(req, 'org_123', {
            reason: 'Policy violation',
          }),
        ).rejects.toThrow(ForbiddenException);
        expect(mockOrgService.suspendOrganization).not.toHaveBeenCalled();
      },
    );

    it('permits verified admin with canonical primaryRole ADMIN to access admin review', async () => {
      const req = {
        user: { userId: 'admin_1', primaryRole: 'ADMIN', role: 'student' },
      };
      const result = await controller.getOrganizationsForAdmin(req, {});
      expect(result).toBeDefined();
      expect(mockOrgService.getOrganizationsForAdmin).toHaveBeenCalled();
    });

    it('permits verified admin with legacy role admin to access admin review', async () => {
      const req = {
        user: { userId: 'admin_1', primaryRole: 'ADMIN', role: 'admin' },
      };
      const result = await controller.getOrganizationsForAdmin(req, {});
      expect(result).toBeDefined();
      expect(mockOrgService.getOrganizationsForAdmin).toHaveBeenCalled();
    });

    it('permits verified admin to approve, reject, and suspend an organization', async () => {
      const req = {
        user: { userId: 'admin_1', primaryRole: 'ADMIN', role: 'admin' },
      };
      await controller.approveOrganization(req, 'org_123');
      expect(mockOrgService.approveOrganization).toHaveBeenCalledWith(
        'admin_1',
        'org_123',
      );

      await controller.rejectOrganization(req, 'org_123', {
        reason: 'Incomplete',
      });
      expect(mockOrgService.rejectOrganization).toHaveBeenCalledWith(
        'admin_1',
        'org_123',
        'Incomplete',
      );

      await controller.suspendOrganization(req, 'org_123', {
        reason: 'Under review',
      });
      expect(mockOrgService.suspendOrganization).toHaveBeenCalledWith(
        'admin_1',
        'org_123',
        'Under review',
      );
    });

    it('rejects unauthenticated or empty user payload with 403 Forbidden', async () => {
      const req = { user: undefined };
      await expect(
        controller.getOrganizationsForAdmin(req, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
