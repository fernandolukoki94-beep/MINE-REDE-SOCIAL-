/**
 * Business Logic Services
 * Decouples business logic from tRPC handlers for better testability and reusability
 */

import { TRPCError } from "@trpc/server";
import * as queries from "./queries";
import { emitToUser } from "./socket";
import * as cache from "./cache";

export const PostService = {
  async createPost(userId: number, data: { text: string; image?: string; video?: string; videoThumbnail?: string }) {
    const result = await queries.createPost(userId, data.text, data.image, data.video, data.videoThumbnail);
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create post" });
    
    // Invalidate feed cache for the user and their friends
    await cache.invalidateFeedCache(userId);
    const friends = await queries.getFriendsList(userId);
    for (const friend of friends) {
      await cache.invalidateFeedCache(friend.friendId);
    }

    return { success: true };
  },

  async toggleLike(postId: number, userId: number, userName: string) {
    const result = await queries.toggleLike(postId, userId);
    
    // Update like counter in cache for faster retrieval
    if (result.liked) {
      await cache.incrementLikeCounter(postId);
    }

    if (result.liked) {
      const postData = await queries.getPostById(postId);
      if (postData && postData.userId !== userId) {
        const notification = await queries.createNotification(
          postData.userId,
          "like",
          `${userName} gostou do seu post`,
          userId,
          postId
        );
        if (notification) {
          emitToUser(postData.userId, "notification", {
            type: "like",
            message: `${userName} gostou do seu post`,
            relatedUserId: userId,
            relatedPostId: postId,
          });
        }
      }
    }
    return result;
  },

  async addComment(postId: number, userId: number, userName: string, text: string) {
    const result = await queries.addComment(postId, userId, text);
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add comment" });

    const postData = await queries.getPostById(postId);
    if (postData && postData.userId !== userId) {
      const notification = await queries.createNotification(
        postData.userId,
        "comment",
        `${userName} comentou no seu post`,
        userId,
        postId
      );
      if (notification) {
        emitToUser(postData.userId, "notification", {
          type: "comment",
          message: `${userName} comentou no seu post`,
          relatedUserId: userId,
          relatedPostId: postId,
        });
      }
    }
    return { success: true };
  }
};

export const FriendshipService = {
  async sendRequest(fromId: number, toId: number, fromName: string) {
    if (fromId === toId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot send friend request to yourself" });
    }

    await queries.sendFriendRequest(fromId, toId);
    
    const notification = await queries.createNotification(
      toId,
      "friend_request",
      `${fromName} enviou um pedido de amizade`,
      fromId
    );
    
    if (notification) {
      emitToUser(toId, "notification", {
        type: "friend_request",
        message: `${fromName} enviou um pedido de amizade`,
        relatedUserId: fromId,
      });
    }
    return { success: true };
  },

  async acceptRequest(fromUserId: number, userId: number, userName: string) {
    await queries.acceptFriendRequest(fromUserId, userId);
    
    const notification = await queries.createNotification(
      fromUserId,
      "friend_accepted",
      `${userName} aceitou seu pedido de amizade`,
      userId
    );
    
    if (notification) {
      emitToUser(fromUserId, "notification", {
        type: "friend_accepted",
        message: `${userName} aceitou seu pedido de amizade`,
        relatedUserId: userId,
      });
    }
    return { success: true };
  }
};

export const MessageService = {
  async sendMessage(senderId: number, senderName: string, recipientId: number, text: string) {
    const isFriend = await queries.areFriends(senderId, recipientId);
    if (!isFriend) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only message friends" });
    }

    await queries.sendDirectMessage(senderId, recipientId, text);

    const notification = await queries.createNotification(
      recipientId,
      "message",
      `${senderName} enviou uma mensagem`,
      senderId
    );
    
    emitToUser(recipientId, "new_message", {
      senderId,
      text,
      createdAt: new Date().toISOString(),
    });
    
    if (notification) {
      emitToUser(recipientId, "notification", {
        type: "message",
        message: `${senderName} enviou uma mensagem`,
        relatedUserId: senderId,
      });
    }
    return { success: true };
  }
};
