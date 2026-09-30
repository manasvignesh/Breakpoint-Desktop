import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Sparkles, MessageSquare, Flame, Compass } from 'lucide-react';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types/domain';

export interface NotificationNavigationTarget {
  type: 'article' | 'chat' | 'knowledge' | 'brief';
  id?: string;
}

interface NotificationsPopoverProps {
  onSelectStoryId?: (storyId: string) => void;
  onNavigateTarget?: (target: NotificationNavigationTarget) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  onSelectStoryId,
  onNavigateTarget,
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
    setIsOpen(false);

    const type = (notif.contentType || notif.type || '').toLowerCase();
    const targetId = notif.contentId || notif.conversationId || undefined;

    if (type === 'chat' || type === 'conversation') {
      if (onNavigateTarget) {
        onNavigateTarget({ type: 'chat', id: targetId });
      }
      return;
    }

    if (type === 'trail' || type === 'knowledge' || type === 'concept') {
      if (onNavigateTarget) {
        onNavigateTarget({ type: 'knowledge', id: targetId });
      }
      return;
    }

    if (type === 'brief') {
      if (onNavigateTarget) {
        onNavigateTarget({ type: 'brief' });
      }
      return;
    }

    // Default: Article / Story Content
    if (targetId) {
      if (onNavigateTarget) {
        onNavigateTarget({ type: 'article', id: targetId });
      } else if (onSelectStoryId) {
        onSelectStoryId(targetId);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(notifications);
    } catch (err) {
      console.warn('[Notifications] Mark all read error:', err);
    }
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
                You are all caught up! No notifications.
              </div>
            ) : (
              notifications.map((notif) => {
                const type = (notif.contentType || notif.type || '').toLowerCase();
                const icon =
                  type === 'chat' || type === 'conversation' ? (
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  ) : type === 'trail' || type === 'knowledge' ? (
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  ) : type === 'creator_content' || type === 'article' ? (
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F]" />
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

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h5 className="text-xs font-bold text-[#F0F3F6] truncate">
                          {notif.actorName || notif.title}
                        </h5>
                        <span className="text-[10px] text-[#8B949E] shrink-0">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#C9D1D9] line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                      {notif.actorName && notif.title !== notif.actorName && (
                        <p className="text-[10px] text-[#8B949E] truncate">
                          {notif.title}
                        </p>
                      )}
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

