import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useArticles } from './hooks/useArticles';
import { AppShell } from './components/AppShell';
import { StoryFeed } from './components/StoryFeed';
import { StoryDetail } from './components/StoryDetail';
import { LibraryView } from './components/LibraryView';
import { DailyBriefView } from './components/DailyBriefView';
import { DailyBriefViewer } from './components/DailyBriefViewer';
import { ChatView } from './components/ChatView';
import { SearchView } from './components/SearchView';
import { KnowledgeView } from './components/KnowledgeView';
import { AuthModal } from './components/AuthModal';
import { toggleArticleSaved, fetchArticleById } from './services/articleService';
import { briefGenerationService } from './services/briefGenerationService';
import { briefProgressService } from './services/briefProgressService';
import type { Story } from './types/domain';
import type { DailyBrief, DailyBriefProgress } from './types/brief';
import type { NotificationNavigationTarget } from './components/NotificationsPopover';

// Lazy-load Breakpoint Admin workspace for optimal performance and separation
const BreakpointAdmin = lazy(() => import('./admin/BreakpointAdmin'));

const AdminLoadingFallback: React.FC = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#0A0B0E] text-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-[#FF5A1F]/20 border-t-[#FF5A1F] rounded-full animate-spin" />
      <p className="text-sm text-[#8B949E] font-medium tracking-wide">
        Loading Breakpoint Admin Workspace...
      </p>
    </div>
  </div>
);

