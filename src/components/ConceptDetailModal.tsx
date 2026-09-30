import React, { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Sparkles,
  Building2,
  Tag,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import type { ContextualConceptExplanation, ExplanationMode, UserKnowledge } from '../types/knowledge';
import { contextualExplanationService } from '../services/contextualExplanationService';
import { userKnowledgeService } from '../services/userKnowledgeService';
import { personalizationService } from '../services/personalizationService';
import { KnowledgeTrailViewer } from './KnowledgeTrailViewer';

interface ConceptDetailModalProps {
  conceptId: string;
  articleContext?: {
    title: string;
    whatHappened?: string;
    summary?: string;
  };
  userId?: string;
  onClose: () => void;
  onSelectConcept: (conceptId: string) => void;
}

export const ConceptDetailModal: React.FC<ConceptDetailModalProps> = ({
  conceptId,
  articleContext,
  userId,
  onClose,
  onSelectConcept,
}) => {
  const [data, setData] = useState<ContextualConceptExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrail, setShowTrail] = useState(false);
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('FOUNDATIONAL');
  const [userKnowledge, setUserKnowledge] = useState<UserKnowledge | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // 1. Fetch contextual explanation
    contextualExplanationService
      .getContextualExplanation(conceptId, articleContext)
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn('[ConceptDetailModal] Failed to load concept explanation:', err);
        if (isMounted) setLoading(false);
      });

    // 2. Dispatch CONCEPT_OPENED signal & resolve explanation mode
    if (userId) {
      userKnowledgeService
        .applySignal(userId, {
          type: 'CONCEPT_OPENED',
          conceptId,
          occurredAt: new Date().toISOString(),
        })
        .then(uk => {
          if (isMounted) setUserKnowledge(uk);
        })
        .catch(console.warn);

      personalizationService
        .getExplanationMode(userId, conceptId)
        .then(mode => {
          if (isMounted) setExplanationMode(mode);
        })
        .catch(console.warn);
    }

    return () => {
      isMounted = false;
    };
  }, [conceptId, articleContext, userId]);

  const handleMarkKnown = async () => {
    if (!userId) return;
    const updated = await userKnowledgeService.markKnown(userId, conceptId);
    setUserKnowledge(updated);
    setExplanationMode('ASSUME_FAMILIARITY');
  };

  const handleRequestBasics = async () => {
    if (!userId) return;
    const updated = await userKnowledgeService.requestBasics(userId, conceptId);
    setUserKnowledge(updated);
    setExplanationMode('FOUNDATIONAL');
  };

  const handleResetTopic = async () => {
    if (!userId) return;
    await userKnowledgeService.resetConceptState(userId, conceptId);
    setUserKnowledge(null);
    setExplanationMode('FOUNDATIONAL');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-[#12141A] border border-[#232734] rounded-2xl p-6 w-full max-w-lg text-center animate-pulse">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-[#FF5A1F]/20" />
          <div className="text-sm font-semibold text-[#C9D1D9]">Loading concept details...</div>
        </div>
      </div>
    );
  }

  if (!data || !data.concept) {
    return null;
  }

  const { concept, contextualRelevance, relatedConcepts, relatedEntities, trail } = data;

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'basic':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'intermediate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'advanced':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-[#232734] text-[#8B949E] border-[#2B3142]';
    }
  };

  const isUnderstood = userKnowledge?.state === 'understood' || userKnowledge?.explicitUserState === 'know_this';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#12141A] border border-[#232734] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#191D26] hover:bg-[#232734] text-[#8B949E] hover:text-white transition"
          title="Close concept view"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badges & Personal Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pr-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30">
              {concept.category}
            </span>
            {concept.difficulty && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getDifficultyColor(
                  concept.difficulty
                )}`}
              >
                {concept.difficulty}
              </span>
            )}
          </div>

          {/* User Knowledge Explicit Buttons */}
          {userId && (
            <div className="flex items-center gap-2">
              {isUnderstood ? (
                <button
                  onClick={handleRequestBasics}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#191D26] hover:bg-[#232734] text-[#8B949E] hover:text-white border border-[#2B3142] transition flex items-center gap-1.5"
                  title="Restore full elementary explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Explain from basics
                </button>
              ) : (
                <button
                  onClick={handleMarkKnown}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#191D26] hover:bg-emerald-950 text-[#8B949E] hover:text-emerald-400 border border-[#2B3142] hover:border-emerald-600/40 transition flex items-center gap-1.5"
                  title="Mark this concept as already understood"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  I know this
                </button>
              )}

              {userKnowledge && (
                <button
                  onClick={handleResetTopic}
                  className="p-1.5 rounded-lg bg-[#191D26] hover:bg-red-950 text-[#8B949E] hover:text-red-400 border border-[#2B3142] hover:border-red-600/30 transition"
                  title="Reset topic familiarity"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Concept Title */}
        <h3 className="text-2xl font-bold text-white mb-3">
          {concept.name}
        </h3>

        {/* Canonical Definition / Tailored by ExplanationMode */}
        <div className="p-4 rounded-xl bg-[#191D26] border border-[#2B3142] mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B949E] mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#FF5A1F]" />
              {explanationMode === 'ASSUME_FAMILIARITY' ? 'Quick Refresher' : 'What is this?'}
            </span>
            {explanationMode === 'ASSUME_FAMILIARITY' && (
              <span className="text-[10px] text-emerald-400 font-normal">
                (You are familiar with this topic)
              </span>
            )}
          </div>
          <p className="text-sm text-[#F0F6FC] leading-relaxed font-medium">
            {concept.shortDefinition}
          </p>
        </div>

        {/* Why it matters here */}
        {contextualRelevance && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#FF5A1F]/10 to-[#191D26] border border-[#FF5A1F]/30 mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A1F] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Why it matters in this story
            </div>
            <p className="text-xs text-[#C9D1D9] leading-relaxed">
              {contextualRelevance}
            </p>
          </div>
        )}

        {/* Knowledge Trail Banner / Stepper */}
        {trail && (
          <div className="mb-6">
            {!showTrail ? (
              <div className="p-4 rounded-xl bg-[#161922] border border-[#2B3142] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{trail.title}</div>
                    <div className="text-[11px] text-[#8B949E]">
                      {trail.steps.length}-step structured learning path
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowTrail(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                >
                  Explore Trail
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <KnowledgeTrailViewer
                trail={trail}
                userId={userId}
                onSelectConcept={onSelectConcept}
                onClose={() => setShowTrail(false)}
              />
            )}
          </div>
        )}

        {/* Connected Entities & Related Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#232734]">
          {/* Related Concepts */}
          <div>
            <div className="text-xs font-semibold text-[#8B949E] mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Related Concepts
            </div>
            {relatedConcepts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {relatedConcepts.map(rc => (
                  <button
                    key={rc.id}
                    onClick={() => onSelectConcept(rc.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#191D26] hover:bg-[#232734] border border-[#2B3142] text-xs text-[#C9D1D9] hover:text-white transition"
                  >
                    {rc.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#6E7681]">None linked yet</span>
            )}
          </div>

          {/* Connected Entities */}
          <div>
            <div className="text-xs font-semibold text-[#8B949E] mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
              Associated Organizations / Hubs
            </div>
            {relatedEntities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {relatedEntities.map(ent => (
                  <span
                    key={ent.id}
                    className="px-2.5 py-1 rounded-lg bg-[#191D26] border border-[#2B3142] text-xs text-[#8B949E]"
                  >
                    {ent.canonicalName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#6E7681]">None linked yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
