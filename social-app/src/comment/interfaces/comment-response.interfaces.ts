import { Comment } from 'generated/prisma';

/**
 * Comment data from database
 */
export type CommentData = Comment;

/**
 * Pagination information for comment lists
 */
export interface CommentPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

/**
 * Response interface for paginated comments list
 */
export interface GetCommentsResponse {
  data: CommentData[];
  pagination: CommentPagination;
}

/**
 * Parameters interface for getting comments
 */
export interface GetCommentsParams {
  page?: number;
  limit?: number;
  postId?: string;
  authorId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response interface for comment deletion
 */
export interface DeleteCommentResponse {
  message: string;
}
