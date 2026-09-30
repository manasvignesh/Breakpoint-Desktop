import React from 'react';
import {
  Newspaper,
  Bookmark,
  Zap,
  User as UserIcon,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import { NotificationsPopover } from './NotificationsPopover';

interface AppShellProps {
  children: React.ReactNode;
  activeNav: string;
  onNavChange: (nav: string) => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onOpenAuth: () => void;
  onSelectStoryId?: (storyId: string) => void;
  onSwitchToAdmin?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav,
  onNavChange,
  currentLanguage,
  onLanguageChange,
  onOpenAuth,
  onSelectStoryId,
  onSwitchToAdmin,
}) => {
  const { firebaseUser, userProfile, isAdmin, isEditor } = useAuth();

  const navItems = [
    { id: 'feed', label: 'Discover Feed', icon: Newspaper },
    { id: 'todays-drop', label: "Today's Drops", icon: Flame },
    { id: 'saved', label: 'Personal Library', icon: Bookmark },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B0E] text-[#F0F3F6] font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#232734] bg-[#0F1015] flex flex-col justify-between p-5 select-none shrink-0">
        <div className="space-y-6">
          {/* Logo & Platform Badge */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#FF7A45] flex items-center justify-center shadow-lg shadow-[#FF5A1F]/20">
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

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                      : 'text-[#8B949E] hover:text-[#F0F3F6] hover:bg-[#181B22]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account / Profile Section */}
        <div className="pt-4 border-t border-[#232734] space-y-2">
          {(isAdmin || isEditor) && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 transition"
              title="Open Breakpoint Admin Workspace"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Studio</span>
              </div>
              <span className="text-[10px] bg-[#FF5A1F]/20 px-1.5 py-0.5 rounded">Switch</span>
            </button>
          )}

          <button
            onClick={onOpenAuth}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#12141A] hover:bg-[#181B22] border border-[#232734] transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 flex items-center justify-center text-xs font-bold text-[#FF5A1F]">
              {firebaseUser ? (userProfile?.name || firebaseUser.email || 'U')[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#F0F3F6] truncate">
                {firebaseUser ? userProfile?.name || 'Reader' : 'Sign In'}
              </p>
              <p className="text-[10px] text-[#8B949E] truncate">
                {firebaseUser ? firebaseUser.email : 'Sync account'}
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
              {activeNav === 'feed' && 'Technology & Engineering Discover'}
              {activeNav === 'todays-drop' && "Today's Featured Drops"}
              {activeNav === 'saved' && 'Personal Library'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {(isAdmin || isEditor) && onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#181B22] hover:bg-[#232734] text-[#8B949E] hover:text-[#F0F3F6] border border-[#232734] transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Admin Studio</span>
              </button>
            )}

            <LanguageSelector
              currentLanguage={currentLanguage}
              onChange={onLanguageChange}
            />

            <NotificationsPopover onSelectStoryId={onSelectStoryId} />
          </div>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};

