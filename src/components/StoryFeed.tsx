import React, { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { StoryCard } from './StoryCard';
import { DailyBriefBanner } from './DailyBriefBanner';
import { subscribeToAllReadingStates } from '../services/readingStateService';
import type { Story, ReadingState } from '../types/domain';
import type { DailyBrief, DailyBriefProgress } from '../types/brief';

interface StoryFeedProps {
  stories: Story[];
  isLoading: boolean;
  error: Error | null;
  userId?: string;
  onSelectStory: (story: Story) => void;
  onToggleBookmark?: (story: Story) => void;
  brief?: DailyBrief | null;
  briefProgress?: DailyBriefProgress | null;
  onOpenBrief?: () => void;
  isBriefLoading?: boolean;
}

export const StoryFeed: React.FC<StoryFeedProps> = ({
  stories,
  isLoading,
  error,
  userId,
  onSelectStory,
  onToggleBookmark,
  brief,
  briefProgress,
  onOpenBrief,
  isBriefLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readingStates, setReadingStates] = useState<ReadingState[]>([]);

  // Real-time subscription to cloud reading states
  useEffect(() => {
    if (!userId) {
      setReadingStates([]);
      return;
    }

    const unsubscribe = subscribeToAllReadingStates(
      userId,
      (states) => setReadingStates(states),
      (err) => console.warn('[StoryFeed] Reading states stream error:', err)
    );

    return () => unsubscribe();
  }, [userId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [stories]);

  const featuredStories = useMemo(() => {
    return stories.filter((s) => s.isTodaysDrop || s.isFeatured).slice(0, 3);
  }, [stories]);

  // Compute canonical continuing stories (partially read or recent with progress)
  const continuingStories = useMemo(() => {
    if (!readingStates.length) return [];

    const stateMap = new Map<string, ReadingState>();
    readingStates.forEach((rs) => {
      // In progress (between 5% and 95% complete) or recently active
      if (rs.progress >= 0.05 && rs.progress < 0.95) {
        stateMap.set(rs.articleId, rs);
      }
    });

    const matched: { story: Story; state: ReadingState }[] = [];
    stories.forEach((story) => {
      const st = stateMap.get(story.id);
      if (st) {
        matched.push({ story, state: st });
      }
    });

    // Sort by lastOpenedAt desc
    matched.sort((a, b) => {
      const timeA = a.state.lastOpenedAt ? new Date(a.state.lastOpenedAt).getTime() : 0;
      const timeB = b.state.lastOpenedAt ? new Date(b.state.lastOpenedAt).getTime() : 0;
      return timeB - timeA;
    });

    return matched.slice(0, 3);
  }, [stories, readingStates]);

  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        s.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.quickBrief.quickSummary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [stories, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Daily Brief Banner (Finite Digest Hero) */}
      {onOpenBrief && (
        <DailyBriefBanner
          brief={brief || null}
          progress={briefProgress || null}
          onOpenBrief={onOpenBrief}
          isLoading={isBriefLoading}
        />
      )}

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter stream by keyword, tech, or company..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#12141A] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-sm text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                  : 'bg-[#12141A] hover:bg-[#181B22] border border-[#232734] text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Continuing Stories Section (Grounded in real readingState) */}
      {!searchQuery && selectedCategory === 'All' && continuingStories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Continue Reading</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {continuingStories.map(({ story, state }) => (
              <div
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="group p-4 bg-[#12141A] border border-[#232734] hover:border-emerald-500/50 rounded-2xl cursor-pointer transition flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {Math.round(state.progress * 100)}% Read
                    </span>
                    <span className="text-[10px] text-[#8B949E]">{story.category}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-2 leading-snug">
                    {story.title}
                  </h4>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#181B22] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(state.progress * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232734] flex items-center justify-between text-xs text-[#8B949E]">
                  <span>Resume reading</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Drops Section (if available and no active search) */}
      {!searchQuery && selectedCategory === 'All' && featuredStories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF5A1F] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Today's Drop & Featured Intel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onSelect={onSelectStory}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Stories Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#F0F3F6]">
            {selectedCategory === 'All' ? 'Latest Intelligence Stream' : `${selectedCategory} Stream`}
          </h3>
          <span className="text-xs text-[#8B949E]">
            {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 bg-[#12141A] border border-[#232734] rounded-2xl animate-pulse p-4 space-y-3"
              >
                <div className="w-full h-36 bg-[#181B22] rounded-xl" />
                <div className="w-1/3 h-4 bg-[#181B22] rounded" />
                <div className="w-full h-5 bg-[#181B22] rounded" />
                <div className="w-2/3 h-4 bg-[#181B22] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-2">
            <p className="text-sm font-semibold text-red-400">Failed to load stories</p>
            <p className="text-xs text-[#8B949E]">{error.message}</p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-12 bg-[#12141A] border border-[#232734] rounded-2xl text-center space-y-2">
            <p className="text-sm font-semibold text-[#F0F3F6]">No stories match your filter</p>
            <p className="text-xs text-[#8B949E]">Try changing your search keywords or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onSelect={onSelectStory}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
