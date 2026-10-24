import { z } from "zod";
import { EMOJIS, LIMITS } from "@/lib/constants";

const name = z.string().trim().min(1, "Add your name.").max(LIMITS.name, "That name is too long.");
const email = z.string().trim().email("Enter a valid email.").max(120);
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer.");

export const registerSchema = z
  .object({
    name,
    email,
    password,
    inviteCode: z.string().trim().max(40).optional().or(z.literal("")),
    familyName: z.string().trim().max(LIMITS.familyName).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const code = value.inviteCode?.trim() || "";
    const family = value.familyName?.trim() || "";
    if (!code && family.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name the circle, or enter an invite code.",
        path: ["familyName"],
      });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const familySchema = z.object({
  name: z.string().trim().min(2, "Name the circle.").max(LIMITS.familyName, "That name is too long."),
});

export const inviteSchema = z.object({
  inviteCode: z.string().trim().min(4, "Enter the invite code.").max(40),
});

export const switchSchema = z.object({
  familyId: z.string().trim().min(1),
});

export const liveSchema = z.object({
  title: z.string().trim().min(1, "Give the live a title.").max(LIMITS.liveTitle, "That title is too long."),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment.").max(1000, "That comment is too long."),
  parentId: z.string().trim().min(1).optional(),
});

export const shareSchema = z.object({
  body: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const reactionSchema = z.object({
  emoji: z.enum(EMOJIS),
});

export const chatSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(LIMITS.chat, "That message is too long."),
});

export const settingsSchema = z.object({
  name,
  bio: z.string().trim().max(LIMITS.bio, "Keep the bio short.").default(""),
  newPassword: z.string().max(72).optional().or(z.literal("")),
  currentPassword: z.string().max(72).optional().or(z.literal("")),
});
