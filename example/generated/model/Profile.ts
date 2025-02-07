import { User } from './User';
export type ProfileCreateInput = Omit<Profile, 'id'> & Required<Pick<Profile, 'userId' | 'user' | 'createdAt' | 'updatedAt'>>;

export type ProfilePartial = Partial<Profile>;

export interface Profile {
  id: number;
  bio?: string | null;
  userId: number;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

export type ProfileUpdateInput = Partial<Profile>;
