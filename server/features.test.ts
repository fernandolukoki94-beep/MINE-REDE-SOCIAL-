import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { PostService, FriendshipService, MessageService } from "./services";
import * as queries from "./queries";
import * as cache from "./cache";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, userName: string = `User ${userId}`): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: userName,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// Mock services to isolate router logic
vi.mock("./services", () => ({
  PostService: {
    createPost: vi.fn(),
    toggleLike: vi.fn(),
    addComment: vi.fn(),
  },
  FriendshipService: {
    sendRequest: vi.fn(),
    acceptRequest: vi.fn(),
  },
  MessageService: {
    sendMessage: vi.fn(),
  },
}));

// Mock queries that are still directly called by routers
vi.mock("./queries", () => ({
  getPostsWithFriends: vi.fn(),
  hasUserLiked: vi.fn(),
  deletePost: vi.fn(),
  getPostComments: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  rejectFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  getFriendRequests: vi.fn(),
  getFriendsList: vi.fn(),
  searchUsers: vi.fn(),
  getConversations: vi.fn(),
  getDirectMessages: vi.fn(),
  markMessagesAsRead: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  exportUserData: vi.fn(),
  clearUserData: vi.fn(),
}));

// Mock cache functions
vi.mock("./cache", () => ({
  getCachedFeed: vi.fn(),
  setCachedFeed: vi.fn(),
  invalidateFeedCache: vi.fn(),
  incrementLikeCounter: vi.fn(),
}));

describe("Posts Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call PostService.createPost when creating a post", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);
    const postData = { text: "My new post" };
    vi.mocked(PostService.createPost).mockResolvedValueOnce({ success: true });

    const result = await caller.posts.create(postData);
    expect(PostService.createPost).toHaveBeenCalledWith(ctx.user.id, postData);
    expect(result).toEqual({ success: true });
  });

  it("should call PostService.toggleLike when liking a post", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);
    const postId = 123;
    vi.mocked(PostService.toggleLike).mockResolvedValueOnce({ liked: true, likes: 1 });

    const result = await caller.posts.like({ postId });
    expect(PostService.toggleLike).toHaveBeenCalledWith(postId, ctx.user.id, ctx.user.name);
    expect(result).toEqual({ liked: true, likes: 1 });
  });

  it("should call PostService.addComment when adding a comment", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);
    const postId = 123;
    const commentText = "Great post!";
    vi.mocked(PostService.addComment).mockResolvedValueOnce({ success: true });

    const result = await caller.posts.addComment({ postId, text: commentText });
    expect(PostService.addComment).toHaveBeenCalledWith(postId, ctx.user.id, ctx.user.name, commentText);
    expect(result).toEqual({ success: true });
  });

  it("should fetch feed posts", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(cache.getCachedFeed).mockResolvedValueOnce(null);
    vi.mocked(queries.getPostsWithFriends).mockResolvedValueOnce([]);
    vi.mocked(queries.hasUserLiked).mockResolvedValueOnce(false);
    vi.mocked(cache.setCachedFeed).mockResolvedValueOnce(undefined);

    const result = await caller.posts.feed({ limit: 10, offset: 0 });
    expect(queries.getPostsWithFriends).toHaveBeenCalledWith(ctx.user.id, 10, 0);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should delete a post", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.deletePost).mockResolvedValueOnce(undefined);

    const result = await caller.posts.delete({ postId: 1 });
    expect(queries.deletePost).toHaveBeenCalledWith(1, ctx.user.id);
    expect(result).toEqual({ success: true });
  });
});

