import { User } from './User';
import { Comment } from './Comment';
export type PostCreateInput = Omit<Post, 'id'> & Required<Pick<Post, 'title' | 'author' | 'authorId' | 'comments' | 'createdAt' | 'updatedAt'>>;

export type PostPartial = Partial<Post>;

export interface Post {
  id: number;
  title: string;
  content?: string | null;
  // Post author
  author: User;
  authorId: number;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export type PostUpdateInput = Partial<Post>;
