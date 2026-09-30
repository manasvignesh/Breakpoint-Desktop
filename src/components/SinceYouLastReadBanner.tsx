import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { StoryChange } from '../types/timeline';


interface SinceYouLastReadBannerProps {
  changes: StoryChange[];
  lastReadAt: string | null;
  onViewTimeline?: () => void;
  onDismiss?: () => void;
}

export const SinceYouLastReadBanner: React.FC<SinceYouLastReadBannerProps> = ({
  changes,
  lastReadAt,
  onViewTimeline,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const userFacingChanges = (changes || []).filter(
    c => c.userFacing !== false && c.type !== 'additional_detail' && c.type !== 'no_change'
  );

  if (isDismissed || userFacingChanges.length === 0) {
    return null; // Empty behavior: show nothing if 0 user-facing changes
  }

  const formatLastRead = (isoString: string | null) => {
    if (!isoString) return 'your last visit';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'your last visit';
    }
  };

  return (
    <div className="mb-8 p-4 bg-gradient-to-r from-[#FF5A1F]/15 via-[#161922] to-[#12141A] border border-[#FF5A1F]/40 rounded-2xl shadow-lg shadow-[#FF5A1F]/5 animate-fadeIn">
      {/* Banner Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[#FF5A1F] text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
              Since You Last Read ({formatLastRead(lastReadAt)})
            </span>
            <h4 className="text-sm font-bold text-[#F0F3F6]">
              {userFacingChanges.length} {userFacingChanges.length === 1 ? 'key development' : 'key developments'} updated
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#232734]/50 transition"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsDismissed(true);
              if (onDismiss) onDismiss();
            }}
            className="p-1 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#232734]/50 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Changes List */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#232734]/60 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {userFacingChanges.map((chg, idx) => (
              <div
                key={chg.id || idx}
                className="p-2.5 bg-[#0F1015]/80 border border-[#232734] rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#FF5A1F] uppercase tracking-wider">
                    {chg.subject}
                  </span>
                  {chg.previousValue !== null && chg.previousValue !== undefined && chg.newValue && (
                    <span className="text-[10px] font-mono text-[#8B949E]">
                      {String(chg.previousValue)} → <strong className="text-white">{String(chg.newValue)}</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#C9D1D9] leading-snug">
                  {chg.description}
                </p>
              </div>
            ))}
          </div>

          {onViewTimeline && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onViewTimeline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white text-xs font-semibold shadow-sm transition"
              >
                <span>Explore Full Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
