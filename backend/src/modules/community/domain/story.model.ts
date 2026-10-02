export enum StoryType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  ACHIEVEMENT = 'ACHIEVEMENT',
  CERTIFICATE = 'CERTIFICATE',
}

export interface IStory {
  id: string;
  authorId: string;

  type: StoryType;

  mediaUrl?: string;
  thumbnailUrl?: string;
  backgroundColor?: string;
  text?: string;

  link?: string; // Optional swipe up / click link
  courseTag?: string; // Tagged course ID

  stats: {
    views: number;
    reactions: number;
    replies: number;
  };

  isPinned: boolean; // Pinned by admin/mentor
  expiresAt: Date; // Typically 24 hours from creation

  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}