describe("Friends Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call FriendshipService.sendRequest when sending a friend request", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);
    const toUserId = 2;
    vi.mocked(FriendshipService.sendRequest).mockResolvedValueOnce({ success: true });

    const result = await caller.friends.sendRequest({ toUserId });
    expect(FriendshipService.sendRequest).toHaveBeenCalledWith(ctx.user.id, toUserId, ctx.user.name);
    expect(result).toEqual({ success: true });
  });

  it("should call FriendshipService.acceptRequest when accepting a friend request", async () => {
    const { ctx } = createAuthContext(2, "Test User 2");
    const caller = appRouter.createCaller(ctx);
    const fromUserId = 1;
    vi.mocked(FriendshipService.acceptRequest).mockResolvedValueOnce({ success: true });

    const result = await caller.friends.accept({ fromUserId });
    expect(FriendshipService.acceptRequest).toHaveBeenCalledWith(fromUserId, ctx.user.id, ctx.user.name);
    expect(result).toEqual({ success: true });
  });

  it("should reject a friend request", async () => {
    const { ctx } = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.rejectFriendRequest).mockResolvedValueOnce(undefined);

    const result = await caller.friends.reject({ fromUserId: 1 });
    expect(queries.rejectFriendRequest).toHaveBeenCalledWith(1, ctx.user.id);
    expect(result).toEqual({ success: true });
  });

  it("should remove a friend", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.removeFriend).mockResolvedValueOnce(undefined);

    const result = await caller.friends.remove({ friendId: 2 });
    expect(queries.removeFriend).toHaveBeenCalledWith(2, ctx.user.id);
    expect(result).toEqual({ success: true });
  });

  it("should fetch friend requests", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getFriendRequests).mockResolvedValueOnce([]);

    const result = await caller.friends.requests();
    expect(queries.getFriendRequests).toHaveBeenCalledWith(ctx.user.id);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should fetch friends list", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getFriendsList).mockResolvedValueOnce([]);

    const result = await caller.friends.list();
    expect(queries.getFriendsList).toHaveBeenCalledWith(ctx.user.id);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should search users", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.searchUsers).mockResolvedValueOnce([]);

    const result = await caller.friends.search({ query: "test" });
    expect(queries.searchUsers).toHaveBeenCalledWith("test", ctx.user.id, 10);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Messages Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call MessageService.sendMessage when sending a message", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);
    const recipientId = 2;
    const messageText = "Hello friend!";
    vi.mocked(MessageService.sendMessage).mockResolvedValueOnce({ success: true });

    const result = await caller.messages.send({ recipientId, text: messageText });
    expect(MessageService.sendMessage).toHaveBeenCalledWith(ctx.user.id, ctx.user.name, recipientId, messageText);
    expect(result).toEqual({ success: true });
  });

  it("should fetch conversations", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getConversations).mockResolvedValueOnce([]);

    const result = await caller.messages.conversations();
    expect(queries.getConversations).toHaveBeenCalledWith(ctx.user.id);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should fetch message history and mark as read", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getDirectMessages).mockResolvedValueOnce([]);
    vi.mocked(queries.markMessagesAsRead).mockResolvedValueOnce(undefined);

    const result = await caller.messages.history({ otherUserId: 2, limit: 10, offset: 0 });
    expect(queries.getDirectMessages).toHaveBeenCalledWith(ctx.user.id, 2, 10, 0);
    expect(queries.markMessagesAsRead).toHaveBeenCalledWith(ctx.user.id, 2);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should fetch unread message count", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getUnreadMessageCount).mockResolvedValueOnce(5);

    const result = await caller.messages.unreadCount();
    expect(queries.getUnreadMessageCount).toHaveBeenCalledWith(ctx.user.id);
    expect(result).toBe(5);
  });
});

describe("Notifications Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch notifications", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getNotifications).mockResolvedValueOnce([]);

    const result = await caller.notifications.list({ limit: 10, offset: 0 });
    expect(queries.getNotifications).toHaveBeenCalledWith(ctx.user.id, 10, 0);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should mark notification as read", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.markNotificationAsRead).mockResolvedValueOnce(undefined);

    const result = await caller.notifications.markAsRead({ notificationId: 1 });
    expect(queries.markNotificationAsRead).toHaveBeenCalledWith(1, ctx.user.id);
    expect(result).toEqual({ success: true });
  });

  it("should fetch unread notification count", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.getUnreadNotificationCount).mockResolvedValueOnce(3);

    const result = await caller.notifications.unreadCount();
    expect(queries.getUnreadNotificationCount).toHaveBeenCalledWith(ctx.user.id);
    expect(result).toBe(3);
  });
});

describe("Data Management Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export user data", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const mockExportData = { user: { id: 1, name: "Test User" } };
    vi.mocked(queries.exportUserData).mockResolvedValueOnce(mockExportData);

    const result = await caller.data.export();
    expect(queries.exportUserData).toHaveBeenCalledWith(ctx.user.id);
    expect(result).toEqual(mockExportData);
  });

  it("should clear user data", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(queries.clearUserData).mockResolvedValueOnce(undefined);

    const result = await caller.data.clear();
    expect(queries.clearUserData).toHaveBeenCalledWith(ctx.user.id);
    expect(result).toEqual({ success: true });
  });
});
