import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (user) {
      // Create socket connection
      const newSocket = io({
        path: "/api/socket.io",
      });

      newSocket.on("connect", () => {
        setConnected(true);
        console.log("Socket connected");
        // Authenticate the socket securely (server will verify session cookie)
        newSocket.emit("authenticate");
      });

      newSocket.on("disconnect", () => {
        setConnected(false);
        console.log("Socket disconnected");
      });

      // Handle global notifications
      newSocket.on("notification", (data: { type: string; message: string }) => {
        toast(data.message, {
          description: "Nova notificação recebida",
          action: {
            label: "Ver",
            onClick: () => window.location.href = "/notifications",
          },
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
