import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { HtmlSanitizerMiddleware } from './middlewares/html-sanitizer.middleware';

// Schemas
import {
  Post,
  PostSchema,
  PostMedia,
  PostMediaSchema,
  PostReaction,
  PostReactionSchema,
  Poll,
  PollSchema,
  PollOption,
  PollOptionSchema,
  PollVote,
  PollVoteSchema,
  SavedPost,
  SavedPostSchema,
} from './schemas/post.schema';
import {
  CommunityPublishIdempotency,
  CommunityPublishIdempotencySchema,
} from './schemas/idempotency.schema';
import {
  CommunityMediaJob,
  CommunityMediaJobSchema,
} from './schemas/media-job.schema';
import {
  CommunityMusic,
  CommunityMusicSchema,
} from './schemas/music.schema';
import {
  Comment,
  CommentSchema,
  CommentReaction,
  CommentReactionSchema,
} from './schemas/comment.schema';
import {
  Story,
  StorySchema,
  StoryMedia,
  StoryMediaSchema,
  StoryView,
  StoryViewSchema,
  StoryReaction,
  StoryReactionSchema,
  StoryReply,
  StoryReplySchema,
  StoryMention,
  StoryMentionSchema,
} from './schemas/story.schema';
import {
  Group,
  GroupSchema,
  GroupMember,
  GroupMemberSchema,
  Announcement,
  AnnouncementSchema,
} from './schemas/group.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  Tag,
  TagSchema,
  PostTag,
  PostTagSchema,
  Mention,
  MentionSchema,
  Hashtag,
  HashtagSchema,
  View,
  ViewSchema,
  Report,
  ReportSchema,
} from './schemas/metadata.schema';
import {
  CommunityProfile,
  CommunityProfileSchema,
  AchievementLog,
  AchievementLogSchema,
} from './schemas/profile.schema';
import {
  CommunityEvent,
  CommunityEventSchema,
  EventRsvp,
  EventRsvpSchema,
} from './schemas/event.schema';
import {
  ModerationLog,
  ModerationLogSchema,
} from './schemas/moderation-log.schema';

// Repositories
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { StoryRepository } from './repositories/mongo-story.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { CommunityGroupRepository } from './repositories/community-group.repository';

// Services
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { StoryService } from './services/story.service';
import { NotificationService } from './services/notification.service';
import { CommunityGroupService } from './services/community-group.service';
import { CommunityS3Service } from './services/community-s3.service';
import { CommunityIdempotencyService } from './services/community-idempotency.service';
import { CommunityGamificationService } from './services/community-gamification.service';
import { CommunityAIService } from './services/community-ai.service';
import { CommunityModerationService } from './services/community-moderation.service';
import { CommunityEventService } from './services/community-event.service';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityMediaJobService } from './services/community-media-job.service';
import { CommunityMusicService } from './services/community-music.service';
import { AwsModule } from '../../common/aws/aws.module';

// Controllers
import { PostController } from './controllers/post.controller';
import { CommentController } from './controllers/comment.controller';
import { StoryController } from './controllers/story.controller';
import { NotificationController } from './controllers/notification.controller';
import { CommunityGroupController } from './controllers/community-group.controller';
import { GamificationController } from './controllers/gamification.controller';
import { ModerationController } from './controllers/moderation.controller';
import { AIController } from './controllers/ai.controller';
import { CommunityUploadController } from './controllers/community-upload.controller';
import { CommunityMediaController } from './controllers/community-media.controller';
import { CommunityMusicController } from './controllers/community-music.controller';
import { CommunityStickerController } from './controllers/community-sticker.controller';
import { CommunityStickerService } from './services/community-sticker.service';

// Gateways
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    NotificationsModule,
    OrganizationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: PostMedia.name, schema: PostMediaSchema },
      { name: PostReaction.name, schema: PostReactionSchema },
      { name: Poll.name, schema: PollSchema },
      { name: PollOption.name, schema: PollOptionSchema },
      { name: PollVote.name, schema: PollVoteSchema },
      { name: SavedPost.name, schema: SavedPostSchema },

      { name: Comment.name, schema: CommentSchema },
      { name: CommentReaction.name, schema: CommentReactionSchema },

      { name: Story.name, schema: StorySchema },
      { name: StoryMedia.name, schema: StoryMediaSchema },
      { name: StoryView.name, schema: StoryViewSchema },
      { name: StoryReaction.name, schema: StoryReactionSchema },
      { name: StoryReply.name, schema: StoryReplySchema },
      { name: StoryMention.name, schema: StoryMentionSchema },

      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      { name: Announcement.name, schema: AnnouncementSchema },

      { name: Notification.name, schema: NotificationSchema },

      { name: Tag.name, schema: TagSchema },
      { name: PostTag.name, schema: PostTagSchema },
      { name: Mention.name, schema: MentionSchema },
      { name: Hashtag.name, schema: HashtagSchema },
      { name: View.name, schema: ViewSchema },
      { name: Report.name, schema: ReportSchema },

      { name: CommunityProfile.name, schema: CommunityProfileSchema },
      { name: AchievementLog.name, schema: AchievementLogSchema },
      { name: CommunityEvent.name, schema: CommunityEventSchema },
      { name: EventRsvp.name, schema: EventRsvpSchema },
      { name: ModerationLog.name, schema: ModerationLogSchema },
      {
        name: CommunityPublishIdempotency.name,
        schema: CommunityPublishIdempotencySchema,
      },
      {
        name: CommunityMediaJob.name,
        schema: CommunityMediaJobSchema,
      },
      {
        name: CommunityMusic.name,
        schema: CommunityMusicSchema,
      },
    ]),
    AwsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
  ],
  controllers: [
    PostController,
    CommentController,
    StoryController,
    NotificationController,
    CommunityGroupController,
    GamificationController,
    ModerationController,
    AIController,
    CommunityUploadController,
    CommunityMediaController,
    CommunityMusicController,
    CommunityStickerController,
  ],
  providers: [
    PostRepository,
    CommentRepository,
    StoryRepository,
    NotificationRepository,
    CommunityGroupRepository,

    PostService,
    CommentService,
    StoryService,
    NotificationService,
    CommunityGroupService,
    CommunityS3Service,
    CommunityIdempotencyService,
    CommunityGamificationService,
    CommunityAIService,
    CommunityModerationService,
    CommunityEventService,
    CommunityVideoProcessorService,
    CommunityMediaJobService,
    CommunityMusicService,
    CommunityStickerService,

    CommunityGateway,
  ],
  exports: [
    PostService,
    CommentService,
    StoryService,
    NotificationService,
    CommunityGroupService,
    CommunityS3Service,
    CommunityIdempotencyService,
    CommunityGamificationService,
    CommunityModerationService,
    CommunityEventService,
    CommunityVideoProcessorService,
    CommunityMediaJobService,
    CommunityMusicService,
    CommunityStickerService,
    CommunityGateway,
  ],
})
export class CommunityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HtmlSanitizerMiddleware)
      .forRoutes(PostController, CommentController, StoryController);
  }
}
