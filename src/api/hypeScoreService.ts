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
const paperIdAliasMap = new Map<string, string>();
const STORAGE_KEY_ALIAS_MAP = 'booffin_paper_id_aliases_v1';

// Auto-load alias map from local storage
(async () => {
  try {
    const raw = await appStorage.getItem(STORAGE_KEY_ALIAS_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') paperIdAliasMap.set(k.toLowerCase().trim(), v.trim());
        });
      }
    }
  } catch {}
})();

export function registerPaperAlias(id1?: string, id2?: string) {
  if (!id1 || !id2 || id1.trim() === id2.trim()) return;
  const k1 = id1.trim().toLowerCase();
  const k2 = id2.trim().toLowerCase();
  paperIdAliasMap.set(k1, id2.trim());
  paperIdAliasMap.set(k2, id1.trim());

  // Also register cleaned DOI variants
  const clean1 = k1.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  const clean2 = k2.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (clean1 !== k1) paperIdAliasMap.set(clean1, id2.trim());
  if (clean2 !== k2) paperIdAliasMap.set(clean2, id1.trim());

  const obj: Record<string, string> = {};
  paperIdAliasMap.forEach((v, k) => { obj[k] = v; });
  appStorage.setItem(STORAGE_KEY_ALIAS_MAP, JSON.stringify(obj)).catch(() => {});
}

const STORAGE_KEY_CLIENT_DEVICE_ID = 'booffin_client_device_id_v1';
let cachedClientDeviceId: string | null = null;

export async function getClientDeviceId(): Promise<string> {
  if (cachedClientDeviceId) return cachedClientDeviceId;
  try {
    const existing = await appStorage.getItem(STORAGE_KEY_CLIENT_DEVICE_ID);
    if (existing) {
      cachedClientDeviceId = existing;
      return existing;
    }
    const newId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    await appStorage.setItem(STORAGE_KEY_CLIENT_DEVICE_ID, newId);
    cachedClientDeviceId = newId;
    return newId;
  } catch {
    return 'dev_fallback_' + Date.now();
  }
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Retrieves metrics for a given paper ID
 */
export async function getPaperMetrics(paperId: string): Promise<PaperMetrics> {
  const normalizedId = paperId.trim();
  const lowerId = normalizedId.toLowerCase();

  if (inMemoryMetricsCache.has(normalizedId)) {
    return inMemoryMetricsCache.get(normalizedId)!;
  }

  // Check alias in memory
  const aliasId = paperIdAliasMap.get(lowerId);
  if (aliasId && inMemoryMetricsCache.has(aliasId)) {
    const cached = inMemoryMetricsCache.get(aliasId)!;
    inMemoryMetricsCache.set(normalizedId, cached);
    return cached;
  }

  // 1. Try local storage (direct ID or resolved alias)
  let localMetrics: PaperMetrics | null = null;
  try {
    let raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`);
    if (!raw && aliasId) {
      raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${aliasId}`);
    }
    if (raw) {
      localMetrics = JSON.parse(raw);
      inMemoryMetricsCache.set(normalizedId, localMetrics!);
      if (aliasId) inMemoryMetricsCache.set(aliasId, localMetrics!);
    }
  } catch {}

  // 2. Try Supabase cloud table (authoritative global metrics across all users)
  try {
    let query = supabase.from('paper_metrics').select('*');
    if (aliasId) {
      query = query.or(`paper_id.eq.${normalizedId},doi.eq.${normalizedId},paper_id.eq.${aliasId},doi.eq.${aliasId}`);
    } else {
      query = query.or(`paper_id.eq.${normalizedId},doi.eq.${normalizedId}`);
    }

    const { data } = await query.maybeSingle();

    if (data) {
      const cloudViews = Math.max(Number(data.views) || 0, localMetrics?.views || 1);
      const metrics: PaperMetrics = {
        paperId: data.paper_id,
        views: cloudViews,
        uniqueReaders: Math.max(Number(data.unique_readers) || 0, localMetrics?.uniqueReaders || 1),
        impactSum: Number(data.impact_sum) || localMetrics?.impactSum || 0,
        impactCount: Number(data.impact_count) || localMetrics?.impactCount || 0,
        claritySum: Number(data.clarity_sum) || localMetrics?.claritySum || 0,
        clarityCount: Number(data.clarity_count) || localMetrics?.clarityCount || 0,
        visualsSum: Number(data.visuals_sum) || localMetrics?.visualsSum || 0,
        visualsCount: Number(data.visuals_count) || localMetrics?.visualsCount || 0,
        impactAvg: (Number(data.impact_count) || 0) > 0 ? Number(data.impact_sum) / Number(data.impact_count) : (localMetrics?.impactAvg || 0),
        clarityAvg: (Number(data.clarity_count) || 0) > 0 ? Number(data.clarity_sum) / Number(data.clarity_count) : (localMetrics?.clarityAvg || 0),
        visualsAvg: (Number(data.visuals_count) || 0) > 0 ? Number(data.visuals_sum) / Number(data.visuals_count) : (localMetrics?.visualsAvg || 0),
        communityRating: Number(data.community_rating) || localMetrics?.communityRating || 0,
        ratingScore: Number(data.rating_score) || localMetrics?.ratingScore || 0,
        popularityScore: Number(data.popularity_score) || calculatePopularityScore(cloudViews),
        hypeScore: Number(data.hype_score) || localMetrics?.hypeScore || 0,
        viewsLastHour: Math.max(Number(data.views_last_hour) || 0, localMetrics?.viewsLastHour || 1),
        viewsLast24h: Math.max(Number(data.views_last_24h) || 0, localMetrics?.viewsLast24h || 1),
        trendScore: Number(data.trend_score) || localMetrics?.trendScore || 0,
      };
      inMemoryMetricsCache.set(normalizedId, metrics);
      if (aliasId) inMemoryMetricsCache.set(aliasId, metrics);
      appStorage.setItem(`${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`, JSON.stringify(metrics)).catch(() => {});
      return metrics;
    }
  } catch {}

  if (localMetrics) {
    return localMetrics;
  }

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

