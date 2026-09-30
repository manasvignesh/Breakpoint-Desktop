import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Zap,
} from 'lucide-react';
import type { DailyBrief, DailyBriefProgress } from '../types/brief';

interface DailyBriefViewProps {
  brief: DailyBrief | null;
  progress: DailyBriefProgress | null;
  isLoading: boolean;
  onOpenViewer: () => void;
  onGenerateRetry?: () => void;
  onOpenArticle?: (articleId: string) => void;
}

export const DailyBriefView: React.FC<DailyBriefViewProps> = ({
  brief,
  progress,
  isLoading,
  onOpenViewer,
  onGenerateRetry,
  onOpenArticle,
}) => {
  const readCount = progress?.completedItemIds?.length || 0;
  const totalCount = brief?.items?.length || 0;
  const isCompleted = progress?.isCaughtUp || (totalCount > 0 && readCount >= totalCount);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display text-white">Preparing Your Daily Brief...</h3>
          <p className="text-xs text-[#8B949E] mt-1 max-w-sm">
            Distilling today's most critical engineering developments into an intentional, finite brief.
          </p>
        </div>
      </div>
    );
  }

  if (!brief || brief.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 bg-[#0F1015] border border-[#232734] rounded-3xl shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#181B22] border border-[#232734] text-[#FF5A1F] flex items-center justify-center mx-auto">
          <Zap className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold font-display text-white">You're All Caught Up</h3>
          <p className="text-sm text-[#8B949E] max-w-md mx-auto leading-relaxed">
            No unread developments require your immediate attention right now. Your personalized brief refreshes as new verified updates occur.
          </p>
        </div>
        {onGenerateRetry && (
          <button
            onClick={onGenerateRetry}
            className="px-5 py-2.5 rounded-xl bg-[#181B22] hover:bg-[#232734] border border-[#232734] text-xs font-bold text-white inline-flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check for Fresh Brief</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Brief Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181B22] via-[#0F1015] to-[#0A0B0E] border border-[#232734] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5A1F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#FF7A45] flex items-center justify-center text-white shadow-md shadow-[#FF5A1F]/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#FF5A1F]">
                Today's Daily Briefing
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#8B949E]">
              <span className="flex items-center gap-1.5 bg-[#12141A] px-3 py-1.5 rounded-xl border border-[#232734]">
                <Clock className="w-3.5 h-3.5" />
                <span>{brief.estimatedMinutes} min read</span>
              </span>
              <span className="flex items-center gap-1.5 bg-[#12141A] px-3 py-1.5 rounded-xl border border-[#232734]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{totalCount} key developments</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
              {isCompleted ? 'Daily Briefing Completed' : "What You Need to Understand Today"}
            </h2>
            <p className="text-sm text-[#8B949E] max-w-2xl leading-relaxed">
              Finite, distraction-free intelligence distilled from live engineering developments, breaking changes, and critical concepts.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#8B949E]">
              <span>Progress</span>
              <span>{readCount} / {totalCount} completed</span>
            </div>
            <div className="h-2 w-full bg-[#12141A] rounded-full overflow-hidden border border-[#232734]">
              <div
                className="h-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] transition-all duration-500 rounded-full"
                style={{ width: `${totalCount > 0 ? (readCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenViewer}
              className="px-6 py-3.5 rounded-2xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white font-extrabold text-sm flex items-center gap-2.5 transition shadow-lg shadow-[#FF5A1F]/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isCompleted ? 'Review Briefing' : 'Start Daily Brief'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" /> All caught up for today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Brief Items Overview Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#8B949E]">
          Included in Today's Brief
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brief.items.map((item, index) => {
            const isRead = progress?.completedItemIds?.includes(item.id);
            const targetArticleId = item.articleId || item.storyId;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (onOpenArticle && targetArticleId) onOpenArticle(targetArticleId);
                }}
                className={`p-5 rounded-2xl bg-[#0F1015] border transition cursor-pointer hover:border-[#FF5A1F]/40 flex flex-col justify-between space-y-4 ${
                  isRead ? 'border-[#232734] opacity-75' : 'border-[#232734] hover:bg-[#12141A]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#FF5A1F] tracking-wider">
                      Item #{index + 1} · {item.type}
                    </span>
                    {isRead ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#8B949E] line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#232734]/50 flex items-center justify-between text-[11px] text-[#8B949E]">
                  <span>{item.readTimeMinutes} min read</span>
                  <span className="text-[#FF5A1F] hover:underline font-semibold flex items-center gap-1">
                    Read story <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
