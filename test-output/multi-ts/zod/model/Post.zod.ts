import { zodSchema } from "../../zod/.s/Zod.zod.ts";
const userSchema = z.any();
export const postSchema = z.object({
    id: z.number(),
    title: z.string(),
    content: z.string().optional().nullable(),
    published: z.boolean(),
    authorId: z.number(),
    author: userSchema
});
export const postCreateInputSchema = postSchema.omit({ "id": true }).and(postSchema.pick({ "title": true, "published": true, "authorId": true, "author": true }));
export const postUpdateInputSchema = postSchema.partial();