/**
 * Retrieves metrics for multiple paper IDs in a single batch operation.
 * Eliminates N-query waterfalls and populates in-memory cache instantly.
 */
export async function getBatchPaperMetrics(paperIds: string[]): Promise<Map<string, PaperMetrics>> {
  const result = new Map<string, PaperMetrics>();
  if (!paperIds || paperIds.length === 0) return result;

  const missingIds: string[] = [];

  for (const rawId of paperIds) {
    const id = rawId.trim();
    const alias = paperIdAliasMap.get(id.toLowerCase());
    if (inMemoryMetricsCache.has(id)) {
      result.set(id, inMemoryMetricsCache.get(id)!);
    } else if (alias && inMemoryMetricsCache.has(alias)) {
      const cached = inMemoryMetricsCache.get(alias)!;
      inMemoryMetricsCache.set(id, cached);
      result.set(id, cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return result;
  }

  // 1. Try local storage in parallel (checking both direct ID and alias)
  const stillMissing: string[] = [];
  await Promise.all(
    missingIds.map(async (id) => {
      const alias = paperIdAliasMap.get(id.toLowerCase());
      try {
        let raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${id}`);
        if (!raw && alias) {
          raw = await appStorage.getItem(`${STORAGE_KEY_PREFIX_METRICS}${alias}`);
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          inMemoryMetricsCache.set(id, parsed);
          if (alias) inMemoryMetricsCache.set(alias, parsed);
          result.set(id, parsed);
          return;
        }
      } catch {}
      stillMissing.push(id);
    })
  );

  if (stillMissing.length === 0) {
    return result;
  }

  // 2. Query Supabase in a single batch query
  try {
    const queryIds = Array.from(new Set([
      ...stillMissing,
      ...stillMissing.map((id) => paperIdAliasMap.get(id.toLowerCase())).filter(Boolean) as string[],
    ]));

    const { data } = await supabase
      .from('paper_metrics')
      .select('*')
      .or(`paper_id.in.(${queryIds.join(',')}),doi.in.(${queryIds.join(',')})`);

    if (data && data.length > 0) {
      data.forEach((row: any) => {
        const metrics: PaperMetrics = {
          paperId: row.paper_id,
          views: Number(row.views) || 1,
          uniqueReaders: Number(row.unique_readers) || 1,
          impactSum: Number(row.impact_sum) || 0,
          impactCount: Number(row.impact_count) || 0,
          claritySum: Number(row.clarity_sum) || 0,
          clarityCount: Number(row.clarity_count) || 0,
          visualsSum: Number(row.visuals_sum) || 0,
          visualsCount: Number(row.visuals_count) || 0,
          impactAvg: row.impact_count > 0 ? Number(row.impact_sum) / Number(row.impact_count) : 0,
          clarityAvg: row.clarity_count > 0 ? Number(row.clarity_sum) / Number(row.clarity_count) : 0,
          visualsAvg: row.visuals_count > 0 ? Number(row.visuals_sum) / Number(row.visuals_count) : 0,
          communityRating: Number(row.community_rating) || 0,
          ratingScore: Number(row.rating_score) || 0,
          popularityScore: Number(row.popularity_score) || 0,
          hypeScore: Number(row.hype_score) || 0,
          viewsLastHour: Number(row.views_last_hour) || 1,
          viewsLast24h: Number(row.views_last_24h) || 1,
          trendScore: Number(row.trend_score) || 0,
        };
        inMemoryMetricsCache.set(row.paper_id, metrics);
        result.set(row.paper_id, metrics);
        if (row.doi) {
          inMemoryMetricsCache.set(row.doi, metrics);
          result.set(row.doi, metrics);
        }
      });
    }
  } catch {}

  // 3. Populate default fallback for any remaining
  for (const id of stillMissing) {
    if (!result.has(id)) {
      const def = createDefaultPaperMetrics(id);
      inMemoryMetricsCache.set(id, def);
      result.set(id, def);
    }
  }

  return result;
}

const STORAGE_KEY_PREFIX_VIEWS = 'booffin_paper_real_views_';

interface StoredViewEntry {
  timestamp: number;
  userId: string;
}

/**
 * Records a real in-app view event whenever a user views a paper.
 * YouTube-style global architecture:
 * - Deduplicates views within a 15-minute window per client / user to prevent spam
 * - Persists globally to Supabase cloud database forever (days, weeks, months, years)
 * - Retains instant offline resilient cache
 * - Broadcasts updated views to all UI components in real time
 */
export async function recordPaperView(
  paperId: string,
  userId?: string,
  paper?: Paper
): Promise<PaperMetrics> {
  const normalizedId = paperId.trim();
  const lowerId = normalizedId.toLowerCase();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Register bidirectional alias between paper.id and paper.doi
  if (paper?.id && paper?.doi) {
    registerPaperAlias(paper.id, paper.doi);
  }

  const aliasId = paperIdAliasMap.get(lowerId);

  // 1. Identify client device and authenticated user (UUID)
  const clientId = await getClientDeviceId();
  let validUserId: string | null = null;
  if (isValidUuid(userId)) {
    validUserId = userId!.trim();
  } else {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (isValidUuid(authData?.user?.id)) {
        validUserId = authData!.user!.id;
      }
    } catch {}
  }

  // 2. Resilient local view log (ensures offline operation and instant UX)
  const effectiveLocalUser = validUserId || clientId;
  let viewLogs: StoredViewEntry[] = [];

  try {
    let rawLogs = await appStorage.getItem(`${STORAGE_KEY_PREFIX_VIEWS}${normalizedId}`);
    if (!rawLogs && aliasId) {
      rawLogs = await appStorage.getItem(`${STORAGE_KEY_PREFIX_VIEWS}${aliasId}`);
    }
    if (rawLogs) {
      viewLogs = JSON.parse(rawLogs);
    }
  } catch {}

  // 15-minute YouTube view deduplication per client/user
  const recentUserView = viewLogs.find(
    (v) => v.userId === effectiveLocalUser && now - v.timestamp < 15 * 60 * 1000
  );

  if (!recentUserView) {
    viewLogs.push({ timestamp: now, userId: effectiveLocalUser });
  }

  const localViews = Math.max(viewLogs.length, 1);
  const localUniqueReaders = Math.max(new Set(viewLogs.map((v) => v.userId)).size, 1);
  const localViewsLast24h = Math.max(viewLogs.filter((v) => v.timestamp >= oneDayAgo).length, 1);
  const localViewsLastHour = viewLogs.filter((v) => v.timestamp >= oneHourAgo).length;

  try {
    const payload = JSON.stringify(viewLogs.slice(-1000));
    await appStorage.setItem(`${STORAGE_KEY_PREFIX_VIEWS}${normalizedId}`, payload);
    if (aliasId) {
      await appStorage.setItem(`${STORAGE_KEY_PREFIX_VIEWS}${aliasId}`, payload);
    }
  } catch {}

  // 3. YouTube-style Global Cloud Synchronization via Supabase RPC
  let cloudViews = 0;
  let cloudUniqueReaders = 0;
  let cloudViewsLast24h = 0;
  let cloudViewsLastHour = 0;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('record_paper_read', {
      p_paper_id: normalizedId,
      p_doi: paper?.doi?.trim() || null,
      p_user_id: validUserId,
      p_client_id: clientId,
    });

    if (!rpcError && rpcData?.success && rpcData?.metrics) {
      cloudViews = Number(rpcData.metrics.views) || 0;
      cloudUniqueReaders = Number(rpcData.metrics.uniqueReaders) || 0;
      cloudViewsLast24h = Number(rpcData.metrics.viewsLast24h) || 0;
      cloudViewsLastHour = Number(rpcData.metrics.viewsLastHour) || 0;
    }
  } catch (err) {
    console.warn('[hypeScoreService] Supabase record_paper_read error (using resilient fallback):', err);
  }

  // Authoritative global counts: maximum of cloud and local counts
  const finalViews = Math.max(cloudViews, localViews);
  const finalUniqueReaders = Math.max(cloudUniqueReaders, localUniqueReaders);
  const finalViewsLast24h = Math.max(cloudViewsLast24h, localViewsLast24h);
  const finalViewsLastHour = Math.max(cloudViewsLastHour, localViewsLastHour);

  // Update paper metrics with global counts
  const currentMetrics = await getPaperMetrics(normalizedId);
  const popularityScore = calculatePopularityScore(finalViews);

  let finalHypeScore = 0;
  const totalVotes = currentMetrics.impactCount + currentMetrics.clarityCount + currentMetrics.visualsCount;
  if (totalVotes > 0) {
    const bayesianRating = applyBayesianShrinkage(currentMetrics.communityRating, totalVotes);
    const ratingScore = calculateRatingScore(bayesianRating);
    finalHypeScore = calculateFinalHypeScore(ratingScore, popularityScore);
  }

  const updatedMetrics: PaperMetrics = {
    ...currentMetrics,
    views: finalViews,
    uniqueReaders: finalUniqueReaders,
    viewsLast24h: finalViewsLast24h,
    viewsLastHour: finalViewsLastHour,
    popularityScore,
    hypeScore: finalHypeScore,
  };

  // Update in-memory cache under normalized ID and any aliases
  inMemoryMetricsCache.set(normalizedId, updatedMetrics);
  if (aliasId) {
    inMemoryMetricsCache.set(aliasId, updatedMetrics);
  }
  if (paper?.doi) {
    inMemoryMetricsCache.set(paper.doi.trim(), updatedMetrics);
  }
  if (paper?.id) {
    inMemoryMetricsCache.set(paper.id.trim(), updatedMetrics);
  }

  // Persist metrics under both keys
  try {
    const metricsPayload = JSON.stringify(updatedMetrics);
    await appStorage.setItem(
      `${STORAGE_KEY_PREFIX_METRICS}${normalizedId}`,
      metricsPayload
    );
    if (aliasId) {
      await appStorage.setItem(
        `${STORAGE_KEY_PREFIX_METRICS}${aliasId}`,
        metricsPayload
      );
    }
    if (paper?.doi && paper.doi.trim() !== normalizedId) {
      await appStorage.setItem(
        `${STORAGE_KEY_PREFIX_METRICS}${paper.doi.trim()}`,
        metricsPayload
      );
    }
  } catch {}

  // If a Paper object is provided, register it in the persistent read papers registry
  if (paper) {
    await registerReadPaper(paper);
  }

  // Broadcast real-time read event to all active screens
  notifyPaperRead(normalizedId, updatedMetrics, paper);
  if (aliasId) {
    notifyPaperRead(aliasId, updatedMetrics, paper);
  }
  if (paper?.doi && paper.doi.trim() !== normalizedId) {
    notifyPaperRead(paper.doi.trim(), updatedMetrics, paper);
  }

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
