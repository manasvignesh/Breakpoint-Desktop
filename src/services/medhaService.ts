/**
 * MEDHA Contextual AI Assistant Service
 * 
 * Interacts exclusively with the production Supabase Edge Function `medha-chat`.
 * All requests are authenticated with the user's Firebase ID Token.
 * ZERO model provider keys (OpenAI, Gemini, Groq, NVIDIA) exist in this client.
 */

const TRUSTED_BACKEND_BASE_URL =
  import.meta.env.VITE_TRUSTED_BACKEND_URL ||
  'https://fuvquwhphuheqgfdmtbh.supabase.co/functions/v1';

export type MedhaCompanion = 'kiro' | 'lumi' | 'momo' | 'zuzu' | 'nishi';

export type MedhaScope = 'inScope' | 'relatedExtension' | 'outOfScope';

export type MedhaSectionKind =
  | 'currentStory'
  | 'relatedBreakpoint'
  | 'general'
  | 'outOfScope';

export interface MedhaSection {
  kind: MedhaSectionKind;
  text: string;
}

export interface MedhaContext {
  articleId: string;
  articleTitle: string;
  articleSummary: string;
  category: string;
  keyNumbers?: string[];
  selectedText?: string;
}

export interface MedhaTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MedhaResponse {
  ok: boolean;
  scope: MedhaScope;
  sections: MedhaSection[];
  error?: string;
}

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Math.random().toString(36).substring(2, 15);
}

export async function queryMedha({
  idToken,
  question,
  companion,
  context,
  chunks = [],
  history = [],
}: {
  idToken: string;
  question: string;
  companion: MedhaCompanion;
  context: MedhaContext;
  chunks?: Array<{ text: string; source: 'currentStory' | 'relatedBreakpoint' }>;
  history?: MedhaTurn[];
}): Promise<MedhaResponse> {
  if (!idToken) {
    throw new Error('You must be signed in to consult MEDHA.');
  }

  const endpoint = `${TRUSTED_BACKEND_BASE_URL.replace(/\/+$/, '')}/medha-chat`;

  // Build story chunks from context if chunks are empty
  const effectiveChunks = chunks.length
    ? chunks
    : [
        { text: context.articleTitle, source: 'currentStory' as const },
        { text: context.articleSummary, source: 'currentStory' as const },
        ...(context.selectedText
          ? [{ text: `Selected text: ${context.selectedText}`, source: 'currentStory' as const }]
          : []),
      ];

  const payload = {
    requestId: generateRequestId(),
    question: question.trim(),
    companion,
    context: {
      articleId: context.articleId,
      articleTitle: context.articleTitle,
      articleSummary: context.articleSummary,
      category: context.category,
      keyNumbers: context.keyNumbers || [],
      selectedText: context.selectedText || '',
    },
    chunks: effectiveChunks,
    history: history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Your session expired. Please sign in again.');
    }
    if (response.status === 429) {
      throw new Error('Too many requests to MEDHA. Please wait a moment.');
    }
    throw new Error(
      errorBody.message || `MEDHA assistant service returned HTTP ${response.status}`,
    );
  }

  const data = await response.json();
  const scope: MedhaScope = data.scope || 'inScope';
  const sections: MedhaSection[] = Array.isArray(data.sections)
    ? data.sections.map((sec: any) => ({
        kind: (sec.kind as MedhaSectionKind) || 'currentStory',
        text: String(sec.text || ''),
      }))
    : [];

  return {
    ok: true,
    scope,
    sections,
  };
}
