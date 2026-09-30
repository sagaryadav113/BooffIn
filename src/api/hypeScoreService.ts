import { supabase, appStorage } from './client';

export interface UserPaperRating {
  userId: string;
  paperId: string;
  impact: number; // 1-5 (0 = not rated yet)
  clarity: number; // 1-5
  visuals: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface PaperMetrics {
  paperId: string;
  views: number;
  uniqueReaders: number;
  
  // Rating raw sums & counts
  impactSum: number;
  impactCount: number;
  claritySum: number;
  clarityCount: number;
  visualsSum: number;
  visualsCount: number;
  
  // Calculated averages (1.0 - 5.0)
  impactAvg: number;
  clarityAvg: number;
  visualsAvg: number;
  communityRating: number; // (impactAvg + clarityAvg + visualsAvg) / 3
  
  // Normalized 0-100 components
  ratingScore: number; // 0-100
  popularityScore: number; // 0-100 (logarithmic)
  hypeScore: number; // 0.70 * ratingScore + 0.30 * popularityScore
  
  // Real-time velocity
  viewsLastHour: number;
  viewsLast24h: number;
  trendScore: number;
}

const STORAGE_KEY_PREFIX_RATINGS = 'booffin_paper_user_ratings_';
const STORAGE_KEY_PREFIX_METRICS = 'booffin_paper_metrics_';

// Global baseline constants
const BAYESIAN_MIN_CONFIDENCE = 10; // m
const BAYESIAN_GLOBAL_MEAN = 3.2; // typical scientific publication mean

/**
 * Calculates raw popularity using logarithmic scaling:
 * Popularity Raw = log10(1 + views)
 * 10 views -> 1.04
 * 100 views -> 2.00
 * 1,000 views -> 3.00
 * 10,000 views -> 4.00
 * 100,000 views -> 5.00
 * Normalized to 0-100 scale (with 100,000 views = ~100)
 */
export function calculatePopularityScore(views: number): number {
  if (views <= 0) return 0;
  const rawLog = Math.log10(1 + views);
  // Normalize against a benchmark of 100,000 views (log10 = 5.0)
  const normalized = (rawLog / 5.0) * 100;
  return Math.min(100, Math.max(0, parseFloat(normalized.toFixed(1))));
}

/**
 * Calculates Bayesian adjusted community rating to prevent 1-user 5/5 from creating 100 HYPE:
 * Adjusted Rating = (n / (n + m)) * Paper Rating + (m / (n + m)) * Global Mean
 */
export function applyBayesianShrinkage(
  rawRating: number,
  ratingCount: number,
  m: number = BAYESIAN_MIN_CONFIDENCE,
  globalMean: number = BAYESIAN_GLOBAL_MEAN
): number {
  if (ratingCount <= 0 || rawRating <= 0) return globalMean;
  const adjusted = (ratingCount / (ratingCount + m)) * rawRating + (m / (ratingCount + m)) * globalMean;
  return parseFloat(adjusted.toFixed(2));
}

/**
 * Converts 1.0 - 5.0 community rating to 0 - 100 Rating Score:
 * Rating Score = ((Community Rating - 1) / 4) * 100
 * 5.0 -> 100
 * 4.5 -> 87.5
 * 4.0 -> 75
 * 3.0 -> 50
 * 2.0 -> 25
 * 1.0 -> 0
 */
export function calculateRatingScore(rating: number): number {
  if (rating <= 1.0) return 0;
  if (rating >= 5.0) return 100;
  const score = ((rating - 1.0) / 4.0) * 100;
  return parseFloat(score.toFixed(1));
}

/**
 * Calculates Final HYPE Score:
 * HYPE = (0.70 * Rating Score) + (0.30 * Popularity Score)
 * Result: 0 - 100
 */
export function calculateFinalHypeScore(ratingScore: number, popularityScore: number): number {
  const hype = 0.70 * ratingScore + 0.30 * popularityScore;
  return Math.min(100, Math.max(0, Math.round(hype)));
}

/**
 * Generates initial baseline metrics for a paper based on its view/citation seed
 */
export function createDefaultPaperMetrics(paperId: string, initialViews: number = 340): PaperMetrics {
  const views = Math.max(initialViews, 120);
  const uniqueReaders = Math.round(views * 0.78);
  const viewsLastHour = Math.max(2, Math.round(views * 0.04));
  const viewsLast24h = Math.max(14, Math.round(views * 0.22));

  // Seed with natural baseline rating distribution (approx 3.8 - 4.2)
  const seedRating = 3.9;
  const seedCount = 6;
  const impactSum = seedRating * seedCount;
  const claritySum = (seedRating + 0.2) * seedCount;
  const visualsSum = (seedRating - 0.1) * seedCount;

  const impactAvg = parseFloat((impactSum / seedCount).toFixed(2));
  const clarityAvg = parseFloat((claritySum / seedCount).toFixed(2));
  const visualsAvg = parseFloat((visualsSum / seedCount).toFixed(2));
  const rawCommunityRating = parseFloat(((impactAvg + clarityAvg + visualsAvg) / 3).toFixed(2));

  const bayesianRating = applyBayesianShrinkage(rawCommunityRating, seedCount);
  const ratingScore = calculateRatingScore(bayesianRating);
  const popularityScore = calculatePopularityScore(views);
  const hypeScore = calculateFinalHypeScore(ratingScore, popularityScore);

  return {
    paperId,
    views,
    uniqueReaders,
    impactSum,
    impactCount: seedCount,
    claritySum,
    clarityCount: seedCount,
    visualsSum,
    visualsCount: seedCount,
    impactAvg,
    clarityAvg,
    visualsAvg,
    communityRating: rawCommunityRating,
    ratingScore,
    popularityScore,
    hypeScore,
    viewsLastHour,
    viewsLast24h,
    trendScore: Math.round((viewsLast24h / views) * 100),
  };
}

/**
 * In-memory cache for fast responsive reads
 */
const inMemoryMetricsCache = new Map<string, PaperMetrics>();
const inMemoryUserRatingsCache = new Map<string, UserPaperRating>();

/**
 * Retrieves metrics for a given paper ID
 */
export async function getPaperMetrics(paperId: string, seedViews?: number): Promise<PaperMetrics> {
  const normalizedId = paperId.trim();
  if (inMemoryMetricsCache.has(normalizedId)) {
    return inMemoryMetricsCache.get(normalizedId)!;
  }

  // 1. Try local storage
  try {
    const raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryMetricsCache.set(normalizedId, parsed);
      return parsed;
    }
  } catch {}

