/**
 * Database Query Helpers
 * Centralizes all database operations for posts, friendships, DMs, and notifications
 */

import { and, count, desc, eq, getTableColumns, inArray, or, sql } from "drizzle-orm";
import { comments, directMessages, friendships, notifications, postLikes, posts, userProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";

// ========== PROFILE QUERIES ==========

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, bio: string, avatar: string | null) {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set({ bio, avatar }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, bio, avatar });
  }
}

// ========== POST QUERIES ==========

export async function createPost(userId: number, text: string, image?: string, video?: string, videoThumbnail?: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(posts).values({ userId, text, image, video, videoThumbnail });
  return result;
}

export async function getPostsWithFriends(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Get user's friends
  const friendshipsList = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")));

  const friendIds = friendshipsList.map((f) => f.friendId);
  const userIds = [userId, ...friendIds];

  // Get posts from user and friends, ordered by relevance
  const allPosts = await db
    .select({
      ...getTableColumns(posts),
      userName: users.name,
      userEmail: users.email,
      commentCount: count(comments.id),
      likeCount: count(postLikes.id),
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .leftJoin(comments, eq(posts.id, comments.postId))
    .leftJoin(postLikes, eq(posts.id, postLikes.postId))
    .where(inArray(posts.userId, userIds))
    .groupBy(posts.id)
    .orderBy(desc(sql`(${posts.likes} * 2 + COUNT(DISTINCT ${comments.id}))`), desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  return allPosts;
}

export async function deletePost(postId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  // Verify ownership
  const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (post.length === 0 || post[0].userId !== userId) return;

  // Delete related data
  await db.delete(postLikes).where(eq(postLikes.postId, postId));
  await db.delete(comments).where(eq(comments.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));
}

// ========== LIKE QUERIES ==========

export async function toggleLike(postId: number, userId: number) {
  const db = await getDb();
  if (!db) return { liked: false };

  const existing = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Unlike
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    await db.update(posts).set({ likes: sql`${posts.likes} - 1` }).where(eq(posts.id, postId));
    return { liked: false };
  } else {
    // Like
    await db.insert(postLikes).values({ postId, userId });
    await db.update(posts).set({ likes: sql`${posts.likes} + 1` }).where(eq(posts.id, postId));
    return { liked: true };
  }
}

export async function hasUserLiked(postId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  return result.length > 0;
}

// ========== COMMENT QUERIES ==========

export async function addComment(postId: number, userId: number, text: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(comments).values({ postId, userId, text });
  return result;
}

export async function getPostComments(postId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(comments),
      userName: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);
}

// ========== FRIENDSHIP QUERIES ==========

export async function sendFriendRequest(fromId: number, toId: number) {
  const db = await getDb();
  if (!db) return;

  // Check if already friends or request exists
  const existing = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userId, toId), eq(friendships.friendId, fromId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(friendships).values({ userId: toId, friendId: fromId, status: "pending" });
  }
}

export async function acceptFriendRequest(fromId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  // Update incoming request to accepted
  await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, fromId)));

  // Create reciprocal friendship
  const existing = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userId, fromId), eq(friendships.friendId, userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(friendships).values({ userId: fromId, friendId: userId, status: "accepted" });
  } else {
    await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(and(eq(friendships.userId, fromId), eq(friendships.friendId, userId)));
  }
}

export async function rejectFriendRequest(fromId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, fromId)));
}

export async function removeFriend(friendId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)));

  await db
    .delete(friendships)
    .where(and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)));
}

export async function getFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(friendships),
      senderName: users.name,
      senderEmail: users.email,
      senderId: friendships.friendId,
    })
    .from(friendships)
    .leftJoin(users, eq(friendships.friendId, users.id))
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));
}

export async function getFriendsList(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(friendships),
      friendName: users.name,
      friendEmail: users.email,
      friendId: friendships.friendId,
    })
    .from(friendships)
    .leftJoin(users, eq(friendships.friendId, users.id))
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")))
    .orderBy(friendships.createdAt);
}

export async function areFriends(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2), eq(friendships.status, "accepted")))
    .limit(1);

  return result.length > 0;
}

// ========== DIRECT MESSAGE QUERIES ==========

export async function sendDirectMessage(senderId: number, recipientId: number, text: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(directMessages).values({ senderId, recipientId, text });
  return result;
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get unique conversations with last message info
  const conversations = await db
    .selectDistinct({
      conversationWith: sql`CASE WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.recipientId} ELSE ${directMessages.senderId} END`,
      lastMessage: sql`MAX(${directMessages.createdAt})`,
    })
    .from(directMessages)
    .where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)))
    .groupBy(sql`CASE WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.recipientId} ELSE ${directMessages.senderId} END`)
    .orderBy(desc(sql`MAX(${directMessages.createdAt})`));

  // Enrich with user info
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const conversationUserId = Number(conv.conversationWith);
      const user = await db.select().from(users).where(eq(users.id, conversationUserId)).limit(1);
      return {
        ...conv,
        user: user.length > 0 ? user[0] : null,
      };
    })
  );

  return enriched;
}

export async function getDirectMessages(userId: number, otherUserId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(directMessages),
      senderName: users.name,
    })
    .from(directMessages)
    .leftJoin(users, eq(directMessages.senderId, users.id))
    .where(
      or(
        and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, otherUserId)),
        and(eq(directMessages.senderId, otherUserId), eq(directMessages.recipientId, userId))
      )
    )
    .orderBy(desc(directMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markMessagesAsRead(userId: number, otherUserId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(directMessages)
    .set({ isRead: 1 })
    .where(and(eq(directMessages.recipientId, userId), eq(directMessages.senderId, otherUserId)));
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(directMessages)
    .where(and(eq(directMessages.recipientId, userId), eq(directMessages.isRead, 0)));

  return result[0]?.count || 0;
}

// ========== NOTIFICATION QUERIES ==========

export async function createNotification(
  userId: number,
  type: "like" | "comment" | "friend_request" | "friend_accepted" | "message",
  message: string,
  relatedUserId?: number,
  relatedPostId?: number
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .insert(notifications)
    .values({ userId, type, message, relatedUserId, relatedPostId });
  return result;
}

export async function getNotifications(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(notifications),
      relatedUserName: users.name,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.relatedUserId, users.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, notificationId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));

  return result[0]?.count || 0;
}

export async function searchUsers(searchTerm: string, excludeUserId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      ...getTableColumns(users),
      profile: getTableColumns(userProfiles),
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(and(sql`LOWER(${users.name}) LIKE LOWER(${`%${searchTerm}%`})`, sql`${users.id} != ${excludeUserId}`))
    .limit(limit);
}

export async function getPostById(postId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
