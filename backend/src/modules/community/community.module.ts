import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schemas/post.schema';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Story, StorySchema } from './schemas/story.schema';
import { MongoPostRepository } from './repositories/mongo-post.repository';
import { MongoCommentRepository } from './repositories/mongo-comment.repository';
import { MongoStoryRepository } from './repositories/mongo-story.repository';
import { PostController } from './controllers/post.controller';
import { PostService } from './services/post.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Story.name, schema: StorySchema },
    ]),
  ],
  controllers: [PostController],
  providers: [
    {
      provide: 'IPostRepository',
      useClass: MongoPostRepository,
    },
    {
      provide: 'ICommentRepository',
      useClass: MongoCommentRepository,
    },
    {
      provide: 'IStoryRepository',
      useClass: MongoStoryRepository,
    },
    PostService,
  ],
  exports: [PostService],
})
export class CommunityModule {}
