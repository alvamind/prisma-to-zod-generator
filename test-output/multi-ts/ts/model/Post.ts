import { User } from './User';
export interface Post {
  id: number;
  title: string;
  content?: string | null;
  published: boolean;
  authorId: number;
  author: User;
}

export type PostCreateInput = Omit<Post, 'id'> & Required<Pick<Post, 'title' | 'published' | 'authorId' | 'author'>>;

export type PostUpdateInput = Partial<Post>;
