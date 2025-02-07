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
