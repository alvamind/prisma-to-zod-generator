import { zodSchema } from "../../zod/.s/Zod.zod.ts";
export const roleSchema = z.union([z.literal("USER"), z.literal("ADMIN")]);
