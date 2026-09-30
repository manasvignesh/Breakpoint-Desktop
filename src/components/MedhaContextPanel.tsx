import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  AlertCircle,
  FileText,
  Compass,
  BookOpen,
} from 'lucide-react';
import {
  queryMedha,
  type MedhaCompanion,
  type MedhaResponse,
  type MedhaTurn,
} from '../services/medhaService';
import { useAuth } from '../contexts/AuthContext';
import type { Story } from '../types/domain';

interface MedhaContextPanelProps {
  story: Story;
  selectedText?: string;
  onClearSelectedText?: () => void;
  onClose?: () => void;
  initialPrompt?: string;
}

const COMPANIONS: Array<{
  id: MedhaCompanion;
  name: string;
  title: string;
  avatarColor: string;
  tone: string;
}> = [
  {
    id: 'kiro',
    name: 'Kiro',
    title: 'The Curious Spark',
    avatarColor: 'from-orange-500 to-amber-500',
    tone: 'Observant & Inquisitive',
  },
  {
    id: 'lumi',
    name: 'Lumi',
    title: 'The Gentle Light',
    avatarColor: 'from-blue-500 to-cyan-400',
    tone: 'Calm & Clear',
  },
  {
    id: 'momo',
    name: 'Momo',
    title: 'The Moon Drop',
    avatarColor: 'from-pink-500 to-rose-400',
    tone: 'Warm & Playful',
  },
  {
    id: 'zuzu',
    name: 'Zuzu',
    title: 'The Swift Breeze',
    avatarColor: 'from-emerald-500 to-teal-400',
    tone: 'Quick & Concise',
  },
  {
    id: 'nishi',
    name: 'Nishi',
    title: 'The Quiet Guide',
    avatarColor: 'from-purple-500 to-indigo-500',
    tone: 'Focused & Deep',
  },
];

