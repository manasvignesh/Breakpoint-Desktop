/**
 * Daily Brief Firestore Mapper
 * Platform Phase 16F
 */

import type { DailyBrief, DailyBriefItem, DailyBriefProgress } from '../../types/brief.ts';

export function mapDocToDailyBrief(id: string, data: any): DailyBrief {
  const items: DailyBriefItem[] = Array.isArray(data?.items)
    ? data.items.map((item: any, index: number) => ({
        id: item.id || `item_${index}`,
        briefId: item.briefId || id,
        orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : index,
        type: item.type || 'story',
        reasonCode: item.reasonCode || 'important',
        reasonExplanation: item.reasonExplanation || 'Top story of the day',
        storyId: item.storyId || undefined,
        articleId: item.articleId || undefined,
        trailId: item.trailId || undefined,
        conceptId: item.conceptId || undefined,
        title: item.title || '',
        summary: item.summary || '',
        category: item.category || 'General',
        publishedAt: item.publishedAt || new Date().toISOString(),
        readTimeMinutes: typeof item.readTimeMinutes === 'number' ? item.readTimeMinutes : 2,
        explanationMode: item.explanationMode || 'standard',
        deltaSummary: item.deltaSummary || undefined,
        sinceYouLastReadDeltas: Array.isArray(item.sinceYouLastReadDeltas) ? item.sinceYouLastReadDeltas : undefined,
        score: typeof item.score === 'number' ? item.score : 1.0,
        imageUrl: item.imageUrl || undefined,
        isCompleted: Boolean(item.isCompleted),
      }))
    : [];

  return {
    briefId: id,
    userId: data?.userId || '',
    edition: data?.edition === 'evening' ? 'evening' : 'morning',
    date: data?.date || new Date().toISOString().split('T')[0],
    createdAt: data?.createdAt || new Date().toISOString(),
    estimatedMinutes: typeof data?.estimatedMinutes === 'number' ? data.estimatedMinutes : 7,
    itemsCount: typeof data?.itemsCount === 'number' ? data.itemsCount : items.length,
    items,
    isCompleted: Boolean(data?.isCompleted),
  };
}

export function mapDailyBriefToDoc(brief: DailyBrief): Record<string, any> {
  return {
    briefId: brief.briefId,
    userId: brief.userId,
    edition: brief.edition,
    date: brief.date,
    createdAt: brief.createdAt,
    estimatedMinutes: brief.estimatedMinutes,
    itemsCount: brief.items.length,
    items: brief.items.map(item => ({
      id: item.id,
      briefId: item.briefId,
      orderIndex: item.orderIndex,
      type: item.type,
      reasonCode: item.reasonCode,
      reasonExplanation: item.reasonExplanation,
      storyId: item.storyId || null,
      articleId: item.articleId || null,
      trailId: item.trailId || null,
      conceptId: item.conceptId || null,
      title: item.title,
      summary: item.summary,
      category: item.category,
      publishedAt: item.publishedAt,
      readTimeMinutes: item.readTimeMinutes,
      explanationMode: item.explanationMode,
      deltaSummary: item.deltaSummary || null,
      sinceYouLastReadDeltas: item.sinceYouLastReadDeltas || null,
      score: item.score,
      imageUrl: item.imageUrl || null,
      isCompleted: Boolean(item.isCompleted),
    })),
    isCompleted: brief.isCompleted,
  };
}

export function mapDocToDailyBriefProgress(id: string, data: any): DailyBriefProgress {
  return {
    briefId: id,
    userId: data?.userId || '',
    activeIndex: typeof data?.activeIndex === 'number' ? data.activeIndex : 0,
    completedItemIds: Array.isArray(data?.completedItemIds) ? data.completedItemIds : [],
    skippedItemIds: Array.isArray(data?.skippedItemIds) ? data.skippedItemIds : [],
    isCaughtUp: Boolean(data?.isCaughtUp),
    caughtUpAt: data?.caughtUpAt || undefined,
    timeSpentSeconds: typeof data?.timeSpentSeconds === 'number' ? data.timeSpentSeconds : 0,
    lastUpdatedAt: data?.lastUpdatedAt || new Date().toISOString(),
  };
}

export function mapDailyBriefProgressToDoc(progress: DailyBriefProgress): Record<string, any> {
  return {
    briefId: progress.briefId,
    userId: progress.userId,
    activeIndex: progress.activeIndex,
    completedItemIds: progress.completedItemIds,
    skippedItemIds: progress.skippedItemIds,
    isCaughtUp: progress.isCaughtUp,
    caughtUpAt: progress.caughtUpAt || null,
    timeSpentSeconds: progress.timeSpentSeconds,
    lastUpdatedAt: progress.lastUpdatedAt,
  };
}
