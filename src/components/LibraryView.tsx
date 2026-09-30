import React, { useState, useEffect } from 'react';
import { Bookmark, Users, Search, UserCheck } from 'lucide-react';
import { StoryCard } from './StoryCard';
import { subscribeToFollowing, toggleFollowUser } from '../services/followService';
import { useAuth } from '../contexts/AuthContext';
import type { Story, User } from '../types/domain';

interface LibraryViewProps {
  savedStories: Story[];
  isLoadingSaved: boolean;
  onSelectStory: (story: Story) => void;
  onToggleBookmark: (story: Story) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  savedStories,
  isLoadingSaved,
  onSelectStory,
  onToggleBookmark,
}) => {
  const { firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'saved' | 'following'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setFollowingUsers([]);
      return;
    }

    setIsLoadingFollowing(true);
    const unsubscribe = subscribeToFollowing(
      firebaseUser.uid,
      (users) => {
        setFollowingUsers(users);
        setIsLoadingFollowing(false);
      },
      (err) => {
        console.warn('[LibraryView] Following stream error:', err);
        setIsLoadingFollowing(false);
      },
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const filteredSavedStories = savedStories.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.quickBrief.quickSummary.toLowerCase().includes(q)
    );
  });

  const filteredFollowing = followingUsers.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  const handleToggleFollow = async (targetUser: User) => {
    if (!firebaseUser) return;
    try {
      // Unfollow since they are in following list
      await toggleFollowUser(firebaseUser.uid, targetUser.uid, false);
    } catch (err) {
      console.error('[LibraryView] Unfollow error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header & Section Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232734] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-[#FF5A1F]" />
            <span>Your Personal Library</span>
          </h1>
          <p className="text-xs text-[#8B949E]">
            Synced across mobile and desktop via your Breakpoint account.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#12141A] border border-[#232734] rounded-2xl">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'saved'
                ? 'bg-[#FF5A1F] text-white shadow-sm'
                : 'text-[#8B949E] hover:text-[#F0F3F6]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Stories ({savedStories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'following'
                ? 'bg-[#FF5A1F] text-white shadow-sm'
                : 'text-[#8B949E] hover:text-[#F0F3F6]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Following ({followingUsers.length})</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'saved'
              ? 'Search saved stories & topics...'
              : 'Search creators & authors...'
          }
          className="w-full pl-10 pr-4 py-2.5 bg-[#12141A] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-sm text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
        />
      </div>

      {/* Tab 1: Saved Stories */}
      {activeTab === 'saved' && (
        <div>
          {isLoadingSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 bg-[#12141A] border border-[#232734] rounded-2xl animate-pulse p-5"
                />
              ))}
            </div>
          ) : filteredSavedStories.length === 0 ? (
            <div className="p-16 text-center bg-[#12141A] border border-[#232734] rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#232734] text-[#8B949E] flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F0F3F6]">
                {searchQuery ? 'No saved stories match your search' : 'No saved stories yet'}
              </h3>
              <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
                Stories you bookmark on mobile or desktop will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSavedStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onSelect={onSelectStory}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Following Creators */}
      {activeTab === 'following' && (
        <div>
          {isLoadingFollowing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-[#12141A] border border-[#232734] rounded-2xl animate-pulse p-4"
                />
              ))}
            </div>
          ) : filteredFollowing.length === 0 ? (
            <div className="p-16 text-center bg-[#12141A] border border-[#232734] rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#232734] text-[#8B949E] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F0F3F6]">
                {searchQuery ? 'No followed creators match your search' : 'Not following any creators yet'}
              </h3>
              <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
                Follow creators and authors from articles to get personalized updates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFollowing.map((user) => (
                <div
                  key={user.uid}
                  className="p-5 bg-[#12141A] border border-[#232734] hover:border-[#FF5A1F]/40 rounded-2xl flex items-center justify-between gap-4 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 flex items-center justify-center font-bold text-sm shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-[#F0F3F6] truncate">
                          {user.name}
                        </h4>
                        {user.isStaff && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5A1F] text-white">
                            STAFF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8B949E] truncate">
                        {user.department || user.role}
                      </p>
                      <p className="text-[10px] text-[#8B949E] mt-0.5">
                        {user.followersCount} followers
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFollow(user)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#232734] hover:bg-red-950/40 hover:text-red-400 hover:border-red-800/50 border border-transparent text-xs font-semibold text-[#C9D1D9] transition shrink-0"
                    title="Unfollow creator"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>Following</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
