/**
 * Daily Brief Fast Deterministic Ranking Engine
 * Platform Phase 16F.6
 *
 * Wrapper around the shared pure ranking engine (dailyBriefRanking.ts).
 */

import {
  rankBrief as sharedRankBrief,
  isCandidateSuppressed,
  scoreCandidate as sharedScoreCandidate,
  isMaterialUserFacingChange,
} from './dailyBriefRanking';
import type {
  DailyBriefCandidate,
  DailyBriefItem,
  UserRankingContext,
  RankingOptions,
} from './dailyBriefRanking';

export class BriefRankingService {
  /**
   * Ranks candidate pool for a specific user context deterministically in < 10ms.
   */
  rankBrief(
    candidates: DailyBriefCandidate[],
    userContext: UserRankingContext,
    options: RankingOptions,
    availableTrails: DailyBriefCandidate[] = []
  ): DailyBriefItem[] {
    return sharedRankBrief(candidates, userContext, options, availableTrails);
  }

  /**
   * Deterministic suppression check.
   */
  public isSuppressed(cand: DailyBriefCandidate, ctx: UserRankingContext): boolean {
    return isCandidateSuppressed(cand, ctx);
  }

  /**
   * Calculates deterministic scoring and reason code for a candidate.
   */
  public scoreCandidate(cand: DailyBriefCandidate, ctx: UserRankingContext) {
    return sharedScoreCandidate(cand, ctx);
  }

  /**
   * Checks if a change is material and user-facing.
   */
  public isMaterialUserFacingChange(change: any): boolean {
    return isMaterialUserFacingChange(change);
  }
}

export const briefRankingService = new BriefRankingService();

export {
  sharedRankBrief,
  isCandidateSuppressed,
  sharedScoreCandidate,
  isMaterialUserFacingChange,
};
export type {
  DailyBriefCandidate,
  DailyBriefItem,
  UserRankingContext,
  RankingOptions,
};