export const MedhaContextPanel: React.FC<MedhaContextPanelProps> = ({
  story,
  selectedText,
  onClearSelectedText,
  onClose,
  initialPrompt,
}) => {
  const { getIdToken, firebaseUser } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<MedhaCompanion>('kiro');
  const [question, setQuestion] = useState(initialPrompt || '');
  const [conversation, setConversation] = useState<MedhaTurn[]>([]);
  const [lastResponse, setLastResponse] = useState<MedhaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (textToAsk?: string) => {
    const queryText = (textToAsk || question).trim();
    if (!queryText) return;

    if (!firebaseUser) {
      setError('Please sign in to ask MEDHA.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const token = await getIdToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    const newHistory: MedhaTurn[] = [
      ...conversation,
      { role: 'user', content: queryText },
    ];
    setConversation(newHistory);
    setQuestion('');

    try {
      const response = await queryMedha({
        idToken: token,
        getToken: getIdToken,
        question: queryText,
        companion: selectedCompanion,
        context: {
          articleId: story.id,
          articleTitle: story.title,
          articleSummary: story.quickBrief.quickSummary,
          category: story.category,
          keyNumbers: story.quickBrief.keyNumber
            ? [`${story.quickBrief.keyNumber.value} (${story.quickBrief.keyNumber.label})`]
            : [],
          selectedText: selectedText || '',
        },
        chunks: [
          { text: `${story.title}. ${story.quickBrief.quickSummary}`, source: 'currentStory' },
          { text: story.fullStory.whatHappened, source: 'currentStory' },
          { text: story.fullStory.whyThisMatters, source: 'currentStory' },
          ...story.fullStory.exploreSections.map((s) => ({
            text: `${s.title}: ${s.content}`,
            source: 'currentStory' as const,
          })),
        ],
        history: newHistory,
      });

      setLastResponse(response);
      const combinedAssistantText = response.sections.map((s) => s.text).join('\n\n');
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: combinedAssistantText || 'I processed that story context.' },
      ]);
    } catch (err: any) {
      console.error('[MedhaPanel] Query error:', err);
      setError(err.message || 'MEDHA could not answer at this moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCompanionProfile = COMPANIONS.find((c) => c.id === selectedCompanion)!;

  return (
    <aside className="flex flex-col h-full bg-[#12141A] border-l border-[#232734] w-96 max-w-full shadow-2xl shrink-0 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#232734] flex items-center justify-between bg-[#0F1015]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${currentCompanionProfile.avatarColor} flex items-center justify-center text-white shadow-sm`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-1.5">
              <span>MEDHA</span>
              <span className="text-xs text-[#FF5A1F] font-mono">
                · {currentCompanionProfile.name}
              </span>
            </h3>
            <p className="text-[10px] text-[#8B949E]">
              {currentCompanionProfile.tone}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#181B22] transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Companion Switcher Pills */}
      <div className="px-4 py-2 bg-[#0F1015]/60 border-b border-[#232734] flex items-center gap-1.5 overflow-x-auto">
        {COMPANIONS.map((comp) => {
          const isSelected = selectedCompanion === comp.id;
          return (
            <button
              key={comp.id}
              onClick={() => setSelectedCompanion(comp.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-[#FF5A1F] text-white shadow-sm'
                  : 'bg-[#181B22] text-[#8B949E] hover:text-[#F0F3F6]'
              }`}
              title={`${comp.name} - ${comp.title}`}
            >
              {comp.name}
            </button>
          );
        })}
      </div>

      {/* Selected Text Context Banner (if user highlighted text in story) */}
      {selectedText && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#181B22] border border-[#FF5A1F]/30 flex items-start justify-between gap-2 text-xs">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#FF5A1F] tracking-wider block">
              Inquiring on Selected Text:
            </span>
            <p className="text-[#C9D1D9] italic truncate mt-0.5">
              "{selectedText}"
            </p>
          </div>
          {onClearSelectedText && (
            <button
              onClick={onClearSelectedText}
              className="p-1 text-[#8B949E] hover:text-white shrink-0"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Conversation Stream & Grounded Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 && (
          <div className="py-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#181B22] text-[#FF5A1F] flex items-center justify-center mx-auto">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#8B949E] max-w-[240px] mx-auto">
              Ask {currentCompanionProfile.name} about concepts, background, or numbers in this story.
            </p>

            {/* Quick Prompts */}
            <div className="space-y-1.5 pt-2">
              {[
                'Explain this simply',
                'Why does this matter?',
                'What should I learn next?',
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(promptText)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#181B22] hover:bg-[#232734] border border-[#232734] text-xs text-[#C9D1D9] hover:text-white transition"
                >
                  ⚡ {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((turn, idx) => {
          const isUser = turn.role === 'user';
          return (
            <div
              key={idx}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <span className="text-[10px] text-[#8B949E] uppercase font-bold px-1">
                {isUser ? 'You' : currentCompanionProfile.name}
              </span>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[92%] ${
                  isUser
                    ? 'bg-[#FF5A1F] text-white rounded-tr-none'
                    : 'bg-[#181B22] border border-[#232734] text-[#F0F3F6] rounded-tl-none whitespace-pre-line'
                }`}
              >
                {turn.content}
              </div>
            </div>
          );
        })}

        {/* Display Grounded Section Tags for last response */}
        {lastResponse && lastResponse.sections.length > 0 && !isLoading && (
          <div className="pt-2 space-y-2 border-t border-[#232734]/60">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8B949E]">
              Grounding Breakdown:
            </span>
            <div className="space-y-2">
              {lastResponse.sections.map((sec, secIdx) => {
                const badgeIcon =
                  sec.kind === 'currentStory' ? (
                    <FileText className="w-3 h-3 text-[#FF5A1F]" />
                  ) : sec.kind === 'relatedBreakpoint' ? (
                    <Compass className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                  );

                const badgeLabel =
                  sec.kind === 'currentStory'
                    ? 'Current Story Evidence'
                    : sec.kind === 'relatedBreakpoint'
                      ? 'Related Breakpoint Context'
                      : sec.kind === 'outOfScope'
                        ? 'Scope Filter'
                        : 'Conceptual Knowledge';

                return (
                  <div
                    key={secIdx}
                    className="p-2.5 rounded-xl bg-[#0F1015] border border-[#232734] text-[11px] text-[#C9D1D9] space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      {badgeIcon}
                      <span>{badgeLabel}</span>
                    </div>
                    <p className="line-clamp-3 text-[#8B949E]">{sec.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#8B949E] py-2">
            <div className="w-4 h-4 border-2 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
            <span>{currentCompanionProfile.name} is thinking with story context...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[#232734] bg-[#0F1015]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask ${currentCompanionProfile.name}...`}
            className="flex-1 px-3 py-2 bg-[#181B22] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-xs text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="p-2 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white disabled:opacity-40 transition shadow-sm"
            aria-label="Send question"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
