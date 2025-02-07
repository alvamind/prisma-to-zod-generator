import { zodSchema } from "../../zod/.s/Zod.zod.ts";
const roleSchema = z.any();
const postSchema = z.any();
export const userSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string().optional().nullable(),
    role: roleSchema,
    posts: z.array(postSchema)
});
