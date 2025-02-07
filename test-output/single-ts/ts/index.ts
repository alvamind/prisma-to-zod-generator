export type Role = 'USER' | 'ADMIN';
export interface User {
  id: number;
  email: string;
  name?: string | null;
  role: Role;
  posts: Post[];
}
export interface Post {
  id: number;
  title: string;
  content?: string | null;
  published: boolean;
  authorId: number;
  author: User;
}
