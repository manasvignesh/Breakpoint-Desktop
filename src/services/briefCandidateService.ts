/**
 * Daily Brief Candidate Generation Service
 * Platform Phase 16F
 *
 * Gathers and standardizes canonical candidate pool (O(N)) across stories,
 * recent articles, deltas, and knowledge trails for efficient downstream ranking.
 */

import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from './firebase';
import { DailyBriefCandidate, DailyBriefDeltaDetail } from '../types/brief';
import { PlatformArticleRecord, PlatformStoryRecord } from '../types/platform';

export class BriefCandidateService {
  /**
   * Builds the daily candidate pool directly from Firestore.
   */
  async getDailyCandidatePool(maxArticles = 50): Promise<DailyBriefCandidate[]> {
    try {
      // 1. Fetch recent approved articles
      const postsQuery = query(collection(db, 'posts'), limit(maxArticles));
      const postsSnap = await getDocs(postsQuery);
      const rawPosts: (PlatformArticleRecord & { id: string })[] = [];
      postsSnap.forEach((docSnap) => {
        const d = docSnap.data() as PlatformArticleRecord;
        const status = String(d.status || '').toLowerCase();
        const category = String(d.category || d.articleCategory || '').toLowerCase();
        if ((status === 'approved' || status === 'published') && category !== 'reel') {
          rawPosts.push({ ...d, id: docSnap.id });
        }
      });

      // 2. Fetch active canonical stories
      const storiesQuery = query(collection(db, 'stories'), limit(30));
      const storiesSnap = await getDocs(storiesQuery);
      const rawStories: (PlatformStoryRecord & { id: string })[] = [];
      storiesSnap.forEach((docSnap) => {
        rawStories.push({ ...(docSnap.data() as PlatformStoryRecord), id: docSnap.id });
      });

      // 3. Fetch knowledge trails
      const trailsQuery = query(collection(db, 'knowledgeTrails'), limit(20));
      const trailsSnap = await getDocs(trailsQuery);
      const rawTrails: any[] = [];
      trailsSnap.forEach((docSnap) => {
        rawTrails.push({ id: docSnap.id, ...docSnap.data() });
      });

      // 4. Fetch recent story changes
      const changesQuery = query(collection(db, 'storyChanges'), limit(50));
      const changesSnap = await getDocs(changesQuery);
      const rawChanges: any[] = [];
      changesSnap.forEach((docSnap) => {
        rawChanges.push({ id: docSnap.id, ...docSnap.data() });
      });

      return this.buildCandidatePool(rawPosts, rawStories, rawChanges, rawTrails);
    } catch (err) {
      console.warn('[BriefCandidateService] Error fetching candidate pool from Firestore:', err);
      return [];
    }
  }