const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, isAdmin, isEditor, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!firebaseUser || (!isAdmin && !isEditor))) {
      navigate('/app', { replace: true });
    }
  }, [isLoading, firebaseUser, isAdmin, isEditor, navigate]);

  if (isLoading) {
    return <AdminLoadingFallback />;
  }

  if (!firebaseUser || (!isAdmin && !isEditor)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

const ReaderApp: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [activeNav, setActiveNav] = useState<string>('feed');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Daily Brief States
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);
  const [briefProgress, setBriefProgress] = useState<DailyBriefProgress | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState<boolean>(false);
  const [isBriefViewerOpen, setIsBriefViewerOpen] = useState<boolean>(false);

  // Optimistic saved state overlay map: storyId -> isSaved
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  const { stories, isLoading, error } = useArticles(currentLanguage);

  // Handle URL deep-links: ?story=<id>, ?tab=<nav>, ?chat=<convId>
  useEffect(() => {
    const storyId = searchParams.get('story') || searchParams.get('storyId');
    const tab = searchParams.get('tab');
    const chat = searchParams.get('chat');

    if (storyId) {
      const match = stories.find((s) => s.id === storyId);
      if (match) {
        setSelectedStory(match);
      } else {
        fetchArticleById(storyId, currentLanguage, firebaseUser?.uid)
          .then((art) => {
            if (art) setSelectedStory(art);
          })
          .catch((err) => console.warn('[App] Deep-link story load error:', err));
      }
    } else if (tab) {
      setActiveNav(tab);
      setSelectedStory(null);
    }

    if (chat) {
      setActiveChatConversationId(chat);
      setActiveNav('chat');
      setSelectedStory(null);
    }
  }, [searchParams, stories, currentLanguage, firebaseUser?.uid]);

  // Load and subscribe to Daily Brief
  const loadDailyBrief = () => {
    if (!firebaseUser?.uid) {
      setDailyBrief(null);
      setBriefProgress(null);
      return () => {};
    }

    const userId = firebaseUser.uid;
    const currentBriefId = briefGenerationService.getBriefId();
    setIsBriefLoading(true);

    let unsubBrief = () => {};
    let unsubProgress = () => {};

    firebaseUser
      .getIdToken()
      .then((token) => briefGenerationService.getOrGenerateDailyBrief(userId, token, currentBriefId))
      .then((b) => {
        setDailyBrief(b);
        setIsBriefLoading(false);

        unsubBrief = briefGenerationService.subscribeToDailyBrief(
          userId,
          currentBriefId,
          (updatedBrief) => {
            if (updatedBrief) setDailyBrief(updatedBrief);
          },
          (err) => console.warn('[App] Brief subscription error:', err)
        );

        unsubProgress = briefProgressService.subscribeToProgress(
          userId,
          currentBriefId,
          (prog) => {
            if (prog) setBriefProgress(prog);
          },
          (err) => console.warn('[App] Brief progress subscription error:', err)
        );
      })
      .catch((err) => {
        console.warn('[App] Error initializing daily brief:', err);
        setIsBriefLoading(false);
      });

    return () => {
      unsubBrief();
      unsubProgress();
    };
  };

  useEffect(() => {
    const unsub = loadDailyBrief();
    return () => unsub();
  }, [firebaseUser?.uid]);

  // Merge optimistic saved states into stories
  const enrichedStories = React.useMemo(() => {
    return stories.map((story) => {
      if (typeof optimisticSaved[story.id] === 'boolean') {
        return {
          ...story,
          isSaved: optimisticSaved[story.id],
        };
      }
      return story;
    });
  }, [stories, optimisticSaved]);

  const savedStories = React.useMemo(() => {
    return enrichedStories.filter((s) => s.isSaved);
  }, [enrichedStories]);

  const displayedStories = React.useMemo(() => {
    if (activeNav === 'todays-drop') {
      return enrichedStories.filter((s) => s.isTodaysDrop || s.isFeatured);
    }
    return enrichedStories;
  }, [enrichedStories, activeNav]);

  const handleToggleBookmark = async (story: Story) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const nextState = !story.isSaved;
    setOptimisticSaved((prev) => ({ ...prev, [story.id]: nextState }));

    try {
      await toggleArticleSaved(story.id, firebaseUser.uid, story.isSaved);
    } catch (err) {
      console.error('[App] Toggle bookmark failed, rolling back UI:', err);
      setOptimisticSaved((prev) => ({ ...prev, [story.id]: story.isSaved }));
    }
  };

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
  };

  const handleSelectStoryById = async (storyId: string) => {
    const existing = enrichedStories.find((s) => s.id === storyId);
    if (existing) {
      setSelectedStory(existing);
      return;
    }
    try {
      const fetched = await fetchArticleById(storyId, currentLanguage, firebaseUser?.uid);
      if (fetched) {
        setSelectedStory(fetched);
      }
    } catch (err) {
      console.warn('[App] Deep-link article fetch failed:', err);
    }
  };

  const handleBackToFeed = () => {
    setSelectedStory(null);
    if (searchParams.get('story') || searchParams.get('storyId')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('story');
      newParams.delete('storyId');
      setSearchParams(newParams);
    }
  };

  const handleOpenBrief = () => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBriefViewerOpen(true);
  };

  const handleNavigateTarget = (target: NotificationNavigationTarget) => {
    if (target.type === 'chat') {
      setActiveNav('chat');
      setSelectedStory(null);
      if (target.id) {
        setActiveChatConversationId(target.id);
      }
      return;
    }

    if (target.type === 'knowledge') {
      setActiveNav('knowledge');
      setSelectedStory(null);
      return;
    }

    if (target.type === 'brief') {
      setActiveNav('brief');
      setSelectedStory(null);
      return;
    }

    if (target.type === 'article' && target.id) {
      handleSelectStoryById(target.id);
    }
  };

  return (
    <AppShell
      activeNav={activeNav}
      onNavChange={(nav) => {
        setActiveNav(nav);
        setSelectedStory(null);
      }}
      currentLanguage={currentLanguage}
      onLanguageChange={(lang) => {
        setCurrentLanguage(lang);
      }}
      onOpenAuth={() => setIsAuthModalOpen(true)}
      onSelectStoryId={handleSelectStoryById}
      onNavigateTarget={handleNavigateTarget}
      onSwitchToAdmin={() => navigate('/admin')}
    >
      {selectedStory ? (
        <StoryDetail
          story={
            enrichedStories.find((s) => s.id === selectedStory.id) || selectedStory
          }
          onBack={handleBackToFeed}
          onToggleBookmark={handleToggleBookmark}
          onLanguageChange={setCurrentLanguage}
        />
      ) : activeNav === 'brief' ? (
        <DailyBriefView
          brief={dailyBrief}
          progress={briefProgress}
          isLoading={isBriefLoading}
          onOpenViewer={handleOpenBrief}
          onGenerateRetry={loadDailyBrief}
          onOpenArticle={handleSelectStoryById}
        />
      ) : activeNav === 'search' ? (
        <SearchView
          stories={enrichedStories}
          userId={firebaseUser?.uid}
          onSelectStory={handleSelectStory}
          onToggleBookmark={handleToggleBookmark}
        />
      ) : activeNav === 'saved' ? (
        <LibraryView
          savedStories={savedStories}
          isLoadingSaved={isLoading}
          onSelectStory={handleSelectStory}
          onToggleBookmark={handleToggleBookmark}
        />
      ) : activeNav === 'chat' ? (
        <ChatView
          initialConversationId={activeChatConversationId}
          onOpenArticle={handleSelectStoryById}
        />
      ) : activeNav === 'knowledge' ? (
        <KnowledgeView
          userId={firebaseUser?.uid}
          onSelectStoryId={handleSelectStoryById}
        />
      ) : (
        <StoryFeed
          stories={displayedStories}
          isLoading={isLoading}
          error={error}
          userId={firebaseUser?.uid}
          onSelectStory={handleSelectStory}
          onToggleBookmark={handleToggleBookmark}
          brief={dailyBrief}
          briefProgress={briefProgress}
          onOpenBrief={handleOpenBrief}
          isBriefLoading={isBriefLoading}
        />
      )}

      {/* Daily Brief Modal Carousel Viewer */}
      {isBriefViewerOpen && dailyBrief && (
        <DailyBriefViewer
          brief={dailyBrief}
          initialProgress={briefProgress}
          userId={firebaseUser?.uid || ''}
          onClose={() => setIsBriefViewerOpen(false)}
          onOpenArticle={(artId) => handleSelectStoryById(artId)}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </AppShell>
  );
};

const AdminRouteWrapper: React.FC = () => {
  const { firebaseUser, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AdminRouteGuard>
      <Suspense fallback={<AdminLoadingFallback />}>
        <BreakpointAdmin
          user={firebaseUser!}
          profile={userProfile}
          onSignOut={async () => {
            await signOut();
            navigate('/app', { replace: true });
          }}
          onSwitchToReader={() => navigate('/app')}
          onOpenInReader={(storyId: string) => {
            navigate(`/app?story=${encodeURIComponent(storyId)}`);
          }}
        />
      </Suspense>
    </AdminRouteGuard>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminRouteWrapper />} />
          <Route path="/app/*" element={<ReaderApp />} />
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
