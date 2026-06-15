/**
 * WebSocket Server with Socket.IO
 * Handles real-time notifications, messages, and presence
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createClient } from "redis";

let io: SocketIOServer;
let redisClient: ReturnType<typeof createClient>;

// User socket mapping
const userSockets = new Map<number, Set<string>>();

export async function initializeWebSocket(httpServer: HTTPServer) {
  // Initialize Socket.IO
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Initialize Redis client for pub/sub
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => console.error("Redis Client Error", err));
  await redisClient.connect();

  // Socket.IO connection handler
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins their personal room
    socket.on("user:join", (userId: number) => {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);

      console.log(`User ${userId} joined room ${userRoom}`);
    });

    // User leaves
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove from all user socket mappings
      userSockets.forEach((sockets, userId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
      })
    });

    // Handle typing indicators
    socket.on("typing:start", (data: { conversationId: number; userId: number }) => {
      const room = `conversation:${data.conversationId}`;
      socket.broadcast.to(room).emit("typing:indicator", {
        userId: data.userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data: { conversationId: number; userId: number }) => {
      const room = `conversation:${data.conversationId}`;
      socket.broadcast.to(room).emit("typing:indicator", {
        userId: data.userId,
        isTyping: false,
      });
    });

    // Join conversation room
    socket.on("conversation:join", (conversationId: number) => {
      const room = `conversation:${conversationId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on("conversation:leave", (conversationId: number) => {
      const room = `conversation:${conversationId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export async function emitNotification(
  userId: number,
  type: "like" | "comment" | "message" | "friend_request",
  data: any
) {
  const userRoom = `user:${userId}`;

  // Emit via Socket.IO (real-time)
  io.to(userRoom).emit("notification", {
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  // Also store in Redis for persistence (last 100 notifications per user)
  const key = `notifications:${userId}`;
  const notification = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

  try {
    await redisClient.lPush(key, notification);
    await redisClient.lTrim(key, 0, 99); // Keep only last 100
    await redisClient.expire(key, 30 * 24 * 60 * 60); // Expire after 30 days
  } catch (error) {
    console.error("Failed to store notification in Redis:", error);
  }
}

export async function emitDirectMessage(
  recipientId: number,
  senderId: number,
  message: string,
  messageId: number
) {
  const userRoom = `user:${recipientId}`;

  io.to(userRoom).emit("message:new", {
    id: messageId,
    senderId,
    text: message,
    timestamp: new Date().toISOString(),
  });
}

export async function broadcastPostUpdate(
  postId: number,
  type: "like" | "comment" | "delete",
  data: any
) {
  const room = `post:${postId}`;

  io.to(room).emit("post:update", {
    postId,
    type,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    await redisClient.connect();
  }
  return redisClient;
}

export async function closeWebSocket() {
  if (io) {
    io.close();
  }
  if (redisClient) {
    await redisClient.quit();
  }
}
