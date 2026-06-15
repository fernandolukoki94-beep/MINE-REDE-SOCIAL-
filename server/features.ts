/**
 * tRPC Feature Routers
 * Implements all procedures for posts, friendships, DMs, and notifications
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  acceptFriendRequest,
  addComment,
  areFriends,
  createNotification,
  createPost,
  deletePost,
  getConversations,
  getDirectMessages,
  getFriendsList,
  getFriendRequests,
  getNotifications,
  getPostComments,
  getPostsWithFriends,
  getUnreadMessageCount,
  getUnreadNotificationCount,
  getUserProfile,
  hasUserLiked,
  markMessagesAsRead,
  markNotificationAsRead,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendDirectMessage,
  sendFriendRequest,
  toggleLike,
  updateUserProfile,
} from "./queries";

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
      try {
        const result = await createPost(ctx.user.id, input.text, input.image, input.video, input.videoThumbnail);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create post",
        });
      }
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
        const posts = await getPostsWithFriends(ctx.user.id, input.limit, input.offset);

        // Enrich posts with like status
        const enrichedPosts = await Promise.all(
          posts.map(async (post) => ({
            ...post,
            isLiked: await hasUserLiked(post.id, ctx.user.id),
          }))
        );

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
        await deletePost(input.postId, ctx.user.id);
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
      try {
        const result = await toggleLike(input.postId, ctx.user.id);

        // Create notification if liked - notify post owner
        if (result.liked) {
          // Get post owner ID from database
          const postData = await (await import('./queries')).getPostById(input.postId);
          if (postData && postData.userId !== ctx.user.id) {
            await createNotification(
              postData.userId,
              "like",
              `${ctx.user.name} gostou do seu post`,
              ctx.user.id,
              input.postId
            );
          }
        }

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle like",
        });
      }
    }),

  comments: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getPostComments(input.postId);
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
      try {
        const result = await addComment(input.postId, ctx.user.id, input.text);

        // Create notification - notify post owner
        const postData = await (await import('./queries')).getPostById(input.postId);
        if (postData && postData.userId !== ctx.user.id) {
          await createNotification(
            postData.userId,
            "comment",
            `${ctx.user.name} comentou no seu post`,
            ctx.user.id,
            input.postId
          );
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add comment",
        });
      }
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
        const key = `posts/${ctx.user.id}/${Date.now()}-${input.filename}`;
        const mimeType = input.type === "image" ? "image/jpeg" : "video/mp4";

        const { url } = await storagePut(key, buffer, mimeType);
        return { url, key };
      } catch (error) {
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
      return await getUserProfile(ctx.user.id);
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
        await updateUserProfile(ctx.user.id, input.bio || "", input.avatar || null);
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
      try {
        if (ctx.user.id === input.toUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot send friend request to yourself",
          });
        }

        await sendFriendRequest(ctx.user.id, input.toUserId);

        // Create notification
        await createNotification(
          input.toUserId,
          "friend_request",
          `${ctx.user.name} enviou um pedido de amizade`,
          ctx.user.id
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send friend request",
        });
      }
    }),

  accept: protectedProcedure
    .input(z.object({ fromUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await acceptFriendRequest(input.fromUserId, ctx.user.id);

        // Create notification
        await createNotification(
          input.fromUserId,
          "friend_accepted",
          `${ctx.user.name} aceitou seu pedido de amizade`,
          ctx.user.id
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept friend request",
        });
      }
    }),

  reject: protectedProcedure
    .input(z.object({ fromUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await rejectFriendRequest(input.fromUserId, ctx.user.id);
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
        await removeFriend(input.friendId, ctx.user.id);
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
      return await getFriendRequests(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch friend requests",
      });
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getFriendsList(ctx.user.id);
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
        return await searchUsers(input.query, ctx.user.id, 10);
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
      try {
        // Verify friendship
        const isFriend = await areFriends(ctx.user.id, input.recipientId);
        if (!isFriend) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only message friends",
          });
        }

        const result = await sendDirectMessage(ctx.user.id, input.recipientId, input.text);

        // Create notification
        await createNotification(
          input.recipientId,
          "message",
          `${ctx.user.name} enviou uma mensagem`,
          ctx.user.id
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
        });
      }
    }),

  conversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getConversations(ctx.user.id);
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
        const messages = await getDirectMessages(ctx.user.id, input.otherUserId, input.limit, input.offset);

        // Mark as read
        await markMessagesAsRead(ctx.user.id, input.otherUserId);

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
      const count = await getUnreadMessageCount(ctx.user.id);
      return { count };
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
        return await getNotifications(ctx.user.id, input.limit, input.offset);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notifications",
        });
      }
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await markNotificationAsRead(input.notificationId);
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
      const count = await getUnreadNotificationCount(ctx.user.id);
      return { count };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch unread count",
      });
    }
  }),
});

// ========== DATA MANAGEMENT ROUTER ==========

export const dataRouter = router({
  export: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const data = await (await import('./queries')).exportUserData(ctx.user.id);
      return data;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to export user data",
      });
    }
  }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await (await import('./queries')).clearUserData(ctx.user.id);
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear user data",
      });
    }
  }),
});
