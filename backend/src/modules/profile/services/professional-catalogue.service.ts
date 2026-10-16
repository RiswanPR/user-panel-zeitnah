import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PROFESSIONAL_CATALOGUE_VERSION,
  CatalogueDepartment,
  CatalogueTitle,
  getAllDepartments,
  getDepartmentById,
  getTitleById,
  getCatalogueSummary,
} from '../constants/professional-catalogue';

export interface ValidatedProfessionalIdentity {
  departmentId: string;
  departmentName: string;
  titleId: string | null;
  titleName: string;
  isCustomTitle: boolean;
  isLegacyTitle: boolean;
  catalogueVersion: string;
}

@Injectable()
export class ProfessionalCatalogueService {
  getCatalogue() {
    return {
      version: PROFESSIONAL_CATALOGUE_VERSION,
      departments: getAllDepartments(),
      summary: getCatalogueSummary(),
    };
  }

  getDepartments(): readonly CatalogueDepartment[] {
    return getAllDepartments();
  }

  getDepartment(deptId: string): CatalogueDepartment | undefined {
    return getDepartmentById(deptId);
  }

  getTitle(deptId: string, titleId: string): CatalogueTitle | undefined {
    return getTitleById(deptId, titleId);
  }

  validateAndResolveIdentity(input?: {
    departmentId?: string | null;
    titleId?: string | null;
    customTitle?: string | null;
    titleName?: string | null;
    isCustomTitle?: boolean;
  }): ValidatedProfessionalIdentity {
    if (!input || !input.departmentId || !input.departmentId.trim()) {
      throw new BadRequestException('Department ID is required');
    }

    const cleanDeptId = input.departmentId.trim();
    const department = getDepartmentById(cleanDeptId);
    if (!department || department.status !== 'active') {
      throw new BadRequestException(`Invalid department ID: '${cleanDeptId}'`);
    }

    const isCustom = Boolean(
      input.isCustomTitle ||
      (input.customTitle && input.customTitle.trim().length > 0) ||
      (!input.titleId && input.titleName && input.titleName.trim().length > 0)
    );

    if (isCustom) {
      const rawCustomTitle = (input.customTitle || input.titleName || '').trim();
      if (!rawCustomTitle) {
        throw new BadRequestException('Custom title cannot be empty');
      }

      // Max length limit 100 characters
      if (rawCustomTitle.length > 100) {
        throw new BadRequestException('Custom title must not exceed 100 characters');
      }

      // Plain text validation: reject HTML or multiline content
      if (/[<>]/.test(rawCustomTitle) || /[\r\n]/.test(rawCustomTitle)) {
        throw new BadRequestException('Custom title must be single-line plain text without HTML');
      }

      return {
        departmentId: department.id,
        departmentName: department.name,
        titleId: null,
        titleName: rawCustomTitle,
        isCustomTitle: true,
        isLegacyTitle: false,
        catalogueVersion: PROFESSIONAL_CATALOGUE_VERSION,
      };
    }

    // Predefined title path
    if (!input.titleId || !input.titleId.trim()) {
      throw new BadRequestException('A predefined title ID or custom title is required');
    }

    const cleanTitleId = input.titleId.trim();
    const title = getTitleById(department.id, cleanTitleId);

    if (!title || title.status !== 'active') {
      // Check if titleId belongs to another department to provide an accurate diagnostic
      for (const otherDept of getAllDepartments()) {
        if (otherDept.id !== department.id && getTitleById(otherDept.id, cleanTitleId)) {
          throw new BadRequestException(
            `Title '${cleanTitleId}' belongs to department '${otherDept.name}', not '${department.name}'`
          );
        }
      }
      throw new BadRequestException(
        `Invalid title ID '${cleanTitleId}' for department '${department.name}'`
      );
    }

    return {
      departmentId: department.id,
      departmentName: department.name,
      titleId: title.id,
      titleName: title.label,
      isCustomTitle: false,
      isLegacyTitle: false,
      catalogueVersion: PROFESSIONAL_CATALOGUE_VERSION,
    };
  }
}
