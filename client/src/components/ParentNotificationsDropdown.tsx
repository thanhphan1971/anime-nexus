import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, CheckCheck, Coins, AlertTriangle, X, MessageSquare, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ParentNotification {
  id: string;
  type: 'PURCHASE_REQUEST' | 'PURCHASE_APPROVED' | 'PURCHASE_DECLINED' | 'PURCHASE_COMPLETED' | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    purchaseRequestId?: string;
    childId?: string;
    childName?: string;
    tokenAmount?: number;
    priceCents?: number;
    currency?: string;
  };
}

const notificationIcons = {
  PURCHASE_REQUEST: AlertTriangle,
  PURCHASE_APPROVED: Check,
  PURCHASE_DECLINED: X,
  PURCHASE_COMPLETED: Sparkles,
  SYSTEM: MessageSquare,
};

const notificationColors = {
  PURCHASE_REQUEST: "text-orange-400",
  PURCHASE_APPROVED: "text-green-400",
  PURCHASE_DECLINED: "text-red-400",
  PURCHASE_COMPLETED: "text-yellow-400",
  SYSTEM: "text-blue-400",
};

export default function ParentNotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<ParentNotification[]>({
    queryKey: ["/api/parent/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notifications/unread-count");
      if (!res.ok) throw new Error("Failed to fetch unread count");
      const data = await res.json();
      return data.count;
    },
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/parent/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/notifications/mark-all-read", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (notification: ParentNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-500 text-white border-0"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || MessageSquare;
                const colorClass = notificationColors[notification.type] || "text-blue-400";
                
                return (
                  <button
                    key={notification.id}
                    className={`w-full text-left p-4 hover:bg-white/5 transition-colors ${
                      !notification.isRead ? "bg-blue-500/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                        {notification.metadata?.tokenAmount && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-yellow-400">
                            <Coins className="h-3 w-3" />
                            <span>{notification.metadata.tokenAmount.toLocaleString()} tokens</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
