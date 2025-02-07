import { Role } from '../enum/Role';
import { Post } from './Post';
import { Comment } from './Comment';
import { Profile } from './Profile';
export type UserCreateInput = Omit<User, 'id'> & Required<Pick<User, 'email' | 'role' | 'posts' | 'comments' | 'invitedUsers' | 'createdAt' | 'updatedAt'>>;

export type UserPartial = Partial<User>;

export interface User {
  id: number;
  email: string;
  name?: string | null;
  // Enum example
  role: Role;
  // User writes Posts
  posts: Post[];
  // User writes Comments
  comments: Comment[];
  invitedBy?: User | null;
  invitedById?: number | null;
  invitedUsers: User[];
  // One-to-one relation
  profile?: Profile | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserUpdateInput = Partial<User>;
