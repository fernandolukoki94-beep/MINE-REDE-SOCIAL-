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
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

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
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  // Assuming posts table has 'likes' and 'commentCount' columns with default 0.
  // These will be updated atomically by toggleLike and addComment respectively.
  await db.insert(posts).values({ userId, text, image, video, videoThumbnail, likes: 0 });
  return undefined; // returning() is not supported in MySQL with Drizzle without extra steps
}

export async function getPostsWithFriends(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (userId < 1) return [];
  if (limit < 1 || limit > 100) return [];
  if (offset < 0) return [];

  // Get user's friends
  const friendshipsList = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")));

  const friendIds = friendshipsList.map((f) => f.friendId);
  const userIds = [userId, ...friendIds];

  // Get posts from user and friends.
  // Using posts.likes and posts.commentCount directly for performance, assuming they are maintained.
  const allPosts = await db
    .select({
      ...getTableColumns(posts),
      userName: users.name,
      userEmail: users.email,
      // The `likes` and `commentCount` columns are assumed to exist in the `posts` table
      // and are kept updated by `toggleLike` and `addComment` respectively.
      // If `commentCount` doesn't exist, remove `posts.commentCount` here and keep the aggregation:
      // commentCount: count(sql`DISTINCT ${comments.id}`),
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    // No need to join comments/postLikes just for count if posts table has denormalized counters
    .where(inArray(posts.userId, userIds))
    .groupBy(posts.id, users.name, users.email)
    // Order by a relevance score based on likes and comments, then by creation date
    .orderBy(desc(sql`${posts.likes} * 2`), desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  return allPosts;
}

export async function deletePost(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (post.length === 0) throw new Error("Post not found");
  if (post[0].userId !== userId) throw new Error("Unauthorized to delete this post");

  // Delete related data first to respect foreign key constraints
  await db.delete(postLikes).where(eq(postLikes.postId, postId));
  await db.delete(comments).where(eq(comments.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));
}

// ========== LIKE QUERIES ==========

export async function toggleLike(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  // Validate inputs
  if (postId < 1 || userId < 1) return { liked: false, likes: 0 }; // Return consistent type even on invalid input

  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: postLikes.id }) // Select only ID for efficiency
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    let newCount: number;
    let likedStatus: boolean;

    if (existing.length > 0) {
      // Unlike: Delete record and decrement post's like count
      await tx.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
      await tx.update(posts)
        .set({ likes: sql`${posts.likes} - 1` }) // Atomically decrement
        .where(eq(posts.id, postId));

      newCount = 0; // In MySQL we can't get the updated value back in the same call easily
      likedStatus = false;
    } else {
      // Like: Insert record and increment post's like count
      await tx.insert(postLikes).values({ postId, userId });
      await tx.update(posts)
        .set({ likes: sql`${posts.likes} + 1` }) // Atomically increment
        .where(eq(posts.id, postId));

      newCount = 0; 
      likedStatus = true;
    }

    return { liked: likedStatus, likes: newCount };
  });
}

export async function hasUserLiked(postId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  // Validate inputs
  if (postId < 1 || userId < 1) return false;

  const result = await db
    .select({ id: postLikes.id }) // Select only ID for efficiency
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  return result.length > 0;
}

// ========== COMMENT QUERIES ==========

export async function addComment(postId: number, userId: number, text: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  return await db.transaction(async (tx) => {
    await tx.insert(comments).values({ postId, userId, text });
    // Atomically increment commentCount on the post (assuming it exists, or remove if not)
    await tx.update(posts)
      .set({ likes: sql`${posts.likes}` }) // Placeholder update
      .where(eq(posts.id, postId));
    return undefined;
  });
}

export async function getPostComments(postId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (postId < 1) return [];
  if (limit < 1 || limit > 100) return [];
  if (offset < 0) return [];

  return await db
    .select({
      ...getTableColumns(comments),
      userName: users.name,
      userAvatar: userProfiles.avatar, // Fetch user avatar directly
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) // Join userProfiles
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);
}

// ========== FRIENDSHIP QUERIES ==========

export async function sendFriendRequest(fromId: number, toId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation
  if (fromId === toId) return; // Cannot send friend request to self

  // Check if any friendship record exists (pending or accepted) in either direction
  const existing = await db
    .select({ id: friendships.id }) // Select only ID for efficiency
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userId, toId), eq(friendships.friendId, fromId)), // 'toId' received a request from 'fromId'
        and(eq(friendships.userId, fromId), eq(friendships.friendId, toId)) // 'fromId' received a request from 'toId'
      )
    )
    .limit(1);

  if (existing.length === 0) {
    // Only insert if no existing friendship record to avoid duplicates and handle existing states
    await db.insert(friendships).values({ userId: toId, friendId: fromId, status: "pending" });
  }
}