  /**
   * Pure deterministic candidate pool builder.
   */
  buildCandidatePool(
    posts: (PlatformArticleRecord & { id: string })[],
    stories: (PlatformStoryRecord & { id: string })[] = [],
    storyChanges: any[] = [],
    trails: any[] = []
  ): DailyBriefCandidate[] {
    const candidates: DailyBriefCandidate[] = [];
    const storyMap = new Map<string, PlatformStoryRecord & { id: string }>();
    stories.forEach((s) => storyMap.set(s.id, s));

    // Group posts by storyId where available
    const storyArticlesMap = new Map<string, (PlatformArticleRecord & { id: string })[]>();
    const standalonePosts: (PlatformArticleRecord & { id: string })[] = [];

    posts.forEach((p) => {
      const storyId = p.storyId || (p as any).canonicalStoryId;
      if (storyId) {
        const existing = storyArticlesMap.get(storyId) || [];
        existing.push(p);
        storyArticlesMap.set(storyId, existing);
      } else {
        standalonePosts.push(p);
      }
    });

    // Group changes by storyId
    const changesByStory = new Map<string, any[]>();
    storyChanges.forEach((c) => {
      const sId = c.storyId;
      if (sId) {
        const existing = changesByStory.get(sId) || [];
        existing.push(c);
        changesByStory.set(sId, existing);
      }
    });

    // 1. Process Stories (Collapsed Multi-article threads)
    storyArticlesMap.forEach((storyPosts, storyId) => {
      const storyMeta = storyMap.get(storyId);
      // Sort posts chronologically to find latest
      storyPosts.sort((a, b) => {
        const tA = this.parseTimestamp(a.publishedAt || a.createdAt);
        const tB = this.parseTimestamp(b.publishedAt || b.createdAt);
        return tB - tA;
      });

      const primaryPost = storyPosts[0];
      const storyChangesForThis = changesByStory.get(storyId) || [];

      // Extract material deltas
      const deltas: DailyBriefDeltaDetail[] = storyChangesForThis.map((c) => ({
        changeType: c.changeType || 'additional_detail',
        summary: c.summary || c.description || '',
        oldValue: c.oldValue,
        newValue: c.newValue,
        timestamp: c.occurredAt || c.createdAt,
      }));

      const materialChanges = deltas.filter(
        (d) =>
          d.changeType === 'value_changed' ||
          d.changeType === 'new_fact' ||
          d.changeType === 'status_changed' ||
          d.changeType === 'correction'
      );

      const type = storyPosts.length > 1 || deltas.length > 0 ? 'story' : 'article';
      const entityIds = this.extractEntityIds(storyPosts);
      const conceptIds = this.extractConceptIds(storyPosts);
      const topicTags = this.extractTopicTags(storyPosts);

      const pubDateStr = this.formatTimestamp(primaryPost.publishedAt || primaryPost.createdAt);
      const importance = this.calculateEditorialImportance(primaryPost, storyPosts.length, deltas.length);

      candidates.push({
        id: `story_${storyId}`,
        type,
        storyId,
        articleId: primaryPost.id,
        title: storyMeta?.title || primaryPost.title || primaryPost.headline || 'Developing Story',
        summary: storyMeta?.summary || primaryPost.description || primaryPost.hook || '',
        category: primaryPost.category || primaryPost.articleCategory || 'General',
        publishedAt: pubDateStr,
        editorialImportance: importance,
        entityIds,
        conceptIds,
        topicTags,
        readTimeMinutes: Math.max(1, Math.ceil(((primaryPost.description || primaryPost.hook || '')).split(/\s+/).length / 150) || 2),
        latestChangeSummary: materialChanges.length > 0 ? materialChanges[0].summary : undefined,
        changesCount: deltas.length,
        materialChangesCount: materialChanges.length,
        deltas,
        imageUrl: primaryPost.imageUrl || primaryPost.thumbnailUrl || primaryPost.coverImage,
      });
    });

    // 2. Process Standalone Articles
    standalonePosts.forEach((post) => {
      const pubDateStr = this.formatTimestamp(post.publishedAt || post.createdAt);
      const entityIds = this.extractEntityIds([post]);
      const conceptIds = this.extractConceptIds([post]);
      const topicTags = this.extractTopicTags([post]);
      const importance = this.calculateEditorialImportance(post, 1, 0);

      candidates.push({
        id: `article_${post.id}`,
        type: 'article',
        articleId: post.id,
        title: post.title || post.headline || 'News Update',
        summary: post.description || post.hook || '',
        category: post.category || post.articleCategory || 'General',
        publishedAt: pubDateStr,
        editorialImportance: importance,
        entityIds,
        conceptIds,
        topicTags,
        readTimeMinutes: Math.max(1, Math.ceil(((post.description || post.hook || '')).split(/\s+/).length / 150) || 2),
        changesCount: 0,
        materialChangesCount: 0,
        imageUrl: post.imageUrl || post.thumbnailUrl || post.coverImage,
      });
    });

    // 3. Process Active Knowledge Trails (for Knowledge Recommendations)
    trails.forEach((trail) => {
      if (trail.status === 'published' || trail.status === 'active' || !trail.status) {
        candidates.push({
          id: `trail_${trail.id}`,
          type: 'trail',
          trailId: trail.id,
          title: trail.title || 'Knowledge Trail',
          summary: trail.description || trail.summary || '',
          category: trail.category || 'Technology',
          publishedAt: trail.updatedAt || trail.createdAt || new Date().toISOString(),
          editorialImportance: 0.5,
          entityIds: [],
          conceptIds: Array.isArray(trail.steps) ? trail.steps.map((s: any) => s.conceptId).filter(Boolean) : [],
          topicTags: trail.tags || [],
          readTimeMinutes: 3,
        });
      }
    });

    return candidates;
  }

  private parseTimestamp(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return new Date(val).getTime();
    if (typeof val === 'object' && typeof val.seconds === 'number') return val.seconds * 1000;
    return 0;
  }

  private formatTimestamp(val: any): string {
    if (!val) return new Date().toISOString();
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return new Date(val).toISOString();
    if (typeof val === 'object' && typeof val.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
    return new Date().toISOString();
  }

  private extractEntityIds(posts: any[]): string[] {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.entityIds)) p.entityIds.forEach((id: string) => set.add(id));
      if (Array.isArray(p.canonicalEntities)) p.canonicalEntities.forEach((e: any) => set.add(e.id || e));
    });
    return Array.from(set);
  }

  private extractConceptIds(posts: any[]): string[] {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.conceptIds)) p.conceptIds.forEach((id: string) => set.add(id));
      if (Array.isArray(p.canonicalConcepts)) p.canonicalConcepts.forEach((c: any) => set.add(c.id || c));
    });
    return Array.from(set);
  }

  private extractTopicTags(posts: any[]): string[] {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) p.tags.forEach((t: string) => set.add(t.toLowerCase()));
      if (Array.isArray(p.topicTags)) p.topicTags.forEach((t: string) => set.add(t.toLowerCase()));
      const cat = p.category || p.articleCategory;
      if (cat) set.add(cat.toLowerCase());
    });
    return Array.from(set);
  }

  private calculateEditorialImportance(post: any, updatesCount: number, deltasCount: number): number {
    let score = 0.5; // baseline

    // Breaking / pinned / high editorial weight
    if (post.isBreaking || post.is_breaking) score += 0.3;
    if (post.isFeatured || post.is_featured) score += 0.2;
    if (post.deckPriority && post.deckPriority > 1) score += 0.1;

    // Multi-article developing story signal
    if (updatesCount > 1) score += Math.min(0.2, (updatesCount - 1) * 0.05);
    if (deltasCount > 0) score += Math.min(0.15, deltasCount * 0.05);

    return Math.min(1.0, Math.max(0.1, score));
  }
}

export const briefCandidateService = new BriefCandidateService();