  // 2. Try Supabase table if available
  try {
    const { data } = await supabase
      .from('paper_metrics')
      .select('*')
      .eq('paper_id', normalizedId)
      .maybeSingle();

    if (data) {
      const metrics: PaperMetrics = {
        paperId: data.paper_id,
        views: data.views || 0,
        uniqueReaders: data.unique_readers || 0,
        impactSum: data.impact_sum || 0,
        impactCount: data.impact_count || 0,
        claritySum: data.clarity_sum || 0,
        clarityCount: data.clarity_count || 0,
        visualsSum: data.visuals_sum || 0,
        visualsCount: data.visuals_count || 0,
        impactAvg: data.impact_count > 0 ? data.impact_sum / data.impact_count : 0,
        clarityAvg: data.clarity_count > 0 ? data.clarity_sum / data.clarity_count : 0,
        visualsAvg: data.visuals_count > 0 ? data.visuals_sum / data.visuals_count : 0,
        communityRating: data.community_rating || 0,
        ratingScore: data.rating_score || 0,
        popularityScore: data.popularity_score || 0,
        hypeScore: data.hype_score || 0,
        viewsLastHour: data.views_last_hour || 0,
        viewsLast24h: data.views_last_24h || 0,
        trendScore: data.trend_score || 0,
      };
      inMemoryMetricsCache.set(normalizedId, metrics);
      return metrics;
    }
  } catch {}

