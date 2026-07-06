import { IPost } from '../domain/post.model';
import { IComment } from '../domain/comment.model';
import { IStory } from '../domain/story.model';

export interface IPostRepository {
  create(post: Omit<IPost, 'id' | 'stats' | 'isPinned' | 'isEdited' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findFeed(params: {
    userId: string;
    courseIds: string[];
    limit: number;
    cursor?: string;
  }): Promise<{ items: IPost[]; nextCursor: string | null }>;
  
  updateStats(id: string, stat: keyof IPost['stats'], increment: number): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface ICommentRepository {
  create(comment: Omit<IComment, 'id' | 'stats' | 'isPinned' | 'isInstructorHighlight' | 'isMentorHighlight' | 'isEdited' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IComment>;
  findByPostId(postId: string, limit: number, cursor?: string): Promise<{ items: IComment[]; nextCursor: string | null }>;
  findReplies(parentId: string, limit: number, cursor?: string): Promise<{ items: IComment[]; nextCursor: string | null }>;
  
  updateStats(id: string, stat: keyof IComment['stats'], increment: number): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface IStoryRepository {
  create(story: Omit<IStory, 'id' | 'stats' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Promise<IStory>;
  findActiveStories(userIds: string[], courseIds: string[]): Promise<IStory[]>;
  softDelete(id: string): Promise<void>;
}
