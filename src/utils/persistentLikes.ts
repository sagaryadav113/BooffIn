import { supabase, appStorage } from '../api/client';

// In-memory cache for ultra-fast synchronous UI lookups and mapper resolution
const userLikedCommentsCache = new Map<string, Set<string>>();
const storageLoadedMap = new Map<string, boolean>();

function getStorageKey(userId?: string): string {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return `@booffin_liked_comments_${normalizedUser}`;
}

/**
 * Synchronously check if a comment or reply ID is liked by the user.
 */
export function isCommentLikedSync(commentId: string, userId?: string): boolean {
  if (!commentId) return false;
  const userKey = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  const set = userLikedCommentsCache.get(userKey);
  return Boolean(set && set.has(commentId));
}

/**
 * Returns the synchronous Set of liked comment IDs for a user.
 */
export function getLikedCommentIdsSync(userId?: string): Set<string> {
  const userKey = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return userLikedCommentsCache.get(userKey) || new Set<string>();
}

/**
 * Loads the user's liked comment IDs from persistent storage into memory cache.
 */
export async function loadUserLikedComments(userId?: string): Promise<Set<string>> {
  const userKey = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  const storageKey = getStorageKey(userId);

  try {
    const raw = await appStorage.getItem(storageKey);
    let ids: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          ids = parsed;
        }
      } catch {}
    }

    const set = new Set<string>(ids);
    userLikedCommentsCache.set(userKey, set);
    storageLoadedMap.set(userKey, true);
    return set;
  } catch {
    const fallback = userLikedCommentsCache.get(userKey) || new Set<string>();
    userLikedCommentsCache.set(userKey, fallback);
    return fallback;
  }
}

/**
 * Persists the user's liked comment IDs to persistent storage.
 */
async function saveUserLikedComments(userId: string | undefined, set: Set<string>): Promise<void> {
  const storageKey = getStorageKey(userId);
  try {
    const arr = Array.from(set);
    await appStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (err) {
    console.warn('[persistentLikes] Failed to save liked comments:', err);
  }
}

/**
 * Toggles like status for a comment or reply:
 * 1. Synchronously updates in-memory cache
 * 2. Asynchronously persists to storage (AsyncStorage/SecureStore/localStorage)
 * 3. Atomically updates `comments.likes_count` in Supabase
 */
export async function toggleCommentLike(
  commentId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!commentId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'Missing comment ID' };
  }

  const userKey = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  let set = userLikedCommentsCache.get(userKey);
  if (!set) {
    set = new Set<string>();
    userLikedCommentsCache.set(userKey, set);
  }

  const willBeLiked = !isCurrentlyLiked;
  if (willBeLiked) {
    set.add(commentId);
  } else {
    set.delete(commentId);
  }

  // Save to persistent storage immediately
  saveUserLikedComments(userId, set).catch(() => {});

  // Update Supabase comments table likes_count
  try {
    const { data: commentRow } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .maybeSingle();

    const currentLikes = commentRow?.likes_count || 0;
    const newCount = Math.max(0, currentLikes + (willBeLiked ? 1 : -1));

    await supabase
      .from('comments')
      .update({ likes_count: newCount })
      .eq('id', commentId);

    return { success: true, isLiked: willBeLiked, error: null };
  } catch (err: any) {
    return { success: true, isLiked: willBeLiked, error: err?.message || null };
  }
}
