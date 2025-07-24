import { Post } from 'generated/prisma';

/**
 * Post data from database
 */
export type PostData = Post;

/**
 * Partial post data for select queries
 */
export interface PostSelectData {
  id: string;
  title: string;
  authorId: string;
  content: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination information for post lists
 */
export interface PostPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

/**
 * Response interface for paginated posts list
 */
export interface GetPostsResponse {
  data: PostData[];
  pagination: PostPagination;
}

/**
 * Parameters interface for getting posts
 */
export interface GetPostsParams {
  page?: number;
  limit?: number;
  userId: string;
  authorId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isPublic?: boolean;
}

/**
 * Response interface for post deletion
 */
export interface DeletePostResponse {
  message: string;
}

/**
 * Response interface for post visibility update
 */
export interface UpdatePostVisibilityResponse {
  id: string;
  isPublic: boolean;
  updatedAt: Date;
}
