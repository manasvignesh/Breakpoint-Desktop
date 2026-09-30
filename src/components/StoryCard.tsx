import React from 'react';
import { Clock, Volume2, Sparkles, ArrowRight, Bookmark } from 'lucide-react';
import type { Story } from '../types/domain';

interface StoryCardProps {
  story: Story;
  onSelect: (story: Story) => void;
  onToggleBookmark?: (story: Story) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onToggleBookmark,
}) => {
  const quick = story.quickBrief;

  return (
    <article
      onClick={() => onSelect(story)}
      className="group relative flex flex-col justify-between bg-[#12141A] hover:bg-[#181B22] border border-[#232734] hover:border-[#FF5A1F]/50 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-black/50"
    >
      {/* Top Banner Image with Overlay */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#181B22]">
        <img
          src={story.heroImage}
          alt={story.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-black/30" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white uppercase tracking-wider">
          {story.isTodaysDrop && <Sparkles className="w-3 h-3 text-[#FF5A1F]" />}
          <span>{story.category}</span>
        </div>

        {/* Audio Indicator */}
        {story.audioTrack.isAvailable && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF5A1F]/90 backdrop-blur-md text-white text-[11px] font-medium shadow-sm">
            <Volume2 className="w-3 h-3" />
            <span>Audio</span>
          </div>
        )}

        {/* Key Number Callout on Image (if present) */}
        {quick.keyNumber && (
          <div className="absolute bottom-3 left-3 right-3 flex items-baseline gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
            <span className="text-base font-bold font-display text-[#FF5A1F]">
              {quick.keyNumber.value}
            </span>
            <span className="text-xs text-[#8B949E] truncate">
              {quick.keyNumber.label}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-5 gap-3">
        {/* Headline */}
        <h2 className="text-lg font-bold font-display text-[#F0F3F6] group-hover:text-[#FF7A45] leading-snug line-clamp-2 transition">
          {story.title}
        </h2>

        {/* Quick Summary */}
        <p className="text-sm text-[#8B949E] leading-relaxed line-clamp-2">
          {quick.quickSummary}
        </p>

        {/* Three Things to Know Preview */}
        {quick.threeThingsToKnow.length > 0 && (
          <div className="mt-1 pt-3 border-t border-[#232734] space-y-1.5">
            {quick.threeThingsToKnow.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-[#C9D1D9]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] mt-1.5 shrink-0" />
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Attribution */}
      <div className="px-5 py-3.5 bg-[#0F1015] border-t border-[#232734] flex items-center justify-between text-xs text-[#8B949E]">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium text-[#C9D1D9] truncate">
            {story.attribution.publisherName}
          </span>
          <span>·</span>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            <span>{story.estimatedReadTime} min</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(story);
              }}
              className={`p-1.5 rounded-lg transition ${
                story.isSaved
                  ? 'text-[#FF5A1F] bg-[#FF5A1F]/10'
                  : 'text-[#8B949E] hover:text-[#F0F3F6] hover:bg-[#232734]'
              }`}
              title={story.isSaved ? 'Remove from saved' : 'Save story'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${story.isSaved ? 'fill-[#FF5A1F]' : ''}`} />
            </button>
          )}

          <div className="flex items-center gap-1 text-[#FF5A1F] font-medium group-hover:translate-x-0.5 transition">
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </article>
  );
};
