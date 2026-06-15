import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

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

    // Authentication could be handled here via handshake query or auth token
    socket.on("authenticate", (userId: number) => {
      if (!userId) return;
      
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)?.add(socket.id);
      (socket as any).userId = userId;
      
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
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
