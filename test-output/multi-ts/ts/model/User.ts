import { Role } from '../enum/Role';
import { Post } from './Post';
export interface User {
  id: number;
  email: string;
  name?: string | null;
  role: Role;
  posts: Post[];
}

export type UserCreateInput = Omit<User, 'id'> & Required<Pick<User, 'email' | 'role' | 'posts'>>;

export type UserUpdateInput = Partial<User>;
