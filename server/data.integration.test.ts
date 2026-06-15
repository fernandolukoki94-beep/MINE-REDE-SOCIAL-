import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as queries from "./queries";

vi.mock("./queries", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  exportUserData: vi.fn(),
  clearUserData: vi.fn(),
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

describe("Profile & Data Management Integration", () => {
  it("should fetch and update user profile", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    const mockProfile = { id: 1, userId: 1, bio: "Old bio", avatar: null };
    vi.mocked(queries.getUserProfile).mockResolvedValue(mockProfile as any);

    const profile = await caller.profile.get();
    expect(profile).toEqual(mockProfile);

    await caller.profile.update({ bio: "New bio", avatar: "new-avatar-data" });
    expect(queries.updateUserProfile).toHaveBeenCalledWith(1, "New bio", "new-avatar-data");
  });

  it("should export user data bundle", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    const mockExport = { user: { id: 1 }, posts: [], messages: [] };
    vi.mocked(queries.exportUserData).mockResolvedValue(mockExport as any);

    const result = await caller.data.export();
    expect(result).toEqual(mockExport);
    expect(queries.exportUserData).toHaveBeenCalledWith(1);
  });

  it("should clear user data", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.data.clear();
    expect(result).toEqual({ success: true });
    expect(queries.clearUserData).toHaveBeenCalledWith(1);
  });
});
