/**
 * Redis Cache Manager
 * Handles caching for feed, notifications, sessions, and counters
 */

import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initializeCache() {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => console.error("Redis Cache Error", err));
  await redisClient.connect();

  return redisClient;
}

export async function getRedisClient() {
  if (!redisClient) {
    await initializeCache();
  }
  return redisClient;
}

// Cache keys
const CACHE_KEYS = {
  feed: (userId: number, offset: number) => `feed:${userId}:${offset}`,
  notifications: (userId: number) => `notifications:${userId}`,
  userProfile: (userId: number) => `profile:${userId}`,
  friendsList: (userId: number) => `friends:${userId}`,
  postLikes: (postId: number) => `post:${postId}:likes`,
  postComments: (postId: number) => `post:${postId}:comments`,
  conversation: (userId1: number, userId2: number) => {
    const sorted = [userId1, userId2].sort();
    return `conversation:${sorted[0]}:${sorted[1]}`;
  },
};

// Cache TTLs (in seconds)
const CACHE_TTL = {
  feed: 5 * 60, // 5 minutes
  notifications: 10 * 60, // 10 minutes
  profile: 30 * 60, // 30 minutes
  friends: 15 * 60, // 15 minutes
  likes: 5 * 60, // 5 minutes
  comments: 5 * 60, // 5 minutes
  conversation: 10 * 60, // 10 minutes
};

/**
 * Get cached feed
 */
export async function getCachedFeed(userId: number, offset: number) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const key = CACHE_KEYS.feed(userId, offset);
    const cached = await client.get(key);

    if (cached) {
      console.log(`Cache hit: ${key}`);
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Set cached feed
 */
export async function setCachedFeed(userId: number, offset: number, data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = CACHE_KEYS.feed(userId, offset);

    await client.setEx(key, CACHE_TTL.feed, JSON.stringify(data));
    console.log(`Cache set: ${key}`);
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Invalidate feed cache for user
 */
export async function invalidateFeedCache(userId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return;

    // Invalidate all feed offsets for this user
    for (let offset = 0; offset < 1000; offset += 20) {
      const key = CACHE_KEYS.feed(userId, offset);
      await client.del(key);
    }

    console.log(`Invalidated feed cache for user ${userId}`);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Get cached notifications
 */
export async function getCachedNotifications(userId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const key = CACHE_KEYS.notifications(userId);
    const cached = await client.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Set cached notifications
 */
export async function setCachedNotifications(userId: number, data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = CACHE_KEYS.notifications(userId);

    await client.setEx(key, CACHE_TTL.notifications, JSON.stringify(data));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Invalidate notifications cache
 */
export async function invalidateNotificationsCache(userId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = CACHE_KEYS.notifications(userId);

    await client.del(key);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Get cached user profile
 */
export async function getCachedProfile(userId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const key = CACHE_KEYS.userProfile(userId);
    const cached = await client.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Set cached user profile
 */
export async function setCachedProfile(userId: number, data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = CACHE_KEYS.userProfile(userId);

    await client.setEx(key, CACHE_TTL.profile, JSON.stringify(data));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Increment like counter
 */
export async function incrementLikeCounter(postId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const key = CACHE_KEYS.postLikes(postId);

    const count = await client.incr(key);
    await client.expire(key, CACHE_TTL.likes);

    return count;
  } catch (error) {
    console.error("Cache increment error:", error);
    return null;
  }
}

/**
 * Get like counter
 */
export async function getLikeCounter(postId: number) {
  try {
    const client = await getRedisClient();
    if (!client) return 0;
    const key = CACHE_KEYS.postLikes(postId);

    const count = await client.get(key);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error("Cache get error:", error);
    return 0;
  }
}

/**
 * Close cache connection
 */
export async function closeCache() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null as any;
  }
}
