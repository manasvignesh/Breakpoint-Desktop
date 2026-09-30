import React, { useState, useMemo } from 'react';
import { Search, Sparkles, SlidersHorizontal, Layers } from 'lucide-react';
import { StoryCard } from './StoryCard';
import { DailyBriefBanner } from './DailyBriefBanner';
import type { Story } from '../types/domain';
import type { DailyBrief, DailyBriefProgress } from '../types/brief';

interface StoryFeedProps {
  stories: Story[];
  isLoading: boolean;
  error: Error | null;
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
  onSelectStory,
  onToggleBookmark,
  brief,
  briefProgress,
  onOpenBrief,
  isBriefLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const continuingStories = useMemo(() => {
    return stories.filter((s) => s.storyId).slice(0, 3);
  }, [stories]);

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
            placeholder="Search stories, technologies, numbers..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#12141A] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-sm text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
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

      {/* Continuing Stories Section (if any in-progress stories) */}
      {!searchQuery && selectedCategory === 'All' && continuingStories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Continue Reading & Updates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {continuingStories.map((story) => (
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

      {/* Featured Drops Carousel (if available and no active search) */}
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

      {/* Main Feed Header */}
      <div className="flex items-center justify-between border-b border-[#232734] pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#8B949E]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#C9D1D9]">
            {selectedCategory === 'All' ? 'All Published Stories' : `${selectedCategory} Feed`}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#232734] text-[#8B949E]">
            {filteredStories.length}
          </span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 bg-[#12141A] border border-[#232734] rounded-2xl animate-pulse flex flex-col justify-between p-5"
            >
              <div className="space-y-3">
                <div className="h-32 bg-[#181B22] rounded-xl" />
                <div className="h-4 bg-[#232734] rounded w-3/4" />
                <div className="h-3 bg-[#232734] rounded w-full" />
              </div>
              <div className="h-3 bg-[#232734] rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-8 text-center bg-red-950/20 border border-red-800/40 rounded-2xl">
          <p className="text-sm font-medium text-red-400 mb-2">
            Unable to load published articles
          </p>
          <p className="text-xs text-[#8B949E]">{error.message}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredStories.length === 0 && (
        <div className="p-16 text-center bg-[#12141A] border border-[#232734] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#232734] text-[#8B949E] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F0F3F6]">No stories found</h3>
          <p className="text-sm text-[#8B949E] max-w-sm mx-auto">
            No approved Breakpoint stories match your search or filter criteria.
          </p>
        </div>
      )}

      {/* Stories Grid */}
      {!isLoading && !error && filteredStories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
};
