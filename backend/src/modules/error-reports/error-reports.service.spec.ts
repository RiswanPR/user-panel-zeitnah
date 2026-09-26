import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ErrorReportsService } from './error-reports.service';
import { ErrorReport } from './schemas/error-report.schema';

describe('ErrorReportsService', () => {
  let service: ErrorReportsService;
  let mockErrorReportModel: any;

  beforeEach(async () => {
    mockErrorReportModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue(true),
    }));

    mockErrorReportModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    });
    mockErrorReportModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockErrorReportModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ status: 'resolved' }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorReportsService,
        {
          provide: getModelToken(ErrorReport.name),
          useValue: mockErrorReportModel,
        },
      ],
    }).compile();

    service = module.get<ErrorReportsService>(ErrorReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save a non-critical error report with valid userId and isSilent=true', async () => {
    const validId = new Types.ObjectId().toHexString();
    const result = await service.create(
      {
        source: 'console_error',
        priority: 'low',
        isSilent: true,
        error: {
          name: 'TypeError',
          message: 'Non-critical background calculation issue',
        },
      },
      validId,
    );

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(mockErrorReportModel).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'console_error',
        priority: 'low',
        isSilent: true,
        userId: expect.any(Types.ObjectId),
      }),
    );
  });

  it('should sanitize secrets like token, password, otp before saving to DB', async () => {
    await service.create({
      source: 'network_error',
      token: 'secret-token-123',
      password: 'my-super-secret-password',
      otp: '987654',
      error: { message: 'Network failed' },
    });

    expect(mockErrorReportModel).toHaveBeenCalledWith(
      expect.objectContaining({
        token: '[REDACTED]',
        password: '[REDACTED]',
        otp: '[REDACTED]',
      }),
    );
  });

  it('should gracefully handle placeholder string "Unknown" for userId without throwing CastError', async () => {
    const result = await service.create(
      {
        source: 'unhandled_rejection',
        authentication: { userId: 'Unknown' },
        error: { message: 'Promise rejection' },
      },
      'Unknown',
    );

    expect(result.success).toBe(true);
    expect(mockErrorReportModel).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined,
      }),
    );
  });

  it('should list error reports with pagination', async () => {
    const list = await service.findAll({ page: 1, limit: 10 });
    expect(list.data).toBeDefined();
    expect(list.page).toBe(1);
    expect(list.limit).toBe(10);
  });
});
