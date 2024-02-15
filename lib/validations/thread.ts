import * as z from "zod";

export const ThreadValidation = z.object({
  thread: z.string().min(3, { message: "Minimum 3 characters" }).max(1000),
  accountId: z.string().nonempty(),
});

// every comment is a thread of its own
export const CommentValidation = z.object({
  thread: z.string().min(3, { message: "Minimum 3 characters" }).max(1000),
});
