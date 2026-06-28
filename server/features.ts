/**
 * tRPC Feature Routers
 * Implements all procedures for posts, friendships, DMs, and notifications
 * Refactored to use Service Layer for industrial scalability
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { fileTypeFromBuffer } from "file-type";
import * as queries from "./queries";
import { PostService, FriendshipService, MessageService } from "./services";
import * as cache from "./cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ========== POSTS ROUTER ==========

export const postsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        image: z.string().optional(),
        video: z.string().optional(),
        videoThumbnail: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await PostService.createPost(ctx.user.id, input);
    }),

  feed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Try cache first
        const cached = await cache.getCachedFeed(ctx.user.id, input.offset);
        if (cached) return cached;

        const posts = await queries.getPostsWithFriends(ctx.user.id, input.limit, input.offset);
        
        // Enrich posts with like status
        const enrichedPosts = await Promise.all(
          posts.map(async (post) => ({
            ...post,
            isLiked: await queries.hasUserLiked(post.id, ctx.user.id),
          }))
        );

        // Save to cache
        await cache.setCachedFeed(ctx.user.id, input.offset, enrichedPosts);

        return enrichedPosts;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch feed",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await queries.deletePost(input.postId, ctx.user.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete post",
        });
      }
    }),

  like: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await PostService.toggleLike(input.postId, ctx.user.id, ctx.user.name || "");
    }),

  comments: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        return await queries.getPostComments(input.postId, input.limit, input.offset);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments",
        });
      }
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        text: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await PostService.addComment(input.postId, ctx.user.id, ctx.user.name || "", input.text);
    }),

  uploadMedia: protectedProcedure
    .input(
      z.object({
        file: z.string(), // base64 encoded
        type: z.enum(["image", "video"]),
        filename: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const buffer = Buffer.from(input.file, "base64");
        
        if (buffer.length > MAX_FILE_SIZE) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File size exceeds 5MB limit" });
        }

        const type = await fileTypeFromBuffer(buffer);
        if (!type) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file type" });
        }

        const allowedImages = ["jpg", "png", "gif", "webp"];
        const allowedVideos = ["mp4", "webm", "mov"];

        if (input.type === "image" && !allowedImages.includes(type.ext)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image format" });
        }
        if (input.type === "video" && !allowedVideos.includes(type.ext)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid video format" });
        }

        const key = `posts/${ctx.user.id}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, type.mime);
        return { url, key };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload media",
        });
      }
    }),
});

// ========== PROFILE ROUTER ==========

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getUserProfile(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch profile",
      });
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        bio: z.string().max(500).optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await queries.updateUserProfile(ctx.user.id, input.bio || "", input.avatar || null);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),
});

// ========== FRIENDS ROUTER ==========

export const friendsRouter = router({
  sendRequest: protectedProcedure
    .input(z.object({ toUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await FriendshipService.sendRequest(ctx.user.id, input.toUserId, ctx.user.name || "");
    }),

  accept: protectedProcedure
    .input(z.object({ fromUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await FriendshipService.acceptRequest(input.fromUserId, ctx.user.id, ctx.user.name || "");
    }),

  reject: protectedProcedure
    .input(z.object({ fromUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await queries.rejectFriendRequest(input.fromUserId, ctx.user.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject friend request",
        });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await queries.removeFriend(input.friendId, ctx.user.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove friend",
        });
      }
    }),

  requests: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getFriendRequests(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch friend requests",
      });
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getFriendsList(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch friends list",
      });
    }
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await queries.searchUsers(input.query, ctx.user.id, 10);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search users",
        });
      }
    }),
});

// ========== DIRECT MESSAGES ROUTER ==========

export const messagesRouter = router({
  send: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        text: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await MessageService.sendMessage(ctx.user.id, ctx.user.name || "", input.recipientId, input.text);
    }),

  conversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getConversations(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch conversations",
      });
    }
  }),

  history: protectedProcedure
    .input(
      z.object({
        otherUserId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const messages = await queries.getDirectMessages(ctx.user.id, input.otherUserId, input.limit, input.offset);
        await queries.markMessagesAsRead(ctx.user.id, input.otherUserId);
        return messages;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch message history",
        });
      }
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getUnreadMessageCount(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch unread count",
      });
    }
  }),
});

// ========== NOTIFICATIONS ROUTER ==========

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await queries.getNotifications(ctx.user.id, input.limit, input.offset);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notifications",
        });
      }
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await queries.markNotificationAsRead(input.notificationId, ctx.user.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
        });
      }
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.getUnreadNotificationCount(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch unread notification count",
      });
    }
  }),
});

// ========== DATA MANAGEMENT ROUTER ==========

export const dataRouter = router({
  export: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await queries.exportUserData(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to export data",
      });
    }
  }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await queries.clearUserData(ctx.user.id);
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear data",
      });
    }
  }),
});
