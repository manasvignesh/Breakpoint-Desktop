import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Bookmark,
  Zap,
  User as UserIcon,
  Flame,
  ShieldCheck,
  Search,
  MessageSquare,
  Compass,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import { NotificationsPopover, NotificationNavigationTarget } from './NotificationsPopover';
import { subscribeToConversations, Conversation } from '../services/chatService';

interface AppShellProps {
  children: React.ReactNode;
  activeNav: string;
  onNavChange: (nav: string) => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onOpenAuth: () => void;
  onSelectStoryId?: (storyId: string) => void;
  onNavigateTarget?: (target: NotificationNavigationTarget) => void;
  onSwitchToAdmin?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeCount?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav,
  onNavChange,
  currentLanguage,
  onLanguageChange,
  onOpenAuth,
  onSelectStoryId,
  onNavigateTarget,
  onSwitchToAdmin,
}) => {
  const { firebaseUser, userProfile, isAdmin, isEditor } = useAuth();
  const [totalChatUnread, setTotalChatUnread] = useState(0);

  // Subscribe to conversations to calculate total unread chat messages
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setTotalChatUnread(0);
      return;
    }
    const unsubscribe = subscribeToConversations(
      firebaseUser.uid,
      (convs: Conversation[]) => {
        const sum = convs.reduce((acc: number, c: Conversation) => acc + (c.unreadCounts[firebaseUser.uid] || 0), 0);
        setTotalChatUnread(sum);
      },
      (err: Error) => console.warn('[AppShell] Chat unread subscription error:', err)
    );
    return () => unsubscribe();
  }, [firebaseUser]);

  const navSections: NavSection[] = [
    {
      title: 'TODAY',
      items: [
        { id: 'brief', label: 'Daily Brief', icon: Sparkles, badge: 'Daily' },
        { id: 'feed', label: 'Discover Stream', icon: Newspaper },
        { id: 'todays-drop', label: "Today's Drops", icon: Flame },
      ],
    },
    {
      title: 'PERSONAL',
      items: [
        { id: 'search', label: 'Universal Search', icon: Search },
        { id: 'saved', label: 'Personal Library', icon: Bookmark },
        { id: 'chat', label: 'Direct Messages', icon: MessageSquare, badgeCount: totalChatUnread },
      ],
    },
    {
      title: 'UNDERSTAND',
      items: [
        { id: 'knowledge', label: 'Knowledge & Trails', icon: Compass },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B0E] text-[#F0F3F6] font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#232734] bg-[#0F1015] flex flex-col justify-between p-5 select-none shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Platform Badge */}
          <div
            className="flex items-center gap-3 px-2 cursor-pointer"
            onClick={() => onNavChange('feed')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#FF7A45] flex items-center justify-center shadow-lg shadow-[#FF5A1F]/20 shrink-0">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight font-display text-white">
                BREAKPOINT
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF5A1F] block -mt-1">
                Desktop Intel
              </span>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <div className="px-3 text-[10px] font-bold text-[#8B949E] tracking-widest uppercase font-mono">
                  {section.title}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavChange(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                            : 'text-[#8B949E] hover:text-[#F0F3F6] hover:bg-[#181B22]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && !isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5A1F]/20 text-[#FF5A1F] uppercase">
                            {item.badge}
                          </span>
                        )}

                        {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.badgeCount > 9 ? '9+' : item.badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Account / Profile & Admin Section */}
        <div className="pt-4 border-t border-[#232734] space-y-2.5">
          {(isAdmin || isEditor) && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 transition"
              title="Open Breakpoint Admin Workspace"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Breakpoint Admin</span>
              </div>
              <span className="text-[9px] bg-[#FF5A1F]/20 px-1.5 py-0.5 rounded">Switch</span>
            </button>
          )}

          <button
            onClick={onOpenAuth}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#12141A] hover:bg-[#181B22] border border-[#232734] transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 flex items-center justify-center text-xs font-bold text-[#FF5A1F] shrink-0">
              {firebaseUser ? (userProfile?.name || firebaseUser.email || 'U')[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#F0F3F6] truncate">
                {firebaseUser ? userProfile?.name || 'Reader' : 'Sign In'}
              </p>
              <p className="text-[10px] text-[#8B949E] truncate">
                {firebaseUser ? firebaseUser.email : 'Sync account & library'}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0B0E]">
        {/* Top Header */}
        <header className="h-16 border-b border-[#232734] bg-[#0F1015]/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold font-display text-white">
              {activeNav === 'brief' && 'Daily Brief · Canonical Finite Digest'}
              {activeNav === 'feed' && 'Technology & Engineering Discover Stream'}
              {activeNav === 'todays-drop' && "Today's Featured Drops"}
              {activeNav === 'search' && 'Universal Intelligence Search'}
              {activeNav === 'saved' && 'Personal Library & Saved Stories'}
              {activeNav === 'chat' && 'Direct Messages & Reader Network'}
              {activeNav === 'knowledge' && 'Knowledge Hub & Guided Trails'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {(isAdmin || isEditor) && onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#181B22] hover:bg-[#232734] text-[#8B949E] hover:text-[#F0F3F6] border border-[#232734] transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Breakpoint Admin</span>
              </button>
            )}

            <LanguageSelector
              currentLanguage={currentLanguage}
              onChange={onLanguageChange}
            />

            <NotificationsPopover
              onSelectStoryId={onSelectStoryId}
              onNavigateTarget={onNavigateTarget}
            />
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
