import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CatalogueDepartment,
  CatalogueDepartmentDocument,
} from '../schemas/catalogue-department.schema';
import {
  CatalogueTitle,
  CatalogueTitleDocument,
} from '../schemas/catalogue-title.schema';

export interface RawCatalogueDepartmentRecord {
  id: string;
  name: string;
  status: 'active' | 'retired';
  displayOrder: number;
  catalogueVersion?: string;
  aliases?: string[];
}

export interface RawCatalogueTitleRecord {
  id: string;
  departmentId: string;
  label: string;
  status: 'active' | 'retired';
  displayOrder: number;
  catalogueVersion?: string;
  aliases?: string[];
}

@Injectable()
export class CatalogueRepository {
  private readonly logger = new Logger(CatalogueRepository.name);

  constructor(
    @InjectModel(CatalogueDepartment.name)
    private readonly departmentModel: Model<CatalogueDepartmentDocument>,
    @InjectModel(CatalogueTitle.name)
    private readonly titleModel: Model<CatalogueTitleDocument>,
  ) {}

  /**
   * Reads only active departments deterministically ordered by displayOrder asc, then id asc.
   * Strictly read-only via lean(). Never writes, modifies, or seeds.
   */
  async findActiveDepartments(): Promise<RawCatalogueDepartmentRecord[]> {
    return (await this.departmentModel
      .find({ status: 'active' })
      .sort({ displayOrder: 1, id: 1 })
      .lean()
      .exec()) as RawCatalogueDepartmentRecord[];
  }

  /**
   * Reads only active titles deterministically ordered by displayOrder asc, then id asc.
   * Strictly read-only via lean(). Never writes, modifies, or seeds.
   */
  async findActiveTitles(): Promise<RawCatalogueTitleRecord[]> {
    return (await this.titleModel
      .find({ status: 'active' })
      .sort({ displayOrder: 1, id: 1 })
      .lean()
      .exec()) as RawCatalogueTitleRecord[];
  }

  /**
   * Reads all titles (both active and retired) deterministically ordered by displayOrder asc, then id asc.
   * Read-only query for legacy profile inspection if needed.
   */
  async findAllTitles(): Promise<RawCatalogueTitleRecord[]> {
    return (await this.titleModel
      .find({})
      .sort({ displayOrder: 1, id: 1 })
      .lean()
      .exec()) as RawCatalogueTitleRecord[];
  }

  /**
   * Reads total count of documents in both collections for health / presence checks.
   * Read-only.
   */
  async getCollectionCounts(): Promise<{
    departments: number;
    titles: number;
  }> {
    const [departments, titles] = await Promise.all([
      this.departmentModel.countDocuments({}).exec(),
      this.titleModel.countDocuments({}).exec(),
    ]);
    return { departments, titles };
  }
}
