import React, { useEffect, useState } from 'react';
import {
  Layers,
  BookOpen,
  Sparkles,
  ArrowRight,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { Story, StoryThread } from '../types/domain';
import type { CanonicalConcept, KnowledgeTrail, UserKnowledge } from '../types/knowledge';
import { canonicalConceptService } from '../services/canonicalConceptService';
import { userKnowledgeService } from '../services/userKnowledgeService';
import { personalizationService } from '../services/personalizationService';
import { useAuth } from '../contexts/AuthContext';
import { ConceptDetailModal } from './ConceptDetailModal';

interface StoryConceptsPanelProps {
  story: Story;
  storyThread: StoryThread | null;
}

export const StoryConceptsPanel: React.FC<StoryConceptsPanelProps> = ({
  story,
  storyThread,
}) => {
  const { firebaseUser } = useAuth();
  const userId = firebaseUser?.uid || '';

  const [concepts, setConcepts] = useState<CanonicalConcept[]>([]);
  const [recommendedTrail, setRecommendedTrail] = useState<KnowledgeTrail | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [userKnowledgeMap, setUserKnowledgeMap] = useState<Record<string, UserKnowledge>>({});

  useEffect(() => {
    // 1. Extract concepts from current story
    const combinedText = [
      story.title,
      story.quickBrief?.quickSummary || '',
      story.fullStory?.whatHappened || '',
      story.fullStory?.whyThisMatters || '',
    ].join(' ');

    const extracted = canonicalConceptService.extractCanonicalConcepts(combinedText);
    setConcepts(extracted);

    // 2. Fetch personalized recommended trail
    const conceptIds = extracted.map(c => c.id);
    if (userId) {
      personalizationService
        .getRecommendedTrail(userId, conceptIds)
        .then(setRecommendedTrail)
        .catch(console.warn);
    }
  }, [story, storyThread, userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = userKnowledgeService.subscribeToAllConceptStates(
      userId,
      setUserKnowledgeMap,
      console.warn
    );
    return () => unsubscribe();
  }, [userId]);

  const handleMarkKnown = async (e: React.MouseEvent, conceptId: string) => {
    e.stopPropagation();
    if (!userId) return;
    await userKnowledgeService.markKnown(userId, conceptId);
  };

  const handleRequestBasics = async (e: React.MouseEvent, conceptId: string) => {
    e.stopPropagation();
    if (!userId) return;
    await userKnowledgeService.requestBasics(userId, conceptId);
  };

  const articleContext = {
    title: story.title,
    whatHappened: story.fullStory?.whatHappened,
    summary: story.quickBrief?.quickSummary,
  };

  const getStateBadge = (state?: string) => {
    switch (state) {
      case 'understood':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Understood
          </span>
        );
      case 'familiar':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Familiar
          </span>
        );
      case 'exposed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Learning
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Concept Detail Modal */}
      {selectedConceptId && (
        <ConceptDetailModal
          conceptId={selectedConceptId}
          articleContext={articleContext}
          userId={userId}
          onClose={() => setSelectedConceptId(null)}
          onSelectConcept={id => setSelectedConceptId(id)}
        />
      )}

      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#191D26] to-[#12141A] border border-[#232734] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Essential Concepts in this Story
            </h4>
            <p className="text-xs text-[#8B949E]">
              Key principles and technologies needed to understand this development
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#232734] text-[#C9D1D9]">
          {concepts.length} {concepts.length === 1 ? 'Concept' : 'Concepts'}
        </span>
      </div>

      {/* Personalized Recommended Knowledge Trail */}
      {recommendedTrail && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Recommended Learning Pathway
          </div>

          <div
            onClick={() => setSelectedConceptId(recommendedTrail.entryConceptId)}
            className="p-4 rounded-xl bg-[#161922] hover:bg-[#1C212D] border border-[#2B3142] hover:border-[#FF5A1F]/40 transition cursor-pointer flex items-center justify-between gap-4 group"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-white group-hover:text-[#FF5A1F] transition">
                {recommendedTrail.title}
              </div>
              {recommendedTrail.description && (
                <div className="text-[11px] text-[#8B949E] line-clamp-1">
                  {recommendedTrail.description}
                </div>
              )}
              <div className="text-[10px] text-[#6E7681]">
                {recommendedTrail.steps.length} steps • Starting from{' '}
                <span className="text-[#C9D1D9] font-medium">{recommendedTrail.steps[0]?.title}</span>
              </div>
            </div>

            <button
              className="p-2 rounded-xl bg-[#232734] group-hover:bg-[#FF5A1F] text-[#8B949E] group-hover:text-white transition shrink-0"
              title="Explore Knowledge Trail"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canonical Concepts List with Personal Familiarity Controls */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8B949E] flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#FF5A1F]" />
          Underlying Knowledge Base
        </div>

        {concepts.length > 0 ? (
          <div className="space-y-3">
            {concepts.map(concept => {
              const uKnowledge = userKnowledgeMap[concept.id];
              const isUnderstood = uKnowledge?.state === 'understood' || uKnowledge?.explicitUserState === 'know_this';

              return (
                <div
                  key={concept.id}
                  onClick={() => setSelectedConceptId(concept.id)}
                  className="p-4 rounded-xl bg-[#12141A] hover:bg-[#161922] border border-[#232734] hover:border-[#FF5A1F]/40 transition cursor-pointer group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#232734] text-[#8B949E]">
                        {concept.category}
                      </span>
                      {getStateBadge(uKnowledge?.state)}
                      <h5 className="text-sm font-bold text-white group-hover:text-[#FF5A1F] transition">
                        {concept.name}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {userId && (
                        <>
                          {isUnderstood ? (
                            <button
                              onClick={(e) => handleRequestBasics(e, concept.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#191D26] hover:bg-[#232734] text-[#8B949E] hover:text-white border border-[#2B3142] transition"
                              title="Explain from basics"
                            >
                              Explain from basics
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleMarkKnown(e, concept.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#191D26] hover:bg-emerald-950 text-[#8B949E] hover:text-emerald-400 border border-[#2B3142] hover:border-emerald-600/40 transition flex items-center gap-1"
                              title="Mark as known"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              I know this
                            </button>
                          )}
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#8B949E] group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  <p className="text-xs text-[#C9D1D9] leading-relaxed line-clamp-2">
                    {concept.shortDefinition}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[#12141A] border border-[#232734] text-[#8B949E]">
            <Layers className="w-8 h-8 mx-auto mb-2 text-[#6E7681]" />
            <p className="text-xs">No specialized technical concepts detected in this article.</p>
          </div>
        )}
      </div>
    </div>
  );
};
