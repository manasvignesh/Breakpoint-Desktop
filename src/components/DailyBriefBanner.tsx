import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { DailyBrief, DailyBriefProgress } from '../types/brief';

interface DailyBriefBannerProps {
  brief: DailyBrief | null;
  progress: DailyBriefProgress | null;
  onOpenBrief: () => void;
  isLoading?: boolean;
}

export const DailyBriefBanner: React.FC<DailyBriefBannerProps> = ({
  brief,
  progress,
  onOpenBrief,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full bg-[#161821] border border-[#232734] rounded-2xl p-6 animate-pulse flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-[#232734] rounded"></div>
          <div className="h-6 w-64 bg-[#232734] rounded"></div>
        </div>
        <div className="h-10 w-36 bg-[#232734] rounded-xl"></div>
      </div>
    );
  }

  if (!brief || brief.items.length === 0) {
    return null;
  }

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const completedCount = progress?.completedItemIds?.length || 0;
  const totalCount = brief.items.length;
  const isCaughtUp = progress?.isCaughtUp || completedCount >= totalCount;
  const completionPercent = Math.min(100, Math.round((completedCount / totalCount) * 100));

  return (
    <div className="relative overflow-hidden w-full bg-gradient-to-r from-[#141620] via-[#171926] to-[#141620] border border-[#2B3042] hover:border-[#FF5A1F]/40 transition-all duration-300 rounded-2xl p-6 shadow-xl shadow-black/40 group">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF5A1F]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#FF5A1F]/15 transition-all duration-500" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF5A1F]/15 text-[#FF7A45] border border-[#FF5A1F]/30">
              <Sparkles className="w-3.5 h-3.5" />
              FINITE DAILY BRIEF
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[#8B949E]">
              <Clock className="w-3.5 h-3.5" />
              ~{brief.estimatedMinutes} min read
            </span>
            <span className="text-xs text-[#6E7681]">•</span>
            <span className="text-xs text-[#8B949E] capitalize">{brief.edition} edition</span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
            {greeting}, your {brief.edition} brief is ready
          </h2>

          <p className="text-sm text-[#8B949E] max-w-xl">
            {isCaughtUp ? (
              <span className="text-[#3FB950] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> You're caught up for today! No new updates require your attention.
              </span>
            ) : (
              <span>
                {totalCount} essential developments curated for you. Stop whenever you're caught up.
              </span>
            )}
          </p>

          {/* Progress Mini Bar */}
          {!isCaughtUp && completedCount > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="w-40 h-1.5 bg-[#232734] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-xs text-[#8B949E]">
                {completedCount} of {totalCount} completed ({completionPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onOpenBrief}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
              isCaughtUp
                ? 'bg-[#1F2430] hover:bg-[#282F40] text-[#E6EDF3] border border-[#30363D]'
                : 'bg-gradient-to-r from-[#FF5A1F] to-[#E04810] hover:from-[#FF6B35] hover:to-[#EB551D] text-white shadow-[#FF5A1F]/25 hover:shadow-[#FF5A1F]/40'
            }`}
          >
            {isCaughtUp ? (
              <>
                <BookOpen className="w-4 h-4 text-[#8B949E]" />
                <span>Review Brief</span>
              </>
            ) : completedCount > 0 ? (
              <>
                <span>Continue Brief ({completedCount + 1}/{totalCount})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Start Today's Brief</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
