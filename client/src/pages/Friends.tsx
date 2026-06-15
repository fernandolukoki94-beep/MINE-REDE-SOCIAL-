import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Check, Search, UserMinus, UserPlus, X } from "lucide-react";
import { useState } from "react";

export default function Friends() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch friend requests
  const { data: friendRequests = [] } = trpc.friends.requests.useQuery();

  // Fetch friends list
  const { data: friendsList = [] } = trpc.friends.list.useQuery();

  // Search users
  const { data: searchResults = [] } = trpc.friends.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  // Send friend request mutation
  const sendRequestMutation = trpc.friends.sendRequest.useMutation({
    onSuccess: () => {
      trpc.useUtils().friends.search.invalidate();
    },
  });

  // Accept friend request mutation
  const acceptMutation = trpc.friends.accept.useMutation({
    onSuccess: () => {
      trpc.useUtils().friends.requests.invalidate();
      trpc.useUtils().friends.list.invalidate();
    },
  });

  // Reject friend request mutation
  const rejectMutation = trpc.friends.reject.useMutation({
    onSuccess: () => {
      trpc.useUtils().friends.requests.invalidate();
    },
  });

  // Remove friend mutation
  const removeMutation = trpc.friends.remove.useMutation({
    onSuccess: () => {
      trpc.useUtils().friends.list.invalidate();
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Amigos</h1>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">
            Amigos ({friendsList.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Pedidos ({friendRequests.length})
          </TabsTrigger>
          <TabsTrigger value="search">Procurar</TabsTrigger>
        </TabsList>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          {friendsList.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Sem amigos ainda. Procura utilizadores!</p>
            </Card>
          ) : (
            friendsList.map((friend: any) => (
              <Card key={friend.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{friend.friendName}</p>
                  <p className="text-sm text-gray-500">{friend.friendEmail}</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeMutation.mutate({ friendId: friend.friendId })}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Friend Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {friendRequests.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Sem pedidos de amizade</p>
            </Card>
          ) : (
            friendRequests.map((request: any) => (
              <Card key={request.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{request.senderName}</p>
                  <p className="text-sm text-gray-500">{request.senderEmail}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate({ fromUserId: request.senderId })}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate({ fromUserId: request.senderId })}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Procura utilizadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {searchQuery.length > 0 && (
            <div className="space-y-4">
              {searchResults.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum utilizador encontrado</p>
                </Card>
              ) : (
                searchResults.map((result: any) => (
                  <Card key={result.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{result.name}</p>
                      <p className="text-sm text-gray-500">{result.email}</p>
                      {result.profile?.bio && (
                        <p className="text-sm text-gray-600 mt-1">{result.profile.bio}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendRequestMutation.mutate({ toUserId: result.id })}
                      disabled={sendRequestMutation.isPending}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Import Bell icon
import { Bell } from "lucide-react";
