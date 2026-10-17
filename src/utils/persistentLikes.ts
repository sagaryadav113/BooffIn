import { supabase, appStorage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

// In-memory cache for ultra-fast synchronous UI lookups and mapper resolution
const userLikedCommentsCache = new Map<string, Set<string>>();
const storageLoadedMap = new Map<string, boolean>();

/**
 * Resolves the effective user ID for like operations.
 * Checks explicit parameter -> auth store -> Supabase auth -> 'anonymous'.
 */
async function resolveEffectiveUserId(userId?: string): Promise<string> {
  if (userId && userId.trim().length > 0 && userId !== 'anonymous') {
    return userId.trim();
  }
  const storeUser = useAuthStore.getState().user;
  if (storeUser?.id && storeUser.id.trim().length > 0 && storeUser.id !== 'usr_me') {
    return storeUser.id.trim();
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id.trim();
  } catch {}
  return 'anonymous';
}

function getStorageKey(userId?: string): string {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return `@booffin_liked_comments_${normalizedUser}`;
}

/**
 * Synchronously check if a comment or reply ID is liked by the user.
 */
export function isCommentLikedSync(commentId: string, userId?: string): boolean {
  if (!commentId) return false;
  
  // 1. Check explicit user ID cache
  if (userId && userId.trim().length > 0) {
    const set = userLikedCommentsCache.get(userId.trim());
    if (set && set.has(commentId)) return true;
  }

  // 2. Check auth store user cache
  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && storeUserId.trim().length > 0) {
    const set = userLikedCommentsCache.get(storeUserId.trim());
    if (set && set.has(commentId)) return true;
  }

  // 3. Check anonymous cache fallback
  const anonSet = userLikedCommentsCache.get('anonymous');
  if (anonSet && anonSet.has(commentId)) return true;

  return false;
}

/**
 * Returns the synchronous Set of liked comment IDs for a user.
 */
export function getLikedCommentIdsSync(userId?: string): Set<string> {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  const direct = userLikedCommentsCache.get(normalizedUser);
  if (direct && direct.size > 0) return direct;

  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && userLikedCommentsCache.has(storeUserId)) {
    return userLikedCommentsCache.get(storeUserId)!;
  }

  return userLikedCommentsCache.get('anonymous') || new Set<string>();
}

/**
 * Loads the user's liked comment IDs from persistent storage into memory cache.
 * Guarantees existing IDs are merged and never overwritten.
 */
export async function loadUserLikedComments(userId?: string): Promise<Set<string>> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getStorageKey(effectiveUserId);

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

    // Merge with any existing in-memory set so we never drop likes
    const existing = userLikedCommentsCache.get(effectiveUserId) || new Set<string>();
    for (const id of ids) {
      existing.add(id);
    }

    // If logged in, also merge any anonymous likes
    if (effectiveUserId !== 'anonymous') {
      const anonRaw = await appStorage.getItem(getStorageKey('anonymous'));
      if (anonRaw) {
        try {
          const anonParsed = JSON.parse(anonRaw);
          if (Array.isArray(anonParsed)) {
            anonParsed.forEach((id) => existing.add(id));
          }
        } catch {}
      }
    }

    userLikedCommentsCache.set(effectiveUserId, existing);
    storageLoadedMap.set(effectiveUserId, true);
    return existing;
  } catch {
    const fallback = userLikedCommentsCache.get(effectiveUserId) || new Set<string>();
    userLikedCommentsCache.set(effectiveUserId, fallback);
    return fallback;
  }
}

/**
 * Persists the user's liked comment IDs to persistent storage.
 */
async function saveUserLikedComments(userId: string | undefined, set: Set<string>): Promise<void> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getStorageKey(effectiveUserId);
  try {
    const arr = Array.from(set);
    await appStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (err) {
    console.warn('[persistentLikes] Failed to save liked comments:', err);
  }
}

/**
 * Toggles like status for a comment or reply:
 * 1. Ensures persistent storage is loaded FIRST (never overwrites with empty set)
 * 2. Synchronously updates in-memory cache
 * 3. Asynchronously persists to storage (AsyncStorage/SecureStore/localStorage)
 * 4. Atomically updates `comments.likes_count` in Supabase
 */
export async function toggleCommentLike(
  commentId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!commentId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'Missing comment ID' };
  }

  const effectiveUserId = await resolveEffectiveUserId(userId);

  // CRITICAL: Ensure existing liked comments are loaded from disk BEFORE modifying!
  let set = userLikedCommentsCache.get(effectiveUserId);
  if (!set || !storageLoadedMap.get(effectiveUserId)) {
    set = await loadUserLikedComments(effectiveUserId);
  }

  const willBeLiked = !isCurrentlyLiked;
  if (willBeLiked) {
    set.add(commentId);
  } else {
    set.delete(commentId);
  }

  userLikedCommentsCache.set(effectiveUserId, set);

  // Save to persistent storage immediately
  saveUserLikedComments(effectiveUserId, set).catch(() => {});

  // Update Supabase comments table likes_count atomically
  try {
    const { data: commentRow } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .maybeSingle();

    const currentLikes = typeof commentRow?.likes_count === 'number' ? commentRow.likes_count : 0;
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
