import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Sparkles, MessageSquare, Flame } from 'lucide-react';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types/domain';

interface NotificationsPopoverProps {
  onSelectStoryId?: (storyId: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  onSelectStoryId,
}) => {
  const { firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      firebaseUser.uid,
      (data) => setNotifications(data),
      (err) => console.warn('[Notifications] Stream error:', err),
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id).catch(console.warn);
    }
    if (notif.contentId && onSelectStoryId) {
      onSelectStoryId(notif.contentId);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.allSettled(unread.map((n) => markNotificationAsRead(n.id)));
  };

  const formatTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#12141A] hover:bg-[#181B22] border border-[#232734] text-[#8B949E] hover:text-[#F0F3F6] transition"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#12141A] border border-[#232734] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Popover Header */}
          <div className="p-3.5 bg-[#0F1015] border-b border-[#232734] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-[#F0F3F6]">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#FF5A1F]/20 text-[#FF5A1F] text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-[#8B949E] hover:text-[#FF5A1F] transition flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#232734]/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8B949E]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const icon =
                  notif.type === 'creator_content' || notif.type === 'article' ? (
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  ) : notif.type === 'chat' ? (
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                  );

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-[#181B22] cursor-pointer transition flex items-start gap-3 ${
                      !notif.isRead ? 'bg-[#FF5A1F]/5' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-[#0F1015] border border-[#232734] shrink-0 mt-0.5">
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5 className="text-xs font-bold text-[#F0F3F6] truncate">
                          {notif.title}
                        </h5>
                        <span className="text-[10px] text-[#8B949E] shrink-0">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B949E] line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#FF5A1F] shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
