import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { sdk } from "./_core/sdk";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";

let io: SocketIOServer | null = null;

// Map to track connected users and their socket IDs
// userId -> Set of socketIds
const userSockets = new Map<number, Set<string>>();

export function setupSocketIO(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // In production, this should be restricted
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Secure authentication via session cookie
    socket.on("authenticate", async () => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return;

        const cookies = parseCookieHeader(cookieHeader);
        const sessionCookie = cookies[COOKIE_NAME];
        
        const session = await sdk.verifySession(sessionCookie);
        if (!session) return;

        // Sync user from DB to get the internal ID
        const user = await (await import("./db")).getUserByOpenId(session.openId);
        if (!user) return;

        const userId = user.id;
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId)?.add(socket.id);
        (socket as any).userId = userId;
        
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
        socket.emit("authenticated", { userId });
      } catch (error) {
        console.error("[Socket] Auth error:", error);
      }
    });

    socket.on("disconnect", () => {
      const userId = (socket as any).userId;
      if (userId && userSockets.has(userId)) {
        userSockets.get(userId)?.delete(socket.id);
        if (userSockets.get(userId)?.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitToUser(userId: number, event: string, data: any) {
  if (!io) return;
  
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach((socketId) => {
      io?.to(socketId).emit(event, data);
    });
  }
}

export function getIO() {
  return io;
}
