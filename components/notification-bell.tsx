"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Bell, Info, MessageSquare, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

const ICONS: Record<AppNotification["type"], typeof Bell> = {
  swap_request: ArrowRightLeft,
  message: MessageSquare,
  rating: Star,
  system: Info,
};

interface NotificationBellProps {
  profileId: string;
  initialUnreadCount: number;
}

export function NotificationBell({ profileId, initialUnreadCount }: NotificationBellProps) {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && notifications === null) {
      setLoading(true);
      const list = await listNotifications(supabase, profileId);
      setNotifications(list);
      setLoading(false);
    }
  }

  function handleNotificationClick(notification: AppNotification) {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev ? prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)) : prev
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(supabase, notification.id).catch(() => {});
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, isRead: true })) : prev));
    setUnreadCount(0);
    await markAllNotificationsRead(supabase, profileId);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">Loading...</div>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {notifications.map((notification) => {
                  const Icon = ICONS[notification.type];
                  const content = (
                    <div
                      className={cn(
                        "flex gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent/50",
                        !notification.isRead && "bg-accent/30"
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {notification.body && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      )}
                    </div>
                  );

                  return (
                    <li key={notification.id}>
                      {notification.link ? (
                        <Link href={notification.link} onClick={() => handleNotificationClick(notification)}>
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