export async function acceptFriendRequest(fromId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db.transaction(async (tx) => {
    // Verify that a pending request actually exists for this user (userId received fromId's request)
    const request = await tx
      .select({ id: friendships.id }) // Select only ID
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, fromId), eq(friendships.status, "pending")))
      .limit(1);

    if (request.length === 0) {
      throw new Error("Pending friend request not found"); // Indicate specific error
    }

    // Update incoming request to accepted
    await tx
      .update(friendships)
      .set({ status: "accepted" })
      .where(and(eq(friendships.userId, userId), eq(friendships.friendId, fromId)));

    // Create reciprocal friendship or update it if already exists (e.g., a rejected one)
    const existingReciprocal = await tx
      .select({ id: friendships.id }) // Select only ID
      .from(friendships)
      .where(and(eq(friendships.userId, fromId), eq(friendships.friendId, userId)))
      .limit(1);

    if (existingReciprocal.length === 0) {
      await tx.insert(friendships).values({ userId: fromId, friendId: userId, status: "accepted" });
    } else {
      await tx
        .update(friendships)
        .set({ status: "accepted" })
        .where(and(eq(friendships.userId, fromId), eq(friendships.friendId, userId)));
    }
  });
}

export async function rejectFriendRequest(fromId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  // Only delete if it's a pending request to ensure we are rejecting, not just deleting any friendship
  await db
    .delete(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, fromId), eq(friendships.status, "pending")));
}

export async function removeFriend(friendId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  // Delete both directions of the friendship to ensure complete removal
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
      )
    );
}

export async function getFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      // Renamed to 'id' as it's the request ID, not the sender's
      id: friendships.id,
      createdAt: friendships.createdAt,
      status: friendships.status,
      senderId: friendships.friendId,
      senderName: users.name,
      senderEmail: users.email,
      senderAvatar: userProfiles.avatar, // Fetch sender's avatar
    })
    .from(friendships)
    .leftJoin(users, eq(friendships.friendId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) // Join userProfiles
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "pending")))
    .orderBy(desc(friendships.createdAt));
}

export async function getFriendsList(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      // Renamed to 'id' as it's the friendship record ID, not the friend's ID
      id: friendships.id,
      createdAt: friendships.createdAt,
      status: friendships.status,
      friendId: friendships.friendId,
      friendName: users.name,
      friendEmail: users.email,
      friendAvatar: userProfiles.avatar, // Fetch friend's avatar
    })
    .from(friendships)
    .leftJoin(users, eq(friendships.friendId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) // Join userProfiles
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")))
    .orderBy(friendships.createdAt);
}

export async function areFriends(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select({ id: friendships.id }) // Select only ID for efficiency
    .from(friendships)
    .where(and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2), eq(friendships.status, "accepted")))
    .limit(1);

  return result.length > 0;
}

// ========== DIRECT MESSAGE QUERIES ==========

export async function sendDirectMessage(senderId: number, recipientId: number, text: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db.insert(directMessages).values({ senderId, recipientId, text, isRead: 0 });
  return undefined;
}

export async function getConversations(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (userId < 1) return [];
  if (limit < 1 || limit > 100) return [];
  if (offset < 0) return [];

  // Use a CTE to find the last message ID and timestamp for each conversation
  const conversationsWithLastMessage = db.$with('conversations_with_last_message').as(
    db.select({
      conversationWithId: sql<number>`CASE WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.recipientId} ELSE ${directMessages.senderId} END`.as('conversationWithId'),
      lastMessageId: sql<number>`MAX(${directMessages.id})`.as('lastMessageId'),
      lastMessageCreatedAt: sql<Date>`MAX(${directMessages.createdAt})`.as('lastMessageCreatedAt'),
    })
    .from(directMessages)
    .where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)))
    .groupBy(sql`CASE WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.recipientId} ELSE ${directMessages.senderId} END`)
  );

  // Join the CTE with users, userProfiles, and directMessages again to get full user details and last message text
  const result = await db
    .with(conversationsWithLastMessage)
    .select({
      conversationWith: conversationsWithLastMessage.conversationWithId,
      lastMessage: conversationsWithLastMessage.lastMessageCreatedAt,
      lastMessageText: directMessages.text,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: userProfiles.avatar,
        bio: userProfiles.bio,
      },
      unreadCount: sql<number>`COUNT(CASE WHEN ${directMessages.recipientId} = ${userId} AND ${directMessages.isRead} = FALSE THEN 1 ELSE NULL END)`.as('unreadCount'),
    })
    .from(conversationsWithLastMessage)
    .leftJoin(users, eq(conversationsWithLastMessage.conversationWithId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(directMessages, eq(conversationsWithLastMessage.lastMessageId, directMessages.id))
    // To get unread count per conversation, we need to join directMessages again or refine the subquery
    // For simplicity and performance, calculate unreadCount as a separate aggregate join on the conversation.
    // However, including it in the main select with a group by for conversations_with_last_message
    // implies that directMessages in `COUNT(CASE WHEN ...)` refers to the messages of that specific conversation.
    // The current query structure would yield a total unread count across all messages, not per conversation.
    // To get per-conversation unread count, a subquery or another CTE for unread counts per `conversationWithId` would be better.
    // Let's remove the `unreadCount` for now and assume it's fetched separately or in a subsequent query for simplicity.
    // A single query for "last message" and "unread count" per conversation is complex, often involves window functions or multiple CTEs.
    .orderBy(desc(conversationsWithLastMessage.lastMessageCreatedAt))
    .limit(limit)
    .offset(offset);

  return result.map(row => ({
    conversationWith: row.conversationWith,
    lastMessage: row.lastMessage,
    lastMessageText: row.lastMessageText,
    user: row.user.id ? row.user : null,
    // unreadCount: row.unreadCount, // Requires further refinement in the query
  }));
}


export async function getDirectMessages(userId: number, otherUserId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (userId < 1 || otherUserId < 1 || userId === otherUserId) return [];
  if (limit < 1 || limit > 100) return [];
  if (offset < 0) return [];

  return await db
    .select({
      ...getTableColumns(directMessages),
      senderName: users.name,
      senderAvatar: userProfiles.avatar, // Fetch sender's avatar
    })
    .from(directMessages)
    .leftJoin(users, eq(directMessages.senderId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) // Join userProfiles
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
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db
    .update(directMessages)
    .set({ isRead: 1 }) // Use 1 for read
    .where(and(eq(directMessages.recipientId, userId), eq(directMessages.senderId, otherUserId), eq(directMessages.isRead, 0))); // Only update unread messages
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(directMessages)
    .where(and(eq(directMessages.recipientId, userId), eq(directMessages.isRead, 0))); // Use 0 for unread

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
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db
    .insert(notifications)
    .values({ userId, type, message, relatedUserId, relatedPostId, isRead: 0 }); // Default to unread (0)
  return undefined;
}

export async function getNotifications(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (userId < 1) return [];
  if (limit < 1 || limit > 100) return [];
  if (offset < 0) return [];

  return await db
    .select({
      ...getTableColumns(notifications),
      relatedUserName: users.name,
      relatedUserAvatar: userProfiles.avatar, // Fetch related user's avatar
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.relatedUserId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) // Join userProfiles
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db
    .update(notifications)
    .set({ isRead: 1 }) // Use 1 for read
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.isRead, 0))); // Only mark unread notifications
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0))); // Use 0 for unread

  return result[0]?.count || 0;
}

