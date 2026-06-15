import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as queries from "./queries";

vi.mock("./queries", () => ({
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  getFriendRequests: vi.fn(),
  getFriendsList: vi.fn(),
  areFriends: vi.fn(),
  sendDirectMessage: vi.fn(),
  createNotification: vi.fn(),
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

describe("Friends & Interactions Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a friend request and notify the recipient", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    await caller.friends.sendRequest({ toUserId: 2 });

    expect(queries.sendFriendRequest).toHaveBeenCalledWith(1, 2);
    expect(queries.createNotification).toHaveBeenCalledWith(
      2,
      "friend_request",
      expect.stringContaining("User 1 enviou um pedido de amizade"),
      1
    );
  });

  it("should notify when a friend request is accepted", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    await caller.friends.accept({ fromUserId: 2 });

    expect(queries.acceptFriendRequest).toHaveBeenCalledWith(2, 1);
    expect(queries.createNotification).toHaveBeenCalledWith(
      2,
      "friend_accepted",
      expect.stringContaining("User 1 aceitou seu pedido de amizade"),
      1
    );
  });

  it("should allow sending messages only between friends", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    // Case 1: Not friends
    vi.mocked(queries.areFriends).mockResolvedValue(false);
    try {
      await caller.messages.send({ recipientId: 2, text: "Hi" });
      expect.fail("Should have thrown FORBIDDEN");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }

    // Case 2: Are friends
    vi.mocked(queries.areFriends).mockResolvedValue(true);
    await caller.messages.send({ recipientId: 2, text: "Hi friend!" });
    
    expect(queries.sendDirectMessage).toHaveBeenCalledWith(1, 2, "Hi friend!");
    expect(queries.createNotification).toHaveBeenCalledWith(
      2,
      "message",
      expect.stringContaining("User 1 enviou uma mensagem"),
      1
    );
  });
});
