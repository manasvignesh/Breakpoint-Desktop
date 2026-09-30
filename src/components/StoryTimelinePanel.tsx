import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  GitCommit,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { storyTimelineService } from '../services/storyTimelineService';
import { openExternalUrl } from '../utils/openExternal';
import type { StoryTimelineEvent } from '../types/timeline';


interface StoryTimelinePanelProps {
  storyId: string;
  onSelectArticle?: (articleId: string) => void;
}

export const StoryTimelinePanel: React.FC<StoryTimelinePanelProps> = ({
  storyId,
  onSelectArticle,
}) => {
  const [events, setEvents] = useState<StoryTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!storyId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Subscribe to timeline events
    const unsubscribe = storyTimelineService.observeTimeline(storyId, (data) => {
      setEvents(data);
      setIsLoading(false);
    });

    // Fallback if listener doesn't trigger immediately
    storyTimelineService.getTimeline(storyId).then((data) => {
      if (data.length > 0) {
        setEvents(data);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storyId]);

  const formatEventDate = (isoString: string, precision: string) => {
    try {
      const d = new Date(isoString);
      if (precision === 'month') {
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
      if (precision === 'publication_fallback') {
        const dateFormatted = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return `Reported ${dateFormatted}`;
      }
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Date unavailable';
    }
  };

  const getBadgeColor = (type: StoryTimelineEvent['type']) => {
    switch (type) {
      case 'launch':
        return 'bg-emerald-950/60 border-emerald-700/40 text-emerald-400';
      case 'financial':
        return 'bg-amber-950/60 border-amber-700/40 text-amber-400';
      case 'regulatory':
        return 'bg-purple-950/60 border-purple-700/40 text-purple-400';
      case 'correction':
        return 'bg-rose-950/60 border-rose-700/40 text-rose-400';
      case 'announcement':
        return 'bg-blue-950/60 border-blue-700/40 text-blue-400';
      default:
        return 'bg-[#181B22] border-[#232734] text-[#C9D1D9]';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-[#8B949E] space-y-2">
        <Clock className="w-5 h-5 mx-auto text-[#FF5A1F] animate-spin" />
        <p>Loading chronological story timeline...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#8B949E] bg-[#12141A] border border-[#232734] rounded-2xl">
        <Calendar className="w-6 h-6 mx-auto mb-2 text-[#8B949E]/60" />
        <p className="font-medium text-[#C9D1D9]">No timeline events recorded yet.</p>
        <p className="mt-1 text-[11px] text-[#8B949E]">
          As this ongoing story develops, major milestones and updates will appear here chronologically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#FF5A1F] flex items-center gap-2">
          <GitCommit className="w-4 h-4" />
          Story Timeline ({events.length} Developments)
        </h3>
        <span className="text-[11px] text-[#8B949E]">Chronological Order</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#232734]">
        {events.map((ev, index) => {
          const isCorrection = ev.type === 'correction';
          const isSuperseded = Boolean(ev.correctedByEventId);

          return (
            <div key={ev.id || index} className="relative group">
              {/* Timeline Node Bullet */}
              <div
                className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition ${
                  isCorrection
                    ? 'bg-rose-500 border-[#0A0B0E]'
                    : isSuperseded
                    ? 'bg-[#8B949E] border-[#0A0B0E]'
                    : 'bg-[#FF5A1F] border-[#0A0B0E] group-hover:scale-110'
                }`}
              />

              {/* Event Card */}
              <div
                className={`p-4 rounded-2xl border transition ${
                  isSuperseded
                    ? 'bg-[#0F1015]/60 border-[#232734]/50 opacity-70'
                    : 'bg-[#12141A] border-[#232734] hover:border-[#FF5A1F]/40'
                }`}
              >
                {/* Header: Date + Event Type Tag */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#F0F3F6]">
                      {formatEventDate(ev.occurredAt, ev.datePrecision)}
                    </span>
                    {ev.datePrecision === 'publication_fallback' && (
                      <span className="text-[10px] text-[#8B949E] italic" title="Date of published reporting">
                        (Reported)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${getBadgeColor(
                        ev.type
                      )}`}
                    >
                      {ev.type}
                    </span>
                    {isSuperseded && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-950/40 border border-amber-800/40 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Superseded
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Title */}
                <h4
                  className={`text-sm font-bold leading-snug mb-1.5 ${
                    isSuperseded ? 'line-through text-[#8B949E]' : 'text-[#F0F3F6]'
                  }`}
                >
                  {ev.title}
                </h4>

                {/* Event Summary */}
                {ev.summary && (
                  <p className="text-xs text-[#C9D1D9] leading-relaxed mb-3">
                    {ev.summary}
                  </p>
                )}

                {/* Provenance & Supporting Articles */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#232734]/50 text-[11px] text-[#8B949E]">
                  <span>Evidence:</span>
                  {ev.sourceArticleIds.map((artId, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => onSelectArticle && onSelectArticle(artId)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181B22] hover:bg-[#232734] border border-[#232734] text-[#C9D1D9] hover:text-white transition"
                    >
                      <span>Article #{aIdx + 1}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#FF5A1F]" />
                    </button>
                  ))}

                  {ev.sourceUrls && ev.sourceUrls.map((url, uIdx) => (
                    <a
                      key={uIdx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        openExternalUrl(url);
                      }}
                      className="inline-flex items-center gap-1 text-[#FF5A1F] hover:underline cursor-pointer"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
