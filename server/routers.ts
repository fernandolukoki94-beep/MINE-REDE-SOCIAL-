import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dataRouter, friendsRouter, messagesRouter, notificationsRouter, postsRouter, profileRouter } from "./features";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { getUserByOpenId, upsertUser } from "./db";
import { sdk } from "./_core/sdk";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(20).trim(),
        password: z.string().min(6).max(128),
        name: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validate username format (alphanumeric and underscore only)
        if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Username can only contain letters, numbers, and underscores" });
        }
        const existingUser = await getUserByOpenId(input.username);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "User already exists" });
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        await upsertUser({
          openId: input.username, // Using username as openId for local auth
          name: input.name || input.username,
          passwordHash,
          loginMethod: "local",
        });

        const token = await sdk.createSessionToken(input.username, { name: input.name || input.username });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true };
      }),
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1).max(20),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        // Trim input to prevent whitespace-only attacks
        const username = input.username.trim();
        const password = input.password.trim();
        
        if (!username || !password) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Username and password are required" });
        }
        const user = await getUserByOpenId(username);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        // 1. Try bcrypt (new system)
        if (user.passwordHash && user.passwordHash.startsWith("$2")) {
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
          }
        } 
        // 2. Fallback for users migrated from legacy system (if any)
        else if (user.passwordHash) {
          // This is a placeholder for legacy hash verification if needed
          // For now, we enforce bcrypt for all new logins
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Account requires password reset (Legacy hash)" });
        } else {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        const token = await sdk.createSessionToken(user.openId, { name: user.name || user.openId });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  posts: postsRouter,
  profile: profileRouter,
  friends: friendsRouter,
  messages: messagesRouter,
  notifications: notificationsRouter,
  data: dataRouter,
});

export type AppRouter = typeof appRouter;
