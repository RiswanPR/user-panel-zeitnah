import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { Course } from './schemas/course.schema';
import { User } from '../auth/schemas/user.schema';
import { ActiveStream } from './schemas/active-stream.schema';
import { CourseEnquiry } from './schemas/course-enquiry.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { HlsService } from './hls.service';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getModelToken(Course.name),
          useValue: {},
        },
        {
          provide: getModelToken(User.name),
          useValue: {},
        },
        {
          provide: getModelToken(ActiveStream.name),
          useValue: {},
        },
        {
          provide: getModelToken(CourseEnquiry.name),
          useValue: {},
        },
        {
          provide: SignedUrlService,
          useValue: {},
        },
        {
          provide: HlsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
