import { describe, expect, it, vi, beforeEach } from "vitest";
import { PostService, FriendshipService, MessageService } from "./services";
import * as queries from "./queries";
import * as cache from "./cache";
import { TRPCError } from "@trpc/server";

// Mock all queries to isolate service logic
vi.mock("./queries", () => ({
  createPost: vi.fn(),
  toggleLike: vi.fn(),
  getPostById: vi.fn(),
  createNotification: vi.fn(),
  addComment: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  areFriends: vi.fn(),
  sendDirectMessage: vi.fn(),
  getFriendsList: vi.fn(),
}));

// Mock cache functions
vi.mock("./cache", () => ({
  invalidateFeedCache: vi.fn(),
  incrementLikeCounter: vi.fn(),
}));

// Mock socket.io emit
vi.mock("./socket", () => ({
  emitToUser: vi.fn(),
}));

describe("PostService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a post and invalidate feed cache", async () => {
    vi.mocked(queries.createPost).mockResolvedValueOnce({ insertId: 1 });
    vi.mocked(queries.getFriendsList).mockResolvedValueOnce([]);

    const userId = 1;
    const postData = { text: "Test post", image: "", video: "", videoThumbnail: "" };
    const result = await PostService.createPost(userId, postData);

    expect(queries.createPost).toHaveBeenCalledWith(userId, postData.text, postData.image, postData.video, postData.videoThumbnail);
    expect(cache.invalidateFeedCache).toHaveBeenCalledWith(userId);
    expect(result).toEqual({ success: true });
  });

  it("should throw TRPCError if post creation fails", async () => {
    vi.mocked(queries.createPost).mockResolvedValueOnce(undefined);

    const userId = 1;
    const postData = { text: "Test post" };
    await expect(PostService.createPost(userId, postData)).rejects.toThrow(TRPCError);
  });

  it("should toggle like, increment cache, and send notification", async () => {
    vi.mocked(queries.toggleLike).mockResolvedValueOnce({ liked: true, likes: 1 });
    vi.mocked(queries.getPostById).mockResolvedValueOnce({ userId: 2, id: 1, text: "", likes: 0, createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(queries.createNotification).mockResolvedValueOnce({ insertId: 1 });

    const postId = 1;
    const userId = 1;
    const userName = "Test User";
    const result = await PostService.toggleLike(postId, userId, userName);

    expect(queries.toggleLike).toHaveBeenCalledWith(postId, userId);
    expect(cache.incrementLikeCounter).toHaveBeenCalledWith(postId);
    expect(queries.getPostById).toHaveBeenCalledWith(postId);
    expect(queries.createNotification).toHaveBeenCalledWith(2, "like", `${userName} gostou do seu post`, userId, postId);
    expect(result).toEqual({ liked: true, likes: 1 });
  });

  it("should add a comment and send notification", async () => {
    vi.mocked(queries.addComment).mockResolvedValueOnce({ insertId: 1 });
    vi.mocked(queries.getPostById).mockResolvedValueOnce({ userId: 2, id: 1, text: "", likes: 0, createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(queries.createNotification).mockResolvedValueOnce({ insertId: 1 });

    const postId = 1;
    const userId = 1;
    const userName = "Test User";
    const text = "Great post!";
    const result = await PostService.addComment(postId, userId, userName, text);

    expect(queries.addComment).toHaveBeenCalledWith(postId, userId, text);
    expect(queries.getPostById).toHaveBeenCalledWith(postId);
    expect(queries.createNotification).toHaveBeenCalledWith(2, "comment", `${userName} comentou no seu post`, userId, postId);
    expect(result).toEqual({ success: true });
  });
});

describe("FriendshipService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a friend request and create notification", async () => {
    vi.mocked(queries.sendFriendRequest).mockResolvedValueOnce(undefined);
    vi.mocked(queries.createNotification).mockResolvedValueOnce({ insertId: 1 });

    const fromId = 1;
    const toId = 2;
    const fromName = "Sender";
    const result = await FriendshipService.sendRequest(fromId, toId, fromName);

    expect(queries.sendFriendRequest).toHaveBeenCalledWith(fromId, toId);
    expect(queries.createNotification).toHaveBeenCalledWith(toId, "friend_request", `${fromName} enviou um pedido de amizade`, fromId);
    expect(result).toEqual({ success: true });
  });

  it("should throw TRPCError if sending request to self", async () => {
    const fromId = 1;
    const toId = 1;
    const fromName = "Sender";
    await expect(FriendshipService.sendRequest(fromId, toId, fromName)).rejects.toThrow(TRPCError);
  });

  it("should accept a friend request and create notification", async () => {
    vi.mocked(queries.acceptFriendRequest).mockResolvedValueOnce(undefined);
    vi.mocked(queries.createNotification).mockResolvedValueOnce({ insertId: 1 });

    const fromId = 1;
    const userId = 2;
    const userName = "Acceptor";
    const result = await FriendshipService.acceptRequest(fromId, userId, userName);

    expect(queries.acceptFriendRequest).toHaveBeenCalledWith(fromId, userId);
    expect(queries.createNotification).toHaveBeenCalledWith(fromId, "friend_accepted", `${userName} aceitou seu pedido de amizade`, userId);
    expect(result).toEqual({ success: true });
  });
});

describe("MessageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a direct message and create notification", async () => {
    vi.mocked(queries.areFriends).mockResolvedValueOnce(true);
    vi.mocked(queries.sendDirectMessage).mockResolvedValueOnce({ insertId: 1 });
    vi.mocked(queries.createNotification).mockResolvedValueOnce({ insertId: 1 });

    const senderId = 1;
    const senderName = "Sender";
    const recipientId = 2;
    const text = "Hello!";
    const result = await MessageService.sendMessage(senderId, senderName, recipientId, text);

    expect(queries.areFriends).toHaveBeenCalledWith(senderId, recipientId);
    expect(queries.sendDirectMessage).toHaveBeenCalledWith(senderId, recipientId, text);
    expect(queries.createNotification).toHaveBeenCalledWith(recipientId, "message", `${senderName} enviou uma mensagem`, senderId);
    expect(result).toEqual({ success: true });
  });

  it("should throw TRPCError if not friends", async () => {
    vi.mocked(queries.areFriends).mockResolvedValueOnce(false);

    const senderId = 1;
    const senderName = "Sender";
    const recipientId = 2;
    const text = "Hello!";
    await expect(MessageService.sendMessage(senderId, senderName, recipientId, text)).rejects.toThrow(TRPCError);
  });
});
