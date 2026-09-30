import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Layers,
  CheckCircle2,
  ArrowRight,
  Zap,
  ChevronRight,
} from 'lucide-react';
import type { KnowledgeTrail, CanonicalConcept, UserTrailProgress } from '../types/knowledge';
import { knowledgeTrailService, SEED_KNOWLEDGE_TRAILS } from '../services/knowledgeTrailService';
import { canonicalConceptService, SEED_CANONICAL_CONCEPTS } from '../services/canonicalConceptService';
import { userKnowledgeService } from '../services/userKnowledgeService';
import { toDomainKnowledgeTrail, toDomainConcept } from '../services/mappers/knowledgeMapper';
import { ConceptDetailModal } from './ConceptDetailModal';
import { KnowledgeTrailViewer } from './KnowledgeTrailViewer';

interface KnowledgeViewProps {
  userId?: string;
  onSelectStoryId?: (storyId: string) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  userId,
  onSelectStoryId: _onSelectStoryId,
}) => {
  const [activeTab, setActiveTab] = useState<'trails' | 'concepts'>('trails');
  const [selectedTrail, setSelectedTrail] = useState<KnowledgeTrail | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [userProgressMap, setUserProgressMap] = useState<Record<string, UserTrailProgress>>({});

  // All Trails & Concepts
  const allTrails = useMemo<KnowledgeTrail[]>(() => {
    const cached = knowledgeTrailService.getAllKnowledgeTrails();
    if (cached.length > 0) return cached;
    return SEED_KNOWLEDGE_TRAILS.map((t) => toDomainKnowledgeTrail(t));
  }, []);

  const allConcepts = useMemo<CanonicalConcept[]>(() => {
    const cached = canonicalConceptService.getAllCanonicalConcepts();
    if (cached.length > 0) return cached;
    return Object.values(SEED_CANONICAL_CONCEPTS).map((c) => toDomainConcept(c as any));
  }, []);

  // Unique categories for concepts
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allConcepts.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return ['All', ...Array.from(cats)];
  }, [allConcepts]);

  // Subscribe to user trail progress
  useEffect(() => {
    if (!userId) return;

    const unsubs = allTrails.map((trail) => {
      return userKnowledgeService.subscribeToTrailProgress(
        userId,
        trail.id,
        (progress) => {
          if (progress) {
            setUserProgressMap((prev) => ({ ...prev, [trail.id]: progress }));
          }
        },
        console.warn
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [userId, allTrails]);

  // Filtered concepts
  const filteredConcepts = useMemo(() => {
    if (selectedCategory === 'All') return allConcepts;
    return allConcepts.filter((c) => c.category === selectedCategory);
  }, [allConcepts, selectedCategory]);

  // Stats calculation
  const completedTrailsCount = useMemo(() => {
    return Object.values(userProgressMap).filter((p) => p.completedAt).length;
  }, [userProgressMap]);

  const activeTrailsCount = useMemo(() => {
    return Object.values(userProgressMap).filter((p) => !p.completedAt && (p.completedStepIds?.length || 0) > 0).length;
  }, [userProgressMap]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181B24] via-[#12141A] to-[#0D0E12] border border-[#232734] p-8 shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Structured Intelligence Foundations</span>
          </div>

          <h2 className="text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
            Knowledge Trails & Technical Foundations
          </h2>

          <p className="text-sm text-[#8B949E] leading-relaxed">
            Move beyond isolated headlines into rigorous understanding. Follow step-by-step concept sequences grounded in production stories across rocketry, semiconductors, monetary policy, and clean energy.
          </p>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#C9D1D9]">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span><strong>{allTrails.length}</strong> Curated Trails</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#C9D1D9]">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span><strong>{allConcepts.length}</strong> Authoritative Concepts</span>
            </div>
            {userId && (
              <>
                <div className="flex items-center gap-2 text-xs text-[#C9D1D9]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>{completedTrailsCount}</strong> Trails Completed</span>
                </div>
                {activeTrailsCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#C9D1D9]">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span><strong>{activeTrailsCount}</strong> In Progress</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#232734] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('trails')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'trails'
                ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20'
                : 'text-[#8B949E] hover:text-white hover:bg-[#181B22]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Guided Knowledge Trails ({allTrails.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('concepts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'concepts'
                ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20'
                : 'text-[#8B949E] hover:text-white hover:bg-[#181B22]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Concept Explorer ({allConcepts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KNOWLEDGE TRAILS */}
      {activeTab === 'trails' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {allTrails.map((trail) => {
            const userProg = userProgressMap[trail.id];
            const completedSteps = userProg?.completedStepIds?.length || 0;
            const isFinished = !!userProg?.completedAt;
            const progressPercent = Math.round((completedSteps / trail.steps.length) * 100);

            return (
              <div
                key={trail.id}
                onClick={() => setSelectedTrail(trail)}
                className="group p-6 rounded-2xl bg-[#12141A] border border-[#232734] hover:border-purple-500/50 cursor-pointer transition flex flex-col justify-between space-y-4 shadow-lg hover:shadow-2xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      {trail.steps.length} Concepts
                    </span>

                    {isFinished ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    ) : completedSteps > 0 ? (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {completedSteps}/{trail.steps.length} Steps ({progressPercent}%)
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition leading-snug">
                    {trail.title}
                  </h3>

                  <p className="text-xs text-[#8B949E] leading-relaxed line-clamp-2">
                    {trail.description}
                  </p>

                  {/* Step pills visualization */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {trail.steps.map((st, idx) => {
                      const isStepDone = userProg?.completedStepIds?.includes(st.conceptId);
                      return (
                        <span
                          key={st.conceptId + idx}
                          className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 ${
                            isStepDone
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold'
                              : 'bg-[#181B22] text-[#8B949E] border-[#232734]'
                          }`}
                        >
                          <span>{idx + 1}.</span>
                          <span className="truncate max-w-[120px]">{st.title}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#232734] flex items-center justify-between text-xs">
                  <span className="text-[#8B949E]">
                    {trail.relatedStoryIds.length > 0 ? 'Linked to real stories' : 'Foundational track'}
                  </span>
                  <button className="flex items-center gap-1.5 font-bold text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition">
                    <span>{completedSteps > 0 && !isFinished ? 'Continue Trail' : 'Open Trail'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CONCEPT EXPLORER */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-[#12141A] text-[#8B949E] hover:text-white border-[#232734] hover:bg-[#181B22]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Concepts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConcepts.map((concept) => (
              <div
                key={concept.id}
                onClick={() => setSelectedConceptId(concept.id)}
                className="group p-5 rounded-2xl bg-[#12141A] border border-[#232734] hover:border-emerald-500/50 cursor-pointer transition flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {concept.difficulty}
                    </span>
                    <span className="text-[10px] text-[#8B949E]">{concept.category}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                    {concept.name}
                  </h4>

                  <p className="text-xs text-[#8B949E] line-clamp-3 leading-relaxed">
                    {concept.shortDefinition}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#232734] flex items-center justify-between text-[11px] text-[#8B949E]">
                  <span>Explore concept</span>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals / Viewers */}
      {selectedConceptId && (
        <ConceptDetailModal
          conceptId={selectedConceptId}
          userId={userId}
          onClose={() => setSelectedConceptId(null)}
          onSelectConcept={(cid: string) => setSelectedConceptId(cid)}
        />
      )}

      {selectedTrail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <KnowledgeTrailViewer
              trail={selectedTrail}
              userId={userId}
              onSelectConcept={(cid: string) => {
                setSelectedTrail(null);
                setSelectedConceptId(cid);
              }}
              onClose={() => setSelectedTrail(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
