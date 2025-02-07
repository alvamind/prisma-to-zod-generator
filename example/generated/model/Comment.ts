import { User } from './User';
import { Post } from './Post';
export type CommentCreateInput = Omit<Comment, 'id'> & Required<Pick<Comment, 'text' | 'author' | 'authorId' | 'post' | 'postId' | 'createdAt' | 'updatedAt'>>;

export type CommentPartial = Partial<Comment>;

export interface Comment {
  id: number;
  text: string;
  // Comment author - corrected relation name
  author: User;
  authorId: number;
  post: Post;
  postId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentUpdateInput = Partial<Comment>;
