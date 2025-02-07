import { roleSchema } from '../enum/role.zod';
import { postSchema } from './post.zod';

// Generated by ts-to-zod
import { z } from "zod";
// @ts-ignore
export const userSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string().optional().nullable(),
    role: roleSchema,
    // @ts-ignore
  posts: z.array(z.lazy(() => postSchema))
});
export const userCreateInputSchema = userSchema.omit({ "id": true }).and(userSchema.pick({ "email": true, "role": true, "posts": true }));
export const userUpdateInputSchema = userSchema.partial();
