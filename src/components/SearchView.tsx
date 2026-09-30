import React, { useState, useMemo, useEffect } from 'react';
import {
  Search as SearchIcon,
  X,
  Building2,
  BookOpen,
  Compass,
  ArrowRight,
  ExternalLink,
  Layers,
  Bookmark,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { Story } from '../types/domain';
import type { CanonicalConcept, CanonicalEntity, KnowledgeTrail } from '../types/knowledge';
import { canonicalConceptService } from '../services/canonicalConceptService';
import { canonicalEntityService } from '../services/canonicalEntityService';
import { knowledgeTrailService } from '../services/knowledgeTrailService';
import { ConceptDetailModal } from './ConceptDetailModal';
import { KnowledgeTrailViewer } from './KnowledgeTrailViewer';

interface SearchViewProps {
  stories: Story[];
  userId?: string;
  onSelectStory: (story: Story) => void;
  onToggleBookmark: (story: Story) => void;
}

type SearchCategory = 'all' | 'stories' | 'entities' | 'concepts' | 'trails';

export const SearchView: React.FC<SearchViewProps> = ({
  stories,
  userId,
  onSelectStory,
  onToggleBookmark,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<KnowledgeTrail | null>(null);

  const [entities, setEntities] = useState<CanonicalEntity[]>([]);
  const [concepts, setConcepts] = useState<CanonicalConcept[]>([]);
  const [trails, setTrails] = useState<KnowledgeTrail[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
  const [isLoadingTrails, setIsLoadingTrails] = useState(true);

  // Subscribe to live canonical data from Firestore (ZERO seeds in production)
  useEffect(() => {
    setIsLoadingEntities(true);
    const unsubEntities = canonicalEntityService.subscribeToEntities(
      (data) => {
        setEntities(data);
        setIsLoadingEntities(false);
      },
      () => setIsLoadingEntities(false)
    );

    setIsLoadingConcepts(true);
    const unsubConcepts = canonicalConceptService.subscribeToConcepts(
      (data) => {
        setConcepts(data);
        setIsLoadingConcepts(false);
      },
      () => setIsLoadingConcepts(false)
    );

    setIsLoadingTrails(true);
    const unsubTrails = knowledgeTrailService.subscribeToTrails(
      (data) => {
        setTrails(data);
        setIsLoadingTrails(false);
      },
      () => setIsLoadingTrails(false)
    );

    return () => {
      unsubEntities();
      unsubConcepts();
      unsubTrails();
    };
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        matchedStories: stories.slice(0, 6),
        matchedEntities: entities.slice(0, 4),
        matchedConcepts: concepts.slice(0, 6),
        matchedTrails: trails.slice(0, 3),
        totalCount: stories.length + entities.length + concepts.length + trails.length,
      };
    }

    const matchedStories = stories.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.quickBrief?.quickSummary?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.quickBrief?.threeThingsToKnow?.some((k) => k.toLowerCase().includes(q)) ||
        s.fullStory?.whatHappened?.toLowerCase().includes(q) ||
        s.fullStory?.takeaways?.some((t) => t.toLowerCase().includes(q))
      );
    });

    const matchedEntities = entities.filter((e) => {
      return (
        e.canonicalName.toLowerCase().includes(q) ||
        e.shortDescription?.toLowerCase().includes(q) ||
        e.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        e.type?.toLowerCase().includes(q)
      );
    });

    const matchedConcepts = concepts.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortDefinition?.toLowerCase().includes(q) ||
        c.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        c.category?.toLowerCase().includes(q)
      );
    });

    const matchedTrails = trails.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.steps.some((st) => st.title.toLowerCase().includes(q) || (st.explanation && st.explanation.toLowerCase().includes(q)))
      );
    });

    const totalCount =
      matchedStories.length +
      matchedEntities.length +
      matchedConcepts.length +
      matchedTrails.length;

    return {
      matchedStories,
      matchedEntities,
      matchedConcepts,
      matchedTrails,
      totalCount,
    };
  }, [query, stories, entities, concepts, trails]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Header & Search Bar */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            Universal Search
          </h2>
          <p className="text-sm text-[#8B949E] mt-1">
            Search across verified intelligence articles, canonical entities, technical concepts, and knowledge trails.
          </p>
        </div>

        {/* Input bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8B949E]">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories, entities, technologies, or concepts..."
            className="w-full pl-12 pr-10 py-3.5 bg-[#12141A] border border-[#232734] rounded-2xl text-white placeholder-[#8B949E] text-sm focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F] transition shadow-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#8B949E] hover:text-white transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Results', count: searchResults.totalCount },
            { id: 'stories', label: 'Stories & Articles', count: searchResults.matchedStories.length },
            { id: 'entities', label: 'Entities & Orgs', count: searchResults.matchedEntities.length },
            { id: 'concepts', label: 'Concepts & Tech', count: searchResults.matchedConcepts.length },
            { id: 'trails', label: 'Knowledge Trails', count: searchResults.matchedTrails.length },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as SearchCategory)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${
                  isActive
                    ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-md shadow-[#FF5A1F]/20'
                    : 'bg-[#12141A] text-[#8B949E] hover:text-white border-[#232734] hover:bg-[#181B22]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-[#1F2430] text-[#8B949E]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Content */}
      <div className="space-y-10">
        {/* SECTION: STORIES & ARTICLES */}
        {(selectedCategory === 'all' || selectedCategory === 'stories') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF5A1F]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F0F3F6]">
                  Verified Intelligence Stories ({searchResults.matchedStories.length})
                </h3>
              </div>
            </div>

            {searchResults.matchedStories.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E]">
                {query ? `No stories matching "${query}"` : 'No stories available.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.matchedStories.map((story) => (
                  <div
                    key={story.id}
                    className="group bg-[#12141A] border border-[#232734] hover:border-[#FF5A1F]/50 rounded-2xl p-4 flex flex-col justify-between transition shadow-md hover:shadow-xl relative cursor-pointer"
                    onClick={() => onSelectStory(story)}
                  >
                    <div className="space-y-3">
                      {story.heroImage && (
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-[#181B22]">
                          <img
                            src={story.heroImage}
                            alt={story.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#181B22] border border-[#232734] text-[10px] font-bold text-[#FF5A1F] uppercase tracking-wide">
                          {story.category || 'Intelligence'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(story);
                          }}
                          className={`p-1.5 rounded-lg border transition ${
                            story.isSaved
                              ? 'bg-[#FF5A1F]/10 border-[#FF5A1F] text-[#FF5A1F]'
                              : 'bg-[#181B22] border-[#232734] text-[#8B949E] hover:text-white'
                          }`}
                          title="Save story"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${story.isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-[#FF5A1F] transition line-clamp-2 leading-snug">
                        {story.title}
                      </h4>

                      <p className="text-xs text-[#8B949E] line-clamp-2 leading-relaxed">
                        {story.quickBrief?.quickSummary || story.fullStory?.whatHappened}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#232734] flex items-center justify-between text-[11px] text-[#8B949E]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{story.estimatedReadTime || 3} min read</span>
                      </div>
                      <span className="text-[#FF5A1F] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: ENTITIES & ORGANIZATIONS */}
        {(selectedCategory === 'all' || selectedCategory === 'entities') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F0F3F6]">
                Canonical Entities & Institutions ({searchResults.matchedEntities.length})
              </h3>
            </div>

            {isLoadingEntities ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E]">
                Loading canonical entities...
              </div>
            ) : searchResults.matchedEntities.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E] space-y-1">
                <Info className="w-4 h-4 mx-auto text-[#8B949E]" />
                <p>{query ? `No canonical entities matching "${query}"` : 'No canonical entities published yet in Firestore.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.matchedEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className="p-4 rounded-2xl bg-[#12141A] border border-[#232734] hover:border-cyan-500/40 transition space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                          {entity.type}
                        </span>
                        <h4 className="text-sm font-bold text-white">{entity.canonicalName}</h4>
                      </div>
                      {entity.externalIds?.officialUrl && (
                        <a
                          href={entity.externalIds.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B949E] hover:text-cyan-400 transition"
                          title="Visit official portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-[#C9D1D9] leading-relaxed">
                      {entity.shortDescription}
                    </p>

                    {entity.aliases && entity.aliases.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entity.aliases.slice(0, 4).map((alias) => (
                          <span
                            key={alias}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[#181B22] text-[#8B949E]"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: CONCEPTS & TECHNOLOGIES */}
        {(selectedCategory === 'all' || selectedCategory === 'concepts') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F0F3F6]">
                Technical Concepts & Principles ({searchResults.matchedConcepts.length})
              </h3>
            </div>

            {isLoadingConcepts ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E]">
                Loading canonical concepts...
              </div>
            ) : searchResults.matchedConcepts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E] space-y-1">
                <Info className="w-4 h-4 mx-auto text-[#8B949E]" />
                <p>{query ? `No canonical concepts matching "${query}"` : 'No canonical technical concepts published yet in Firestore.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.matchedConcepts.map((concept) => (
                  <div
                    key={concept.id}
                    onClick={() => setSelectedConceptId(concept.id)}
                    className="group p-4 rounded-2xl bg-[#12141A] border border-[#232734] hover:border-emerald-500/50 cursor-pointer transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
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

                    <div className="pt-2 border-t border-[#232734] flex items-center justify-between text-[11px] text-[#8B949E]">
                      <span>Inspect definition</span>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: KNOWLEDGE TRAILS */}
        {(selectedCategory === 'all' || selectedCategory === 'trails') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F0F3F6]">
                Structured Knowledge Trails ({searchResults.matchedTrails.length})
              </h3>
            </div>

            {isLoadingTrails ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E]">
                Loading knowledge trails...
              </div>
            ) : searchResults.matchedTrails.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12141A] border border-[#232734] text-center text-xs text-[#8B949E] space-y-1">
                <Info className="w-4 h-4 mx-auto text-[#8B949E]" />
                <p>{query ? `No knowledge trails matching "${query}"` : 'No published knowledge trails available yet in Firestore.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.matchedTrails.map((trail) => (
                  <div
                    key={trail.id}
                    onClick={() => setSelectedTrail(trail)}
                    className="group p-5 rounded-2xl bg-[#12141A] border border-[#232734] hover:border-purple-500/50 cursor-pointer transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        {trail.steps.length} Steps
                      </span>
                      <span className="text-xs text-purple-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
                        Start Trail <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                      {trail.title}
                    </h4>

                    <p className="text-xs text-[#8B949E] line-clamp-2 leading-relaxed">
                      {trail.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals / Viewers */}
      {selectedConceptId && (
        <ConceptDetailModal
          conceptId={selectedConceptId}
          userId={userId}
          onClose={() => setSelectedConceptId(null)}
          onSelectConcept={(cid) => setSelectedConceptId(cid)}
        />
      )}

      {selectedTrail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <KnowledgeTrailViewer
              trail={selectedTrail}
              userId={userId}
              onSelectConcept={(cid) => {
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
