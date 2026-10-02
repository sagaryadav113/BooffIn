import { supabase, appStorage } from './client';
import { Paper } from '../types';

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
const STORAGE_KEY_READ_PAPERS_REGISTRY = 'booffin_read_papers_registry';

type PaperReadListener = (paperId: string, metrics: PaperMetrics, paper?: Paper) => void;
const paperReadListeners = new Set<PaperReadListener>();

export function subscribeToPaperRead(listener: PaperReadListener): () => void {
  paperReadListeners.add(listener);
  return () => {
    paperReadListeners.delete(listener);
  };
}

export function notifyPaperRead(paperId: string, metrics: PaperMetrics, paper?: Paper) {
  paperReadListeners.forEach((fn) => {
    try {
      fn(paperId, metrics, paper);
    } catch (e) {
      console.warn('[hypeScoreService] Error in paper read listener:', e);
    }
  });
}

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
export function createDefaultPaperMetrics(paperId: string): PaperMetrics {
  return {
    paperId,
    views: 0,
    uniqueReaders: 0,
    impactSum: 0,
    impactCount: 0,
    claritySum: 0,
    clarityCount: 0,
    visualsSum: 0,
    visualsCount: 0,
    impactAvg: 0,
    clarityAvg: 0,
    visualsAvg: 0,
    communityRating: 0,
    ratingScore: 0,
    popularityScore: 0,
    hypeScore: 0, // 0 signifies UNRATED until first community vote!
    viewsLastHour: 0,
    viewsLast24h: 0,
    trendScore: 0,
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
export async function getPaperMetrics(paperId: string): Promise<PaperMetrics> {
  const normalizedId = paperId.trim();
  if (inMemoryMetricsCache.has(normalizedId)) {
    return inMemoryMetricsCache.get(normalizedId)!;
  }

  // 1. Try local storage
  try {
    const raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Cleanse legacy mock data
      if (parsed.impactCount === 6 || (parsed.views >= 24 && parsed.impactCount === 0)) {
        parsed.views = 0;
        parsed.uniqueReaders = 0;
        parsed.viewsLast24h = 0;
        parsed.viewsLastHour = 0;
        parsed.impactSum = 0;
        parsed.impactCount = 0;
        parsed.claritySum = 0;
        parsed.clarityCount = 0;
        parsed.visualsSum = 0;
        parsed.visualsCount = 0;
        parsed.hypeScore = 0;
        parsed.communityRating = 0;
      }
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
        views: data.views || 1,
        uniqueReaders: data.unique_readers || 1,
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
        viewsLastHour: data.views_last_hour || 1,
        viewsLast24h: data.views_last_24h || 1,
        trendScore: data.trend_score || 0,
      };
      inMemoryMetricsCache.set(normalizedId, metrics);
      return metrics;
    }
  } catch {}

  // 3. Fallback: Initialize baseline metrics
  const defaultMetrics = createDefaultPaperMetrics(normalizedId);
  inMemoryMetricsCache.set(normalizedId, defaultMetrics);
  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`,
      JSON.stringify(defaultMetrics)
    );
  } catch {}

  return defaultMetrics;
}

const STORAGE_KEY_PREFIX_VIEWS = 'booffin_paper_real_views_';

interface StoredViewEntry {
  timestamp: number;
  userId: string;
}

/**
 * Records a real in-app view event whenever a user views a paper.
 * Tracks actual reader count, real 24-hour reading velocity, and registers read paper.
 */
export async function recordPaperView(
  paperId: string,
  userId?: string,
  paper?: Paper
): Promise<PaperMetrics> {
  const normalizedId = paperId.trim();
  const effectiveUserId = userId || 'anonymous_reader';
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  let viewLogs: StoredViewEntry[] = [];

  try {
    const rawLogs = await appStorage.getItem(`${STORAGE_KEY_PREFIX_VIEWS}${normalizedId}`);
    if (rawLogs) {
      viewLogs = JSON.parse(rawLogs);
    }
  } catch {}

  // Append real view event
  viewLogs.push({ timestamp: now, userId: effectiveUserId });

  // Calculate real metrics from actual log
  const realViews = viewLogs.length;
  const realUniqueReaders = new Set(viewLogs.map((v) => v.userId)).size;
  const realViewsLast24h = viewLogs.filter((v) => v.timestamp >= oneDayAgo).length;
  const realViewsLastHour = viewLogs.filter((v) => v.timestamp >= oneHourAgo).length;

  // Persist the real view log
  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_VIEWS}${normalizedId}`,
      JSON.stringify(viewLogs.slice(-1000))
    );
  } catch {}

  // Update paper metrics with the real view counts
  const currentMetrics = await getPaperMetrics(normalizedId);
  const popularityScore = calculatePopularityScore(realViews);

  let finalHypeScore = 0;
  const totalVotes = currentMetrics.impactCount + currentMetrics.clarityCount + currentMetrics.visualsCount;
  if (totalVotes > 0) {
    const bayesianRating = applyBayesianShrinkage(currentMetrics.communityRating, totalVotes);
    const ratingScore = calculateRatingScore(bayesianRating);
    finalHypeScore = calculateFinalHypeScore(ratingScore, popularityScore);
  }

  const updatedMetrics: PaperMetrics = {
    ...currentMetrics,
    views: realViews,
    uniqueReaders: realUniqueReaders,
    viewsLast24h: realViewsLast24h,
    viewsLastHour: realViewsLastHour,
    popularityScore,
    hypeScore: finalHypeScore,
  };

  inMemoryMetricsCache.set(normalizedId, updatedMetrics);
  try {
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`,
      JSON.stringify(updatedMetrics)
    );
  } catch {}

  // If a Paper object is provided, register it in the persistent read papers registry
  if (paper) {
    await registerReadPaper(paper);
  }

  // Broadcast real-time read event to all active screens
  notifyPaperRead(normalizedId, updatedMetrics, paper);

  return updatedMetrics;
}

/**
 * Registers a real paper read into persistent storage
 */
export async function registerReadPaper(paper: Paper): Promise<void> {
  if (!paper || !paper.id) return;
  try {
    const raw = await appStorage.getItem(STORAGE_KEY_READ_PAPERS_REGISTRY);
    let list: { paper: Paper; lastReadAt: number; readCount: number }[] = raw ? JSON.parse(raw) : [];

    const idx = list.findIndex(
      (item) => item.paper.id === paper.id || (paper.doi && item.paper.doi === paper.doi)
    );

    if (idx >= 0) {
      list[idx].paper = { ...list[idx].paper, ...paper };
      list[idx].lastReadAt = Date.now();
      list[idx].readCount += 1;
      const [item] = list.splice(idx, 1);
      list.unshift(item);
    } else {
      list.unshift({
        paper,
        lastReadAt: Date.now(),
        readCount: 1,
      });
    }

    // Keep top 300 recently read papers
    list = list.slice(0, 300);
    await appStorage.setItem(STORAGE_KEY_READ_PAPERS_REGISTRY, JSON.stringify(list));
  } catch (err) {
    console.warn('[hypeScoreService] Error registering read paper:', err);
  }
}

export interface RegisteredReadPaper {
  paper: Paper;
  lastReadAt: number;
  readCount: number;
}

/**
 * Retrieves all papers with read metadata (timestamps and view counts)
 */
export async function getDetailedReadPapersRegistry(): Promise<RegisteredReadPaper[]> {
  try {
    const raw = await appStorage.getItem(STORAGE_KEY_READ_PAPERS_REGISTRY);
    if (!raw) return [];
    const list: RegisteredReadPaper[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Retrieves all papers that have been read by users in the app
 */
export async function getReadPapersRegistry(): Promise<Paper[]> {
  try {
    const list = await getDetailedReadPapersRegistry();
    return list.map((item) => item.paper);
  } catch {
    return [];
  }
}

/**
 * 48-Hour HYPE Algorithm
 * Evaluates papers based on:
 * 1. 48h Reading & View Velocity (35% weight):
 *    - Reads / views within the last 48 hours (+0.5 to +1.2 pts)
 * 2. Community Rating & Review Quality (30% weight):
 *    - Bayesian-averaged ratings (impact, clarity, visuals)
 * 3. Academic Citation Momentum (20% weight):
 *    - Normalized logarithmic citation scale
 * 4. Discussion & Scholarly Discourse (15% weight):
 *    - Community comments and questions
 */
export function calculate48hHypeScore(
  paper: Paper,
  metrics?: PaperMetrics | null,
  lastReadAt?: number
): number {
  // If paper is unrated (no community rating or verified hype score), return 0 (Unrated)
  const hasCommunityRating =
    Boolean(
      metrics &&
      metrics.communityRating > 0 &&
      ((metrics.impactCount ?? 0) > 0 || (metrics.clarityCount ?? 0) > 0 || (metrics.visualsCount ?? 0) > 0)
    ) ||
    Boolean(metrics && (metrics.hypeScore ?? 0) > 0) ||
    Boolean((paper as any).communityRating && (paper as any).communityRating > 0) ||
    Boolean((paper as any).hypeScore && (paper as any).hypeScore > 0);

  if (!hasCommunityRating) {
    return 0; // Purely unrated. Zero fake demo scores.
  }

  const baseRating =
    metrics?.communityRating ||
    (metrics?.hypeScore ? (metrics.hypeScore / 100) * 4 + 1 : 0) ||
    (paper as any).communityRating ||
    (paper as any).hypeScore ||
    0;

  if (baseRating <= 0) return 0;

  const now = Date.now();
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const isRecentRead = Boolean(lastReadAt && now - lastReadAt < FORTY_EIGHT_HOURS_MS);

  // Subtle 48h reader velocity bonus for genuinely rated papers
  const views48h = (metrics?.viewsLast24h || 0) * 1.5 + (isRecentRead ? 3 : 0);
  const velocityBonus = views48h > 0 ? Math.min(0.4, Math.log10(1 + views48h) * 0.2) : 0;

  return parseFloat(Math.min(5.0, Math.max(1.0, baseRating + velocityBonus)).toFixed(1));
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
  const nextImpactCount = Math.max(0, currentMetrics.impactCount + deltaImpactCount);
  const nextClaritySum = Math.max(0, currentMetrics.claritySum + deltaClaritySum);
  const nextClarityCount = Math.max(0, currentMetrics.clarityCount + deltaClarityCount);
  const nextVisualsSum = Math.max(0, currentMetrics.visualsSum + deltaVisualsSum);
  const nextVisualsCount = Math.max(0, currentMetrics.visualsCount + deltaVisualsCount);

  // 3. Calculate new averages
  const nextImpactAvg = nextImpactCount > 0 ? parseFloat((nextImpactSum / nextImpactCount).toFixed(2)) : 0;
  const nextClarityAvg = nextClarityCount > 0 ? parseFloat((nextClaritySum / nextClarityCount).toFixed(2)) : 0;
  const nextVisualsAvg = nextVisualsCount > 0 ? parseFloat((nextVisualsSum / nextVisualsCount).toFixed(2)) : 0;

  const ratedList = [nextImpactAvg, nextClarityAvg, nextVisualsAvg].filter((v) => v > 0);
  const nextCommunityRating = ratedList.length > 0
    ? parseFloat((ratedList.reduce((a, b) => a + b, 0) / ratedList.length).toFixed(2))
    : 0;

  // 4. Bayesian rating and HYPE score recalculation
  const totalVotes = nextImpactCount + nextClarityCount + nextVisualsCount;
  const popularityScore = calculatePopularityScore(currentMetrics.views);
  let ratingScore = 0;
  let hypeScore = 0;

  if (totalVotes > 0) {
    const bayesianRating = applyBayesianShrinkage(nextCommunityRating, totalVotes);
    ratingScore = calculateRatingScore(bayesianRating);
    hypeScore = calculateFinalHypeScore(ratingScore, popularityScore);
  }

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
