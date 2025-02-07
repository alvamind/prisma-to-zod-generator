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
export const userCreateInputSchema = userSchema.omit({ "id": true }).and(userSchema.pick({ "email": true, "role": true, "posts": true }));
export const userUpdateInputSchema = userSchema.partial();
