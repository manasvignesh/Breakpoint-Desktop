import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { DailyBrief, DailyBriefItem, DailyBriefProgress } from '../types/brief';
import { briefProgressService } from '../services/briefProgressService';

interface DailyBriefViewerProps {
  brief: DailyBrief;
  initialProgress: DailyBriefProgress | null;
  userId: string;
  onClose: () => void;
  onOpenArticle?: (articleId: string) => void;
}

export const DailyBriefViewer: React.FC<DailyBriefViewerProps> = ({
  brief,
  initialProgress,
  userId,
  onClose,
  onOpenArticle,
}) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    return new Set(initialProgress?.completedItemIds || []);
  });

  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
    return new Set(initialProgress?.skippedItemIds || []);
  });

  const [isCaughtUp, setIsCaughtUp] = useState<boolean>(() => {
    if (initialProgress?.isCaughtUp) return true;
    const handled = (initialProgress?.completedItemIds?.length || 0) + (initialProgress?.skippedItemIds?.length || 0);
    return handled >= brief.items.length && brief.items.length > 0;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialProgress && !initialProgress.isCaughtUp) {
      return briefProgressService.resolveNextUnresolvedIndex(
        brief.items,
        initialProgress.completedItemIds || [],
        initialProgress.skippedItemIds || []
      );
    }
    return 0;
  });

  const items = brief.items;
  const currentItem: DailyBriefItem | undefined = items[currentIndex];

  // Mark current item completed and advance to next unresolved item
  const handleCompleteCurrent = useCallback(async () => {
    if (!currentItem) return;

    const newCompleted = new Set(completedIds);
    newCompleted.add(currentItem.id);
    setCompletedIds(newCompleted);

    const newSkipped = new Set(skippedIds);
    newSkipped.delete(currentItem.id);
    setSkippedIds(newSkipped);

    const handledCount = newCompleted.size + newSkipped.size;
    const allHandled = handledCount >= items.length;

    if (allHandled) {
      setIsCaughtUp(true);
    } else {
      const nextIdx = briefProgressService.resolveNextUnresolvedIndex(items, newCompleted, newSkipped);
      setCurrentIndex(nextIdx);
    }

    if (userId) {
      await briefProgressService.markItemCompleted(
        userId,
        brief.briefId,
        currentItem.id,
        items.length,
        (currentItem.readTimeMinutes || 2) * 60
      );
    }
  }, [currentItem, completedIds, skippedIds, items, userId, brief.briefId]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    if (isCaughtUp) {
      setIsCaughtUp(false);
    }
  }, [isCaughtUp]);

  const handleNext = useCallback(() => {
    if (currentIndex >= items.length - 1) {
      const handledCount = completedIds.size + skippedIds.size;
      if (handledCount >= items.length) {
        setIsCaughtUp(true);
      } else {
        const nextIdx = briefProgressService.resolveNextUnresolvedIndex(items, completedIds, skippedIds);
        setCurrentIndex(nextIdx);
      }
    } else {
      setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
    }
  }, [currentIndex, items, completedIds, skippedIds]);

  const handleSkip = useCallback(async () => {
    if (!currentItem) return;

    const newSkipped = new Set(skippedIds);
    newSkipped.add(currentItem.id);
    setSkippedIds(newSkipped);

    const handledCount = completedIds.size + newSkipped.size;
    const allHandled = handledCount >= items.length;

    if (allHandled) {
      setIsCaughtUp(true);
    } else {
      const nextIdx = briefProgressService.resolveNextUnresolvedIndex(items, completedIds, newSkipped);
      setCurrentIndex(nextIdx);
    }

    if (userId) {
      await briefProgressService.skipItem(userId, brief.briefId, currentItem.id, items.length);
    }
  }, [currentItem, completedIds, skippedIds, items, userId, brief.briefId]);

  // Keyboard navigation: J/K, Arrows, Enter, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isCaughtUp) {
          onClose();
        } else {
          handleCompleteCurrent();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleCompleteCurrent, isCaughtUp, onClose]);

  const getReasonBadge = (item: DailyBriefItem) => {
    switch (item.reasonCode) {
      case 'continuing':
        return {
          label: 'Continuing Story • What Changed',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'followed':
        return {
          label: 'Followed Topic / Entity',
          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'knowledge_gap':
        return {
          label: 'Concept Pathway',
          color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'outside_bubble':
        return {
          label: 'Outside Your Usual Bubble',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'interest':
        return {
          label: 'Matches Your Interests',
          color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        };
      default:
        return {
          label: 'Key Daily Development',
          color: 'bg-[#FF5A1F]/15 text-[#FF7A45] border-[#FF5A1F]/30',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0F1118] border border-[#232734] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#232734] flex items-center justify-between bg-[#141620]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#FF5A1F] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                Daily Brief • {brief.edition}
              </span>
              <div className="text-sm font-semibold text-[#F0F3F6]">
                {isCaughtUp
                  ? 'Caught Up'
                  : `Item ${currentIndex + 1} of ${items.length} (~${brief.estimatedMinutes} min)`}
              </div>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {items.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsCaughtUp(false);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex && !isCaughtUp
                    ? 'w-6 bg-[#FF5A1F]'
                    : completedIds.has(it.id)
                    ? 'w-2 bg-[#3FB950]'
                    : 'w-2 bg-[#282F40]'
                }`}
                title={`Item ${idx + 1}: ${it.title}`}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-[#1E2330] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {isCaughtUp ? (
            /* Peace Endpoint: You're Caught Up */
            <div className="text-center py-12 px-4 space-y-6 animate-fadeIn">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#3FB950]/10 border border-[#3FB950]/30 flex items-center justify-center text-[#3FB950] shadow-xl shadow-[#3FB950]/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                  You're Caught Up
                </h3>
                <p className="text-[#8B949E] text-sm sm:text-base max-w-md mx-auto">
                  You've reviewed the essential developments for this {brief.edition}. You're all set for now.
                </p>
              </div>

              <div className="inline-flex items-center gap-4 bg-[#141620] border border-[#232734] px-5 py-3 rounded-2xl text-xs text-[#8B949E]">
                <span>{items.length} items reviewed</span>
                <span>•</span>
                <span>~{brief.estimatedMinutes} minutes total</span>
                <span>•</span>
                <span className="text-[#3FB950]">Zero noise</span>
              </div>

              <div className="pt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsCaughtUp(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#30363D] text-[#8B949E] hover:text-white hover:bg-[#1E2330] text-sm transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Review Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6B35] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#FF5A1F]/25"
                >
                  Done for Today
                </button>
              </div>
            </div>
          ) : currentItem ? (
            /* Current Brief Item Card */
            <div className="space-y-5 animate-fadeIn">
              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      getReasonBadge(currentItem).color
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {getReasonBadge(currentItem).label}
                  </span>
                  {currentItem.selectionSignals?.includes('outside_bubble') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Outside Your Bubble
                    </span>
                  )}
                  <span className="text-xs text-[#8B949E] bg-[#1A1D27] px-2.5 py-1 rounded-full border border-[#282F40]">
                    {currentItem.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#8B949E]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {currentItem.readTimeMinutes} min read
                  </span>
                  {currentItem.explanationMode === 'primer' && (
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                      FOUNDATIONAL PRIMER
                    </span>
                  )}
                  {currentItem.explanationMode === 'compact_delta' && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                      DELTA FOCUS
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight leading-snug">
                {currentItem.title}
              </h2>

              {/* Reason Explanation */}
              <div className="text-xs text-[#8B949E] italic border-l-2 border-[#FF5A1F]/60 pl-3">
                Why in your brief: {currentItem.reasonExplanation}
              </div>

              {/* Since You Last Read / Delta Highlight Box */}
              {currentItem.sinceYouLastReadDeltas && currentItem.sinceYouLastReadDeltas.length > 0 && (
                <div className="bg-[#121A16] border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Layers className="w-4 h-4" />
                    Since You Last Read
                  </div>
                  <ul className="space-y-1.5">
                    {currentItem.sinceYouLastReadDeltas.map((delta, dIdx) => (
                      <li key={dIdx} className="text-xs text-[#C9D1D9] flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{delta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary / Core Narrative */}
              <div className="text-sm text-[#C9D1D9] leading-relaxed bg-[#141620] border border-[#232734] rounded-2xl p-5 space-y-3">
                <p>{currentItem.summary}</p>
              </div>

              {/* Deep Dive & Source Actions */}
              <div className="flex items-center justify-between pt-2">
                {(currentItem.articleId || currentItem.storyId) && onOpenArticle ? (
                  <button
                    onClick={() => {
                      onOpenArticle((currentItem.articleId || currentItem.storyId)!);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7A45] hover:text-[#FF5A1F] transition-colors"
                  >
                    <span>Read Full Story & Context</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : <div />}

                <span className="text-[11px] text-[#6E7681]">
                  Press <kbd className="px-1.5 py-0.5 bg-[#232734] rounded text-[#8B949E]">Enter</kbd> to complete,{' '}
                  <kbd className="px-1.5 py-0.5 bg-[#232734] rounded text-[#8B949E]">J</kbd>/<kbd className="px-1.5 py-0.5 bg-[#232734] rounded text-[#8B949E]">K</kbd> to navigate
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Actions Bar */}
        {!isCaughtUp && (
          <div className="px-6 py-4 bg-[#141620] border-t border-[#232734] flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#8B949E] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#8B949E] hover:text-white transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleCompleteCurrent}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#E04810] hover:from-[#FF6B35] hover:to-[#EB551D] text-white text-xs font-bold shadow-lg shadow-[#FF5A1F]/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Read & Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
