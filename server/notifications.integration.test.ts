import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as queries from "./queries";

// Mock queries to avoid real DB dependency in unit/integration tests
vi.mock("./queries", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  createNotification: vi.fn(),
  getPostById: vi.fn(),
  toggleLike: vi.fn(),
  addComment: vi.fn(),
}));

function createAuthContext(userId: number = 1) {
  const user = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };

  return { ctx };
}

describe("Notifications Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a notification when a post is liked", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    // Mock toggleLike to return liked: true
    vi.mocked(queries.toggleLike).mockResolvedValue({ liked: true });
    // Mock getPostById to return a post owned by another user (ID 2)
    vi.mocked(queries.getPostById).mockResolvedValue({
      id: 100,
      userId: 2,
      text: "Hello world",
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      image: null,
      video: null,
      videoThumbnail: null
    });

    await caller.posts.like({ postId: 100 });

    // Verify notification was created for the post owner (ID 2)
    expect(queries.createNotification).toHaveBeenCalledWith(
      2,
      "like",
      expect.stringContaining("User 1 gostou do seu post"),
      1,
      100
    );
  });

  it("should create a notification when a comment is added", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(queries.addComment).mockResolvedValue({ id: 1 } as any);
    vi.mocked(queries.getPostById).mockResolvedValue({
      id: 100,
      userId: 2,
      text: "Hello world",
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      image: null,
      video: null,
      videoThumbnail: null
    });

    await caller.posts.addComment({ postId: 100, text: "Nice post!" });

    // Verify notification was created for the post owner (ID 2)
    expect(queries.createNotification).toHaveBeenCalledWith(
      2,
      "comment",
      expect.stringContaining("User 1 comentou no seu post"),
      1,
      100
    );
  });

  it("should not create a notification if the user likes their own post", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(queries.toggleLike).mockResolvedValue({ liked: true });
    vi.mocked(queries.getPostById).mockResolvedValue({
      id: 100,
      userId: 1, // Same as ctx.user.id
      text: "My own post",
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      image: null,
      video: null,
      videoThumbnail: null
    });

    await caller.posts.like({ postId: 100 });

    // Verify createNotification was NOT called
    expect(queries.createNotification).not.toHaveBeenCalled();
  });
});
