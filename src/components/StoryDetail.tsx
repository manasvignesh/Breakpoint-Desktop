import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Share2,
  Quote as QuoteIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserCheck,
  Bot,
  CheckCircle2,
  FastForward,
  GitBranch,
  GraduationCap,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { LanguageSelector } from './LanguageSelector';
import { MedhaContextPanel } from './MedhaContextPanel';
import { TextSelectionToolbar } from './TextSelectionToolbar';
import { StoryTimelinePanel } from './StoryTimelinePanel';
import { SinceYouLastReadBanner } from './SinceYouLastReadBanner';
import { StoryConceptsPanel } from './StoryConceptsPanel';
import { isFollowingUser, toggleFollowUser } from '../services/followService';
import {
  markArticleOpened,
  subscribeToReadingState,
  updateAudioPosition,
  setArticleLanguageState,
  ThrottledReadingStateWriter,
} from '../services/readingStateService';
import { getStoryThread } from '../services/storyThreadService';
import { storyTimelineService } from '../services/storyTimelineService';
import { useAuth } from '../contexts/AuthContext';
import { openExternalUrl } from '../utils/openExternal';
import type { Story, ReadingState, StoryThread, SinceYouLastReadResult } from '../types/domain';


interface StoryDetailProps {
  story: Story;
  onBack: () => void;
  onToggleBookmark?: (story: Story) => void;
  onLanguageChange?: (lang: string) => void;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({
  story,
  onBack,
  onToggleBookmark,
  onLanguageChange,
}) => {
  const { firebaseUser } = useAuth();
  const articleContentRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });
  const [activeView, setActiveView] = useState<'full' | 'quick'>('full');
  const [contextTab, setContextTab] = useState<'overview' | 'timeline' | 'concepts' | 'sources' | 'ask'>('overview');
  const [isMedhaOpen, setIsMedhaOpen] = useState(false);
  const [selectedTextForMedha, setSelectedTextForMedha] = useState<string>('');
  const [medhaInitialPrompt, setMedhaInitialPrompt] = useState<string>('');
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  // Reading State & Timeline Management
  const [readingState, setReadingState] = useState<ReadingState | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [hasJumpedToResume, setHasJumpedToResume] = useState<boolean>(false);
  const [storyThread, setStoryThread] = useState<StoryThread | null>(null);
  const [sinceLastRead, setSinceLastRead] = useState<SinceYouLastReadResult | null>(null);
  const writerRef = useRef<ThrottledReadingStateWriter | null>(null);

  const full = story.fullStory;
  const quick = story.quickBrief;

  // 0. Fetch parent StoryThread & Since You Last Read deltas (Phase 16B/16C)
  useEffect(() => {
    if (!story.storyId) {
      setStoryThread(null);
      setSinceLastRead(null);
      return;
    }
    getStoryThread(story.storyId)
      .then((thread) => {
        setStoryThread(thread);
        if (firebaseUser && thread) {
          storyTimelineService
            .getChangesSinceLastRead(firebaseUser.uid, story.storyId!)
            .then(setSinceLastRead)
            .catch(console.warn);
        }
      })
      .catch((err) => console.warn('[StoryDetail] Failed to load story thread:', err));
  }, [story.storyId, firebaseUser]);

  // 1. Author follow status
  useEffect(() => {
    if (!firebaseUser || !story.author.id || firebaseUser.uid === story.author.id) {
      setIsFollowingAuthor(false);
      return;
    }
    isFollowingUser(firebaseUser.uid, story.author.id).then(setIsFollowingAuthor);
  }, [firebaseUser, story.author.id]);


  // 2. Mark article opened & subscribe to reading state
  useEffect(() => {
    if (!firebaseUser) {
      setReadingState(null);
      return;
    }

    // Mark opened on meaningful mount
    markArticleOpened(
      firebaseUser.uid,
      story.id,
      (story.activeLanguage as 'en' | 'hi' | 'te') || 'en',
    ).catch(console.warn);

    // Subscribe to cloud reading state
    const unsubscribe = subscribeToReadingState(
      firebaseUser.uid,
      story.id,
      (state) => {
        setReadingState(state);
        if (state && !writerRef.current) {
          writerRef.current = new ThrottledReadingStateWriter(
            firebaseUser.uid,
            story.id,
            state.progress,
          );
          setCurrentProgress(state.progress);
        }
      },
      (err) => console.warn('[StoryDetail] Reading state subscription error:', err),
    );

    if (!writerRef.current) {
      writerRef.current = new ThrottledReadingStateWriter(firebaseUser.uid, story.id, 0);
    }

    return () => {
      unsubscribe();
      if (writerRef.current) {
        writerRef.current.destroy();
        writerRef.current = null;
      }
    };
  }, [firebaseUser, story.id, story.activeLanguage]);

  // 3. Scroll tracking with debounced writer
  const handleScroll = useCallback(() => {
    const el = document.documentElement || document.body;
    const scrollTop = window.scrollY || el.scrollTop;
    const scrollHeight = el.scrollHeight - window.innerHeight;

    if (scrollHeight <= 0) return;
    const progress = Math.max(0.0, Math.min(1.0, scrollTop / scrollHeight));

    setCurrentProgress((prev) => Math.max(prev, progress));
    if (writerRef.current) {
      writerRef.current.recordProgress(progress);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleResumeReading = () => {
    if (!readingState || readingState.progress <= 0) return;
    const el = document.documentElement || document.body;
    const scrollHeight = el.scrollHeight - window.innerHeight;
    const targetScroll = scrollHeight * readingState.progress;

    window.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
    setHasJumpedToResume(true);
  };

  const handleLanguageSwitch = (lang: string) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
    if (firebaseUser && (lang === 'en' || lang === 'hi' || lang === 'te')) {
      setArticleLanguageState(firebaseUser.uid, story.id, lang).catch(console.warn);
    }
  };

  const handleAudioCheckpoint = (positionSeconds: number, durationSeconds: number) => {
    if (!firebaseUser) return;
    updateAudioPosition(firebaseUser.uid, story.id, positionSeconds, durationSeconds).catch(
      console.warn,
    );
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Recently published';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleToolbarAction = (
    actionType: 'explain' | 'why_it_matters' | 'background' | 'ask',
    text: string,
  ) => {
    setSelectedTextForMedha(text);
    setIsMedhaOpen(true);
    if (actionType === 'explain') {
      setMedhaInitialPrompt(`Explain "${text}" simply based on this story.`);
    } else if (actionType === 'why_it_matters') {
      setMedhaInitialPrompt(`Why does "${text}" matter in this context?`);
    } else if (actionType === 'background') {
      setMedhaInitialPrompt(`Provide background on "${text}" related to this topic.`);
    } else {
      setMedhaInitialPrompt(`What can you tell me about "${text}"?`);
    }
  };

  const handleToggleFollowAuthor = async () => {
    if (!firebaseUser || !story.author.id) return;
    try {
      const nextState = !isFollowingAuthor;
      setIsFollowingAuthor(nextState);
      await toggleFollowUser(firebaseUser.uid, story.author.id, nextState);
    } catch (err) {
      console.error('[StoryDetail] Follow toggle failed:', err);
      setIsFollowingAuthor(!isFollowingAuthor);
    }
  };

  const showResumeBanner =
    !hasJumpedToResume &&
    readingState &&
    readingState.progress >= 0.15 &&
    readingState.progress < 0.90 &&
    currentProgress < 0.10;

  return (
    <div className="relative flex min-h-screen" ref={scrollContainerRef}>
      {/* Top Reading Progress Bar (Fixed) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-[#232734]/40">
        <div
          className="h-full bg-gradient-to-r from-[#FF5A1F] to-[#FF8A50] transition-all duration-150"
          style={{ width: `${Math.round(currentProgress * 100)}%` }}
        />
      </div>

      {/* Main Article Reading Area */}
      <div className="flex-1 max-w-4xl mx-auto pb-24 px-4 transition-all">
        {/* Navigation & Action Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between py-4 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-[#232734] mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12141A] hover:bg-[#181B22] border border-[#232734] text-sm text-[#C9D1D9] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stories</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Ask MEDHA AI Trigger Button */}
            <button
              onClick={() => setIsMedhaOpen(!isMedhaOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isMedhaOpen
                  ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                  : 'bg-[#12141A] hover:bg-[#181B22] border-[#FF5A1F]/50 text-[#FF5A1F]'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>MEDHA AI</span>
            </button>

            {onLanguageChange && (
              <LanguageSelector
                currentLanguage={story.activeLanguage}
                onChange={handleLanguageSwitch}
                availableLanguages={story.availableLanguages}
              />
            )}

            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(story)}
                className={`p-2 rounded-xl border transition ${
                  story.isSaved
                    ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-[#FF5A1F]'
                    : 'bg-[#12141A] border-[#232734] text-[#8B949E] hover:text-white'
                }`}
                title={story.isSaved ? 'Remove from saved' : 'Save story'}
              >
                <Bookmark className={`w-4 h-4 ${story.isSaved ? 'fill-[#FF5A1F]' : ''}`} />
              </button>
            )}

            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="p-2 rounded-xl bg-[#12141A] border border-[#232734] text-[#8B949E] hover:text-white transition"
              title="Copy link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Text Selection Floating Action Toolbar */}
        <TextSelectionToolbar
          containerRef={articleContentRef}
          onAction={handleToolbarAction}
        />

        {/* Resume Reading Subtle Banner */}
        {showResumeBanner && (
          <div className="mb-6 p-3.5 bg-gradient-to-r from-[#FF5A1F]/10 to-[#12141A] border border-[#FF5A1F]/30 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <FastForward className="w-4 h-4 text-[#FF5A1F]" />
              <span className="text-xs text-[#C9D1D9]">
                You previously read <strong className="text-white">{Math.round(readingState!.progress * 100)}%</strong> of this story.
              </span>
            </div>
            <button
              onClick={handleResumeReading}
              className="px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white text-xs font-semibold shadow-sm transition"
            >
              Resume where you left off
            </button>
          </div>
        )}

        {/* Since You Last Read Banner (Phase 16C) */}
        {sinceLastRead && sinceLastRead.meaningfulChangeCount > 0 && (
          <SinceYouLastReadBanner
            changes={sinceLastRead.changes}
            lastReadAt={sinceLastRead.lastReadAt}
            onViewTimeline={() => setContextTab('timeline')}
          />
        )}

        {/* Context Navigation Tabs (Overview, Timeline, Sources, Ask) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 p-1 bg-[#12141A] border border-[#232734] rounded-2xl w-fit">
            <button
              onClick={() => setContextTab('overview')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
                contextTab === 'overview'
                  ? 'bg-[#FF5A1F] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
            >
              Overview
            </button>

            {story.storyId && (
              <button
                onClick={() => setContextTab('timeline')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  contextTab === 'timeline'
                    ? 'bg-[#FF5A1F] text-white shadow-sm'
                    : 'text-[#8B949E] hover:text-[#F0F3F6]'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
            )}

            <button
              onClick={() => setContextTab('concepts')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                contextTab === 'concepts'
                  ? 'bg-[#FF5A1F] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Concepts</span>
            </button>

            <button
              onClick={() => setContextTab('sources')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
                contextTab === 'sources'
                  ? 'bg-[#FF5A1F] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
            >
              Sources
            </button>

            <button
              onClick={() => setIsMedhaOpen(!isMedhaOpen)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                isMedhaOpen
                  ? 'bg-[#FF5A1F] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask MEDHA</span>
            </button>
          </div>

          {contextTab === 'overview' && (
            <div className="flex items-center gap-2 p-1 bg-[#12141A] border border-[#232734] rounded-2xl w-fit">
              <button
                onClick={() => setActiveView('full')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                  activeView === 'full'
                    ? 'bg-[#232734] text-white shadow-sm'
                    : 'text-[#8B949E] hover:text-[#F0F3F6]'
                }`}
              >
                Full Story
              </button>
              <button
                onClick={() => setActiveView('quick')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                  activeView === 'quick'
                    ? 'bg-[#232734] text-white shadow-sm'
                    : 'text-[#8B949E] hover:text-[#F0F3F6]'
                }`}
              >
                Quick Brief
              </button>
            </div>
          )}

          {readingState?.isCompleted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </div>
          )}
        </div>


        {/* Article Container for selection toolbar */}
        <div ref={articleContentRef}>
          {/* Main Header */}
          <header className="mb-8">
            {storyThread && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161922] border border-[#232734] text-xs text-[#8B949E]">
                <GitBranch className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Part of an ongoing story:</span>
                <strong className="text-white font-medium">{storyThread.title}</strong>
                {storyThread.articleCount > 1 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#232734] text-[10px] text-[#A0AEC0] font-semibold">
                    {storyThread.articleCount} updates
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 text-xs font-semibold text-[#FF5A1F] uppercase tracking-wider">
                {story.category}
              </span>
              {story.isTodaysDrop && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FF5A1F] text-xs font-semibold text-white">
                  <Sparkles className="w-3 h-3" />
                  Today's Drop
                </span>
              )}
              <span className="text-xs text-[#8B949E]">
                {formatDate(story.attribution.publishedAt)}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-[#F0F3F6] leading-tight mb-4">
              {full.headline || story.title}
            </h1>

            <p className="text-lg md:text-xl text-[#C9D1D9] font-medium leading-relaxed mb-6">
              {full.hook || quick.quickSummary}
            </p>

            {/* Author / Creator Card with Follow */}
            <div className="flex items-center justify-between p-3.5 bg-[#12141A] border border-[#232734] rounded-2xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40 flex items-center justify-center font-bold text-sm">
                  {story.author.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F0F3F6]">
                    {story.author.name}
                  </h4>
                  <p className="text-xs text-[#8B949E]">
                    {story.attribution.publisherName} · {story.estimatedReadTime} min read
                  </p>
                </div>
              </div>

              {story.author.id && firebaseUser && firebaseUser.uid !== story.author.id && (
                <button
                  onClick={handleToggleFollowAuthor}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isFollowingAuthor
                      ? 'bg-[#232734] text-[#C9D1D9] hover:bg-red-950/40 hover:text-red-400'
                      : 'bg-[#FF5A1F] text-white shadow-sm'
                  }`}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow Author</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Canonical Audio Player with Checkpointing */}
            <div className="mb-6">
              <AudioPlayer
                audioTrack={story.audioTrack}
                title={story.title}
                initialPositionSeconds={readingState?.lastAudioPositionSeconds || 0}
                onAudioCheckpoint={handleAudioCheckpoint}
              />
            </div>
          </header>

          {/* Hero Media */}
          {story.heroImage && (
            <div className="relative rounded-2xl overflow-hidden mb-10 border border-[#232734] max-h-96">
              <img
                src={story.heroImage}
                alt={story.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* VIEW: TIMELINE TAB */}
          {contextTab === 'timeline' && story.storyId && (
            <div className="py-2">
              <StoryTimelinePanel storyId={story.storyId} />
            </div>
          )}

          {/* VIEW: CONCEPTS TAB (Phase 16D) */}
          {contextTab === 'concepts' && (
            <div className="py-2">
              <StoryConceptsPanel story={story} storyThread={storyThread} />
            </div>
          )}

          {/* VIEW: SOURCES TAB */}
          {contextTab === 'sources' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-[#12141A] border border-[#232734] rounded-2xl space-y-4">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
                  Source Attributions & Provenance
                </h3>
                <div className="space-y-3 text-sm text-[#C9D1D9]">
                  <div className="flex items-center justify-between p-3 bg-[#181B22] rounded-xl border border-[#232734]">
                    <div>
                      <span className="text-xs text-[#8B949E] block">Primary Publisher</span>
                      <strong className="text-white">{story.attribution.publisherName}</strong>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#232734] text-xs font-semibold uppercase text-[#C9D1D9]">
                      {story.attribution.sourceType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#181B22] rounded-xl border border-[#232734]">
                    <div>
                      <span className="text-xs text-[#8B949E] block">Editorial Desk</span>
                      <strong className="text-white">{story.attribution.editor}</strong>
                    </div>
                    <span className="text-xs text-[#8B949E]">
                      {story.attribution.isOriginal ? 'Original Verification' : 'Verified Partner'}
                    </span>
                  </div>

                  {story.attribution.sourceUrl && (
                    <div className="p-3 bg-[#181B22] rounded-xl border border-[#232734] flex items-center justify-between">
                      <span className="text-xs text-[#8B949E]">Original Publication Link</span>
                      <a
                        href={story.attribution.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          openExternalUrl(story.attribution.sourceUrl);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-[#FF5A1F] hover:underline cursor-pointer"
                      >
                        <span>Open External Article</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {storyThread && storyThread.articleIds.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-[#232734]">
                      <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">
                        Member Articles in This Story Thread ({storyThread.articleIds.length})
                      </h4>
                      <div className="space-y-1.5">
                        {storyThread.articleIds.map((artId, idx) => (
                          <div
                            key={artId}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              artId === story.id
                                ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-white font-medium'
                                : 'bg-[#0F1015] border-[#232734] text-[#8B949E]'
                            }`}
                          >
                            <span>Article #{idx + 1}: {artId}</span>
                            {artId === story.id && (
                              <span className="text-[10px] text-[#FF5A1F] font-bold uppercase">
                                Currently Viewing
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: OVERVIEW -> QUICK BRIEF DECK VIEW */}
          {contextTab === 'overview' && activeView === 'quick' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-[#12141A] border border-[#232734] rounded-2xl space-y-4">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
                  Quick Summary
                </h3>
                <p className="text-base text-[#F0F3F6] leading-relaxed">
                  {quick.quickSummary}
                </p>
              </div>

              {quick.keyNumber && (
                <div className="p-6 bg-gradient-to-br from-[#181B22] to-[#12141A] border border-[#FF5A1F]/30 rounded-2xl">
                  <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider block mb-1">
                    Key Metric
                  </span>
                  <div className="text-3xl font-extrabold text-[#FF5A1F] font-mono mb-1">
                    {quick.keyNumber.value}
                  </div>
                  <p className="text-xs text-[#C9D1D9]">
                    {quick.keyNumber.label}
                  </p>
                </div>
              )}

              <div className="p-6 bg-[#12141A] border border-[#232734] rounded-2xl space-y-4">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
                  3 Things You Need To Know
                </h3>
                <ul className="space-y-3">
                  {quick.threeThingsToKnow.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-[#C9D1D9] leading-relaxed">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* VIEW: OVERVIEW -> FULL STORY DEEP DIVE */}
          {contextTab === 'overview' && activeView === 'full' && (
            <main className="space-y-10 animate-fadeIn text-[#C9D1D9]">

              {/* In 20 Seconds Section */}
              {full.in20Seconds && (
                <section className="p-6 bg-gradient-to-r from-[#181B22] to-[#12141A] border-l-4 border-l-[#FF5A1F] border border-[#232734] rounded-2xl space-y-2">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
                    In 20 Seconds
                  </h3>
                  <p className="text-base text-[#F0F3F6] leading-relaxed font-medium">
                    {full.in20Seconds}
                  </p>
                </section>
              )}

              {/* Key Stats Bar (if multiple stats available) */}
              {full.keyStats.length > 0 && (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {full.keyStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#12141A] border border-[#232734] rounded-2xl flex flex-col justify-between"
                    >
                      <div className="text-2xl font-extrabold text-[#FF5A1F] font-mono mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs text-[#8B949E] leading-snug">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* What Happened Breakdown */}
              {full.whatHappened && (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold font-display text-[#F0F3F6] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#FF5A1F] rounded-full" />
                    What Happened
                  </h2>
                  <div className="text-base text-[#C9D1D9] leading-loose space-y-4 whitespace-pre-line">
                    {full.whatHappened}
                  </div>
                </section>
              )}

              {/* Pull Quote Card (Schema v2) */}
              {full.quote && (
                <section className="p-6 bg-[#181B22] border border-[#FF5A1F]/30 rounded-2xl relative overflow-hidden">
                  <QuoteIcon className="absolute top-4 right-4 w-16 h-16 text-[#FF5A1F]/10 pointer-events-none" />
                  <blockquote className="text-lg font-serif italic text-[#F0F3F6] leading-relaxed mb-4 relative z-10">
                    "{full.quote.text}"
                  </blockquote>
                  <div className="flex items-center gap-2 text-xs">
                    <strong className="text-[#FF5A1F] font-semibold">{full.quote.speaker}</strong>
                    {full.quote.role && (
                      <span className="text-[#8B949E]">· {full.quote.role}</span>
                    )}
                  </div>
                </section>
              )}

              {/* Why This Matters Section */}
              {full.whyThisMatters && (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold font-display text-[#F0F3F6] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#FF5A1F] rounded-full" />
                    Why This Matters
                  </h2>
                  <div className="text-base text-[#C9D1D9] leading-loose space-y-4 whitespace-pre-line">
                    {full.whyThisMatters}
                  </div>
                </section>
              )}

              {/* Structured Explore Sections Accordions */}
              {full.exploreSections.length > 0 && (
                <section className="space-y-4 pt-4 border-t border-[#232734]">
                  <h2 className="text-xl font-bold font-display text-[#F0F3F6] mb-6">
                    In-Depth Analysis & Background
                  </h2>
                  <div className="space-y-3">
                    {full.exploreSections.map((sec, idx) => {
                      const isExpanded = expandedSections[idx] ?? false;
                      return (
                        <div
                          key={idx}
                          className="bg-[#12141A] border border-[#232734] rounded-2xl overflow-hidden transition"
                        >
                          <button
                            onClick={() => toggleSection(idx)}
                            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#181B22] transition"
                          >
                            <span className="text-sm md:text-base font-bold text-[#F0F3F6]">
                              {sec.title}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#8B949E]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#8B949E]" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-5 pt-0 border-t border-[#232734]/40 text-sm text-[#C9D1D9] leading-relaxed space-y-3">
                              {sec.summary && (
                                <p className="font-medium text-[#F0F3F6] bg-[#181B22] p-3 rounded-xl">
                                  {sec.summary}
                                </p>
                              )}
                              {sec.content && (
                                <div className="space-y-2 whitespace-pre-line">
                                  {sec.content}
                                </div>
                              )}
                              {sec.items && sec.items.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                  {sec.items.map((item, itemIdx) => (
                                    <div
                                      key={itemIdx}
                                      className="p-3 bg-[#0F1015] border border-[#232734] rounded-xl"
                                    >
                                      <h5 className="text-xs font-bold text-[#F0F3F6] mb-1">
                                        {item.title}
                                      </h5>
                                      <p className="text-xs text-[#8B949E]">
                                        {item.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Key Takeaways */}
              {full.takeaways.length > 0 && (
                <section className="p-6 bg-[#12141A] border border-[#232734] rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#FF5A1F]">
                    Key Takeaways
                  </h3>
                  <ul className="space-y-3">
                    {full.takeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#FF5A1F] shrink-0 mt-2" />
                        <p className="text-sm text-[#F0F3F6] leading-relaxed">
                          {takeaway}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Editorial Attribution Footer */}
              <footer className="p-5 bg-[#0F1015] border border-[#232734] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#8B949E]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A1F]" />
                  <span>
                    {story.attribution.isOriginal ? (
                      <strong className="text-[#C9D1D9]">Breakpoint Original Reporting</strong>
                    ) : (
                      <>
                        Reported by <strong className="text-[#C9D1D9]">{story.attribution.publisherName}</strong>
                      </>
                    )}
                    {' · '}Edited by <strong className="text-[#C9D1D9]">{story.attribution.editor}</strong>
                  </span>
                </div>

                {story.attribution.sourceUrl && (
                  <a
                    href={story.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openExternalUrl(story.attribution.sourceUrl);
                    }}
                    className="flex items-center gap-1.5 text-[#FF5A1F] hover:underline cursor-pointer"
                  >
                    <span>View Original Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </footer>
            </main>
          )}
        </div>
      </div>

      {/* Right Side MEDHA Context Panel (Collapsible/Side-by-side) */}
      {isMedhaOpen && (
        <MedhaContextPanel
          story={story}
          selectedText={selectedTextForMedha}
          onClearSelectedText={() => setSelectedTextForMedha('')}
          onClose={() => setIsMedhaOpen(false)}
          initialPrompt={medhaInitialPrompt}
        />
      )}
    </div>
  );
};
