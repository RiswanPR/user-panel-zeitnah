export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  POLL = 'POLL',
}

export enum PostAudience {
  PUBLIC = 'PUBLIC', // Entire community
  COURSE = 'COURSE', // Specific course community
  BATCH = 'BATCH', // Specific batch
  PRIVATE = 'PRIVATE', // Specific mentor group or private
}

export interface IPostMedia {
  type: 'image' | 'video' | 'pdf' | 'document';
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  size?: number;
  fileName?: string;
}

export interface IPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface IPost {
  id: string; // UUID string
  authorId: string;

  content: string; // Rich text / markdown
  type: PostType;
  audience: PostAudience;
  courseId?: string; // If audience is COURSE
  batchId?: string; // If audience is BATCH

  media?: IPostMedia[];

  pollOptions?: IPollOption[];
  pollExpiresAt?: Date;

  hashtags: string[];
  mentions: string[]; // User IDs

  stats: {
    likes: number;
    loves: number;
    celebrates: number;
    insightfuls: number;
    comments: number;
    shares: number;
    views: number;
  };

  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