  // 3. Fallback: Initialize baseline metrics
  const defaultMetrics = createDefaultPaperMetrics(normalizedId, seedViews);
  inMemoryMetricsCache.set(normalizedId, defaultMetrics);
  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`,
      JSON.stringify(defaultMetrics)
    );
  } catch {}

  return defaultMetrics;
}

/**
 * Retrieves the current user's rating on a paper
 */
export async function getUserPaperRating(
  paperId: string,
  userId?: string
): Promise<UserPaperRating | null> {
  const effectiveUserId = userId || 'anonymous_reader';
  const cacheKey = `${effectiveUserId}_${paperId}`;

  if (inMemoryUserRatingsCache.has(cacheKey)) {
    return inMemoryUserRatingsCache.get(cacheKey)!;
  }

  // 1. Check local storage
  try {
    const raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_RATINGS}${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryUserRatingsCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  // 2. Check Supabase
  if (userId) {
    try {
      const { data } = await supabase
        .from('paper_ratings')
        .select('*')
        .eq('paper_id', paperId)
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        const rating: UserPaperRating = {
          userId: data.user_id,
          paperId: data.paper_id,
          impact: data.impact || 0,
          clarity: data.clarity || 0,
          visuals: data.visuals || 0,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
        inMemoryUserRatingsCache.set(cacheKey, rating);
        return rating;
      }
    } catch {}
  }

  return null;
}

/**
 * Submits or updates a user's rating on Impact, Clarity, or Visuals (1-5).
 * Updates user rating and recalculates the paper's HYPE score in real-time.
 */
export async function submitPaperRating(params: {
  paperId: string;
  userId?: string;
  impact?: number;
  clarity?: number;
  visuals?: number;
}): Promise<{ metrics: PaperMetrics; userRating: UserPaperRating }> {
  const { paperId, userId } = params;
  const effectiveUserId = userId || 'anonymous_reader';
  const cacheKey = `${effectiveUserId}_${paperId}`;

  // 1. Fetch current metrics and previous user rating
  const currentMetrics = await getPaperMetrics(paperId);
  const previousRating = await getUserPaperRating(paperId, userId);

  const prevImpact = previousRating?.impact || 0;
  const prevClarity = previousRating?.clarity || 0;
  const prevVisuals = previousRating?.visuals || 0;

  const newImpact = params.impact !== undefined ? params.impact : prevImpact;
  const newClarity = params.clarity !== undefined ? params.clarity : prevClarity;
  const newVisuals = params.visuals !== undefined ? params.visuals : prevVisuals;

  // 2. Compute delta updates for sums and counts
  let deltaImpactSum = 0;
  let deltaImpactCount = 0;
  if (params.impact !== undefined) {
    if (prevImpact > 0) {
      deltaImpactSum = params.impact - prevImpact;
    } else if (params.impact > 0) {
      deltaImpactSum = params.impact;
      deltaImpactCount = 1;
    }
  }

  let deltaClaritySum = 0;
  let deltaClarityCount = 0;
  if (params.clarity !== undefined) {
    if (prevClarity > 0) {
      deltaClaritySum = params.clarity - prevClarity;
    } else if (params.clarity > 0) {
      deltaClaritySum = params.clarity;
      deltaClarityCount = 1;
    }
  }

  let deltaVisualsSum = 0;
  let deltaVisualsCount = 0;
  if (params.visuals !== undefined) {
    if (prevVisuals > 0) {
      deltaVisualsSum = params.visuals - prevVisuals;
    } else if (params.visuals > 0) {
      deltaVisualsSum = params.visuals;
      deltaVisualsCount = 1;
    }
  }

  const nextImpactSum = Math.max(0, currentMetrics.impactSum + deltaImpactSum);
  const nextImpactCount = Math.max(1, currentMetrics.impactCount + deltaImpactCount);
  const nextClaritySum = Math.max(0, currentMetrics.claritySum + deltaClaritySum);
  const nextClarityCount = Math.max(1, currentMetrics.clarityCount + deltaClarityCount);
  const nextVisualsSum = Math.max(0, currentMetrics.visualsSum + deltaVisualsSum);
  const nextVisualsCount = Math.max(1, currentMetrics.visualsCount + deltaVisualsCount);

  // 3. Calculate new averages
  const nextImpactAvg = parseFloat((nextImpactSum / nextImpactCount).toFixed(2));
  const nextClarityAvg = parseFloat((nextClaritySum / nextClarityCount).toFixed(2));
  const nextVisualsAvg = parseFloat((nextVisualsSum / nextVisualsCount).toFixed(2));
  const nextCommunityRating = parseFloat(
    ((nextImpactAvg + nextClarityAvg + nextVisualsAvg) / 3).toFixed(2)
  );

  // 4. Bayesian rating and HYPE score recalculation
  const totalCount = Math.max(nextImpactCount, nextClarityCount, nextVisualsCount);
  const bayesianRating = applyBayesianShrinkage(nextCommunityRating, totalCount);
  const ratingScore = calculateRatingScore(bayesianRating);
  const popularityScore = calculatePopularityScore(currentMetrics.views);
  const hypeScore = calculateFinalHypeScore(ratingScore, popularityScore);

  const updatedMetrics: PaperMetrics = {
    ...currentMetrics,
    impactSum: nextImpactSum,
    impactCount: nextImpactCount,
    claritySum: nextClaritySum,
    clarityCount: nextClarityCount,
    visualsSum: nextVisualsSum,
    visualsCount: nextVisualsCount,
    impactAvg: nextImpactAvg,
    clarityAvg: nextClarityAvg,
    visualsAvg: nextVisualsAvg,
    communityRating: nextCommunityRating,
    ratingScore,
    popularityScore,
    hypeScore,
  };

  const nowIso = new Date().toISOString();
  const updatedUserRating: UserPaperRating = {
    userId: effectiveUserId,
    paperId,
    impact: newImpact,
    clarity: newClarity,
    visuals: newVisuals,
    createdAt: previousRating?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // 5. Update local memory and appStorage
  inMemoryMetricsCache.set(paperId, updatedMetrics);
  inMemoryUserRatingsCache.set(cacheKey, updatedUserRating);

  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${paperId}`,
      JSON.stringify(updatedMetrics)
    );
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_RATINGS}${cacheKey}`,
      JSON.stringify(updatedUserRating)
    );
  } catch {}

  // 6. Asynchronously sync to Supabase (fail-safe)
  (async () => {
    try {
      if (userId) {
        await supabase.from('paper_ratings').upsert({
          user_id: userId,
          paper_id: paperId,
          impact: newImpact,
          clarity: newClarity,
          visuals: newVisuals,
          updated_at: nowIso,
        });
      }

      await supabase.from('paper_metrics').upsert({
        paper_id: paperId,
        views: updatedMetrics.views,
        impact_sum: nextImpactSum,
        impact_count: nextImpactCount,
        clarity_sum: nextClaritySum,
        clarity_count: nextClarityCount,
        visuals_sum: nextVisualsSum,
        visuals_count: nextVisualsCount,
        community_rating: nextCommunityRating,
        rating_score: ratingScore,
        popularity_score: popularityScore,
        hype_score: hypeScore,
        updated_at: nowIso,
      });
    } catch {}
  })();

  return {
    metrics: updatedMetrics,
    userRating: updatedUserRating,
  };
}

/**
 * Increments view and live popularity counters when a paper is opened
 */
export async function recordPaperView(paperId: string): Promise<PaperMetrics> {
  const current = await getPaperMetrics(paperId);
  const nextViews = current.views + 1;
  const nextViewsLastHour = current.viewsLastHour + 1;
  const nextViewsLast24h = current.viewsLast24h + 1;

  const popularityScore = calculatePopularityScore(nextViews);
  const hypeScore = calculateFinalHypeScore(current.ratingScore, popularityScore);

  const updated: PaperMetrics = {
    ...current,
    views: nextViews,
    viewsLastHour: nextViewsLastHour,
    viewsLast24h: nextViewsLast24h,
    popularityScore,
    hypeScore,
    trendScore: Math.round((nextViewsLast24h / Math.max(1, nextViews)) * 100),
  };

  inMemoryMetricsCache.set(paperId, updated);
  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${paperId}`,
      JSON.stringify(updated)
    );
  } catch {}

  return updated;
}
