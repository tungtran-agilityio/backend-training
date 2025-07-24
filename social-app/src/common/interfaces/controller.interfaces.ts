// Common entity interfaces for controllers
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UserEntity extends BaseEntity {
  email: string;
}

export interface PostEntity extends BaseEntity {
  authorId: string;
  title: string;
  content: string;
  isPublic: boolean;
}

export interface CommentEntity extends BaseEntity {
  authorId: string;
  postId: string;
  content: string;
}
