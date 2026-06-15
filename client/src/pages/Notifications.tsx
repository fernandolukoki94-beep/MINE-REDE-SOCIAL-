import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, Check, Heart, MessageCircle, UserPlus } from "lucide-react";
import { useState } from "react";

export default function Notifications() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);

  // Fetch notifications
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({
    limit: 20,
    offset,
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      trpc.useUtils().notifications.list.invalidate();
      trpc.useUtils().notifications.unreadCount.invalidate();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "friend_request":
      case "friend_accepted":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "message":
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like":
        return "bg-red-50";
      case "comment":
        return "bg-blue-50";
      case "friend_request":
      case "friend_accepted":
        return "bg-green-50";
      case "message":
        return "bg-purple-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notificações
        </h1>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">A carregar notificações...</div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Sem notificações</p>
          </Card>
        ) : (
          notifications.map((notification: any) => (
            <Card
              key={notification.id}
              className={`p-4 flex items-start gap-4 cursor-pointer hover:shadow-md transition ${
                !notification.isRead ? getNotificationColor(notification.type) : ""
              }`}
              onClick={() => {
                if (!notification.isRead) {
                  markAsReadMutation.mutate({ notificationId: notification.id });
                }
              }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>

              {/* Content */}
              <div className="flex-1">
                <p className="font-semibold text-sm">{notification.relatedUserName}</p>
                <p className="text-sm text-gray-700">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>

              {/* Status */}
              {!notification.isRead && (
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
              )}

              {notification.isRead && (
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {notifications.length > 0 && notifications.length % 20 === 0 && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => setOffset((prev) => prev + 20)}
          >
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
