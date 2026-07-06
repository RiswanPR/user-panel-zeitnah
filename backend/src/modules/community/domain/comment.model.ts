export interface IComment {
  id: string;
  postId: string;
  authorId: string;
  
  parentId?: string; // For nested replies
  
  content: string;
  mentions: string[];
  
  stats: {
    likes: number;
    replies: number;
  };

  isPinned: boolean;
  isInstructorHighlight: boolean;
  isMentorHighlight: boolean;
  
  isEdited: boolean;
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