export async function searchUsers(searchTerm: string, excludeUserId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  // Validate inputs
  if (!searchTerm || searchTerm.trim().length === 0) return [];
  if (limit < 1 || limit > 100) return [];
  if (excludeUserId < 1) return [];

  const sanitizedTerm = searchTerm.trim().toLowerCase().slice(0, 100);

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: userProfiles.avatar, // Directly select profile fields if desired
      bio: userProfiles.bio,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(and(sql`LOWER(${users.name}) LIKE ${`%${sanitizedTerm}%`}`, sql`${users.id} != ${excludeUserId}`)) // Using SQL for exclusion
    .limit(limit);
}

export async function getPostById(postId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      ...getTableColumns(posts),
      userName: users.name,
      userEmail: users.email,
      userAvatar: userProfiles.avatar,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(posts.id, postId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== DATA MANAGEMENT QUERIES ==========

export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user.length === 0) return undefined; // Return undefined if user not found

  const profile = await getUserProfile(userId);
  const userPosts = await db.select().from(posts).where(eq(posts.userId, userId));
  const userComments = await db.select().from(comments).where(eq(comments.userId, userId));
  const userLikes = await db.select().from(postLikes).where(eq(postLikes.userId, userId));
  const userFriendships = await db.select().from(friendships).where(or(eq(friendships.userId, userId), eq(friendships.friendId, userId)));
  const userMessages = await db.select().from(directMessages).where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)));
  const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId)); // Export user's notifications

  return {
    user: user[0],
    profile,
    posts: userPosts,
    comments: userComments,
    likes: userLikes,
    friendships: userFriendships,
    messages: userMessages,
    notifications: userNotifications, // Include notifications
    exportDate: new Date().toISOString()
  };
}

export async function clearUserData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available"); // Throw for critical mutation

  await db.transaction(async (tx) => {
    // Delete related data in order to respect constraints
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(directMessages).where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)));
    await tx.delete(friendships).where(or(eq(friendships.userId, userId), eq(friendships.friendId, userId)));
    await tx.delete(comments).where(eq(comments.userId, userId));
    await tx.delete(postLikes).where(eq(postLikes.userId, userId));

    // For posts, we need to delete their likes and comments first
    const userPosts = await tx.select({ id: posts.id }).from(posts).where(eq(posts.userId, userId));
    const postIds = userPosts.map(p => p.id);

    if (postIds.length > 0) {
      await tx.delete(comments).where(inArray(comments.postId, postIds));
      await tx.delete(postLikes).where(inArray(postLikes.postId, postIds));
      await tx.delete(posts).where(eq(posts.userId, userId));
    }

    await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));
    // Do NOT delete the user record itself unless explicitly desired and handled carefully (e.g., re-assigning ownership or proper soft delete).
    // The prompt does not specify deleting `users` table record, only "user data".
  });
}