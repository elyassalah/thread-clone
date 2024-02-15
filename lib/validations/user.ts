import * as z from "zod";

// schema for validation the user data in the form 
export const UserValidation = z.object({
  // .url mean that type is url
  profile_photo: z.string().url().nonempty(),
  name: z.string().min(3 ,{message:"Min is 3 Char"}).max(30),
  username: z.string().min(3).max(30),
  bio: z.string().min(3).max(1000),
});
