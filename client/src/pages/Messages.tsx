import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";

export default function Messages() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");

  // Fetch conversations
  const { data: conversations = [] } = trpc.messages.conversations.useQuery();

  // Fetch message history
  const { data: messages = [] } = trpc.messages.history.useQuery(
    { otherUserId: selectedConversation || 0, limit: 50, offset: 0 },
    { enabled: !!selectedConversation }
  );

  // Fetch unread count
  const { data: unreadData } = trpc.messages.unreadCount.useQuery();

  // Send message mutation
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      // Refresh messages
      utils.messages.history.invalidate();
      utils.messages.conversations.invalidate();
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    await sendMessageMutation.mutateAsync({
      recipientId: selectedConversation,
      text: messageText,
    });
  };

  const selectedConversationData = conversations.find((c: any) => c.conversationWith === selectedConversation);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations List */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold">Mensagens</h2>
            {unreadData && unreadData.count > 0 && (
              <p className="text-sm text-gray-500">{unreadData.count} não lidas</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Sem conversas</div>
            ) : (
              conversations.map((conv: any) => (
                <button
                  key={conv.conversationWith}
                  onClick={() => setSelectedConversation(conv.conversationWith)}
                  className={`w-full p-4 border-b text-left hover:bg-gray-50 transition ${
                    selectedConversation === conv.conversationWith ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <p className="font-semibold text-sm">{conv.user?.name || "Utilizador"}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(conv.lastMessage).toLocaleDateString("pt-PT")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 border rounded-lg flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold">{selectedConversationData?.user?.name || "Utilizador"}</h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">Sem mensagens</div>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.senderId === user?.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Escreve uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Seleciona uma conversa para começar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
