import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CatalogueRepository } from './catalogue.repository';
import { CatalogueDepartment } from '../schemas/catalogue-department.schema';
import { CatalogueTitle } from '../schemas/catalogue-title.schema';

describe('CatalogueRepository', () => {
  let repository: CatalogueRepository;
  let mockDeptModel: any;
  let mockTitleModel: any;

  beforeEach(async () => {
    mockDeptModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { id: 'civil-engineering', name: 'Civil Engineering', status: 'active', displayOrder: 1 },
            ]),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(18),
      }),
    };

    mockTitleModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                id: 'civil-engineering:site-engineer',
                departmentId: 'civil-engineering',
                label: 'Site Engineer',
                status: 'active',
                displayOrder: 1,
              },
            ]),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(254),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogueRepository,
        {
          provide: getModelToken(CatalogueDepartment.name),
          useValue: mockDeptModel,
        },
        {
          provide: getModelToken(CatalogueTitle.name),
          useValue: mockTitleModel,
        },
      ],
    }).compile();

    repository = module.get<CatalogueRepository>(CatalogueRepository);
  });

  describe('findActiveDepartments', () => {
    it('queries active departments ordered deterministically by displayOrder asc, then id asc', async () => {
      const result = await repository.findActiveDepartments();

      expect(mockDeptModel.find).toHaveBeenCalledWith({ status: 'active' });
      expect(mockDeptModel.find().sort).toHaveBeenCalledWith({ displayOrder: 1, id: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('civil-engineering');
    });
  });

  describe('findActiveTitles', () => {
    it('queries active titles ordered deterministically by displayOrder asc, then id asc', async () => {
      const result = await repository.findActiveTitles();

      expect(mockTitleModel.find).toHaveBeenCalledWith({ status: 'active' });
      expect(mockTitleModel.find().sort).toHaveBeenCalledWith({ displayOrder: 1, id: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('civil-engineering:site-engineer');
    });
  });

  describe('findAllTitles', () => {
    it('queries all titles without status filter for historical inspections', async () => {
      const result = await repository.findAllTitles();

      expect(mockTitleModel.find).toHaveBeenCalledWith({});
      expect(mockTitleModel.find().sort).toHaveBeenCalledWith({ displayOrder: 1, id: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getCollectionCounts', () => {
    it('returns exact count of documents in both catalogue collections', async () => {
      const counts = await repository.getCollectionCounts();

      expect(mockDeptModel.countDocuments).toHaveBeenCalledWith({});
      expect(mockTitleModel.countDocuments).toHaveBeenCalledWith({});
      expect(counts).toEqual({ departments: 18, titles: 254 });
    });
  });

  describe('Read-Only Safety Invariant', () => {
    it('exposes strictly zero mutation, insertion, deletion, or seeding methods', () => {
      const prototype = Object.getPrototypeOf(repository);
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (m) => m !== 'constructor',
      );

      const forbiddenPrefixes = [
        'insert',
        'create',
        'update',
        'delete',
        'remove',
        'save',
        'seed',
        'upsert',
        'drop',
      ];

      for (const method of methods) {
        for (const forbidden of forbiddenPrefixes) {
          expect(method.toLowerCase()).not.toContain(forbidden);
        }
      }
    });
  });
});
