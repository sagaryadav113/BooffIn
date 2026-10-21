import { supabase, appStorage } from './client';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterMinutes?: number;
}

/**
 * Checks whether the current user is permitted to follow another researcher
 * according to anti-spam guardrails:
 * 1. Hard following cap: 7,500 accounts per user
 * 2. Hourly velocity limit: 20 follows per hour (rolling 60-minute window)
 * 3. Daily velocity limit:
 *    - New accounts (< 30 days old): 300 follows/day & 500 total actions/day
 *    - Established accounts: 500 follows/day
 */
export async function checkCanFollow(params: {
  userId: string;
  currentFollowingCount?: number;
  userJoinedDate?: string;
  userCreatedAt?: string;
}): Promise<RateLimitCheckResult> {
  const { userId, userJoinedDate, userCreatedAt } = params;
  if (!userId) return { allowed: true };

  // 1. Hard following cap: 7,500
  let followingCount = params.currentFollowingCount;
  if (followingCount === undefined) {
    try {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      followingCount = count ?? 0;
    } catch {
      followingCount = 0;
    }
  }

  if (followingCount >= 7500) {
    return {
      allowed: false,
      reason: 'You have reached the maximum following limit of 7,500 accounts. You must unfollow some accounts before you can follow more.',
    };
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // 2. Load follow timestamps from local storage
  let timestamps: number[] = [];
  try {
    const raw = await appStorage.getItem(`booffin_follow_rate_limit_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number' && t > oneDayAgo);
      }
    }
  } catch {}

  // 3. Hourly Velocity Check: 20 per hour
  const hourlyFollows = timestamps.filter((t) => t > oneHourAgo);
  if (hourlyFollows.length >= 20) {
    const oldestInHour = Math.min(...hourlyFollows);
    const retryAfterMinutes = Math.max(1, Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 60000));
    return {
      allowed: false,
      retryAfterMinutes,
      reason: `Action limit reached: You can follow up to 20 researchers per hour to prevent spam. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`,
    };
  }

  // 4. Account Age Check (New Account if < 30 days old)
  const isNewAccount = isAccountUnder30Days(userCreatedAt, userJoinedDate);
  const dailyLimit = isNewAccount ? 300 : 500;

  if (timestamps.length >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily follow limit reached: You can follow up to ${dailyLimit} researchers per day. Please try again tomorrow.`,
    };
  }

  // 5. Total actions check for new accounts: 500 actions/day
  if (isNewAccount) {
    let actionTimestamps: number[] = [];
    try {
      const rawActions = await appStorage.getItem(`booffin_daily_actions_${userId}`);
      if (rawActions) {
        const parsed = JSON.parse(rawActions);
        if (Array.isArray(parsed)) {
          actionTimestamps = parsed.filter((t) => typeof t === 'number' && t > oneDayAgo);
        }
      }
    } catch {}

    if (actionTimestamps.length >= 500) {
      return {
        allowed: false,
        reason: 'Daily activity limit reached: New accounts are limited to 500 total actions per day across all types to prevent network spam. Please try again tomorrow.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Records a successful follow action to update the sliding window
 */
export async function recordFollowAction(userId: string): Promise<void> {
  if (!userId) return;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  try {
    const raw = await appStorage.getItem(`booffin_follow_rate_limit_${userId}`);
    let timestamps: number[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number' && t > oneDayAgo);
      }
    }
    timestamps.push(now);
    await appStorage.setItem(`booffin_follow_rate_limit_${userId}`, JSON.stringify(timestamps));
  } catch {}

  // Also record as a general action
  await recordGeneralAction(userId);
}

/**
 * Records general social interactions (like, post, comment, follow) for new account limits
 */
export async function recordGeneralAction(userId: string): Promise<void> {
  if (!userId) return;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  try {
    const raw = await appStorage.getItem(`booffin_daily_actions_${userId}`);
    let timestamps: number[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number' && t > oneDayAgo);
      }
    }
    timestamps.push(now);
    await appStorage.setItem(`booffin_daily_actions_${userId}`, JSON.stringify(timestamps));
  } catch {}
}

/**
 * Helper to determine if an account is under 30 days old
 */
function isAccountUnder30Days(createdAt?: string, joinedDate?: string): boolean {
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!isNaN(createdTime)) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - createdTime < thirtyDaysMs;
    }
  }
  if (joinedDate) {
    const lower = joinedDate.toLowerCase();
    if (lower.includes('just now') || lower.includes('recently')) {
      return true;
    }
    const parsed = new Date(joinedDate).getTime();
    if (!isNaN(parsed)) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - parsed < thirtyDaysMs;
    }
  }
  return false;
}
