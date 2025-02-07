import { zodSchema } from "../zod/Zod.zod.ts";
import { tsSchema } from "../zod/Ts.zod.ts";
export const roleSchema = z.union([z.literal("USER"), z.literal("ADMIN")]);
export const userSchema: z.ZodSchema<User> = z.lazy(() => z.object({
    id: z.number(),
    email: z.string(),
    name: z.string().optional().nullable(),
    role: roleSchema,
    posts: z.array(postSchema)
}));
export const postSchema: z.ZodSchema<Post> = z.lazy(() => z.object({
    id: z.number(),
    title: z.string(),
    content: z.string().optional().nullable(),
    published: z.boolean(),
    authorId: z.number(),
    author: userSchema
}));
