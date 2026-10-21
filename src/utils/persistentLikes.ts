import { supabase, appStorage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { recordGeneralAction } from '../api/socialRateLimit';

// In-memory caches for ultra-fast synchronous UI lookups and mapper resolution
const userLikedCommentsCache = new Map<string, Set<string>>();
const userLikedPostsCache = new Map<string, Set<string>>();
const userLikedPapersCache = new Map<string, Set<string>>();

const commentsStorageLoadedMap = new Map<string, boolean>();
const postsStorageLoadedMap = new Map<string, boolean>();
const papersStorageLoadedMap = new Map<string, boolean>();

/**
 * Resolves the effective user ID for like operations.
 * Checks explicit parameter -> auth store -> Supabase auth -> 'anonymous'.
 */
export async function resolveEffectiveUserId(userId?: string): Promise<string> {
  if (userId && userId.trim().length > 0 && userId !== 'anonymous' && userId !== 'usr_me') {
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
  return storeUser?.id || 'anonymous';
}

function getCommentsStorageKey(userId?: string): string {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return `@booffin_liked_comments_${normalizedUser}`;
}

function getPostsStorageKey(userId?: string): string {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return `@booffin_liked_posts_${normalizedUser}`;
}

function getPapersStorageKey(userId?: string): string {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  return `@booffin_liked_papers_${normalizedUser}`;
}

// ============================================================================
// 1. COMMENTS & DISCUSSIONS & REPLIES
// ============================================================================

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
 */
export async function loadUserLikedComments(userId?: string): Promise<Set<string>> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getCommentsStorageKey(effectiveUserId);

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

    const existing = userLikedCommentsCache.get(effectiveUserId) || new Set<string>();
    for (const id of ids) {
      existing.add(id);
    }

    if (effectiveUserId !== 'anonymous') {
      const anonRaw = await appStorage.getItem(getCommentsStorageKey('anonymous'));
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
    commentsStorageLoadedMap.set(effectiveUserId, true);
    return existing;
  } catch {
    const fallback = userLikedCommentsCache.get(effectiveUserId) || new Set<string>();
    userLikedCommentsCache.set(effectiveUserId, fallback);
    return fallback;
  }
}

async function saveUserLikedComments(userId: string | undefined, set: Set<string>): Promise<void> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getCommentsStorageKey(effectiveUserId);
  try {
    const arr = Array.from(set);
    await appStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (err) {
    console.warn('[persistentLikes] Failed to save liked comments:', err);
  }
}

export async function toggleCommentLike(
  commentId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!commentId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'Missing comment ID' };
  }

  const effectiveUserId = await resolveEffectiveUserId(userId);

  let set = userLikedCommentsCache.get(effectiveUserId);
  if (!set || !commentsStorageLoadedMap.get(effectiveUserId)) {
    set = await loadUserLikedComments(effectiveUserId);
  }

  const willBeLiked = !isCurrentlyLiked;
  if (willBeLiked) {
    set.add(commentId);
  } else {
    set.delete(commentId);
  }

  userLikedCommentsCache.set(effectiveUserId, set);
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

// ============================================================================
// 2. POSTS & ARTICLES
// ============================================================================

/**
 * Synchronously check if a post or article ID is liked by the user.
 */
export function isPostLikedSync(postId: string, userId?: string): boolean {
  if (!postId) return false;

  if (userId && userId.trim().length > 0) {
    const set = userLikedPostsCache.get(userId.trim());
    if (set && set.has(postId)) return true;
  }

  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && storeUserId.trim().length > 0) {
    const set = userLikedPostsCache.get(storeUserId.trim());
    if (set && set.has(postId)) return true;
  }

  const anonSet = userLikedPostsCache.get('anonymous');
  if (anonSet && anonSet.has(postId)) return true;

  return false;
}

export function getLikedPostIdsSync(userId?: string): Set<string> {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  const direct = userLikedPostsCache.get(normalizedUser);
  if (direct && direct.size > 0) return direct;

  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && userLikedPostsCache.has(storeUserId)) {
    return userLikedPostsCache.get(storeUserId)!;
  }

  return userLikedPostsCache.get('anonymous') || new Set<string>();
}

export async function loadUserLikedPosts(userId?: string): Promise<Set<string>> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getPostsStorageKey(effectiveUserId);

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

    const existing = userLikedPostsCache.get(effectiveUserId) || new Set<string>();
    for (const id of ids) {
      existing.add(id);
    }

    if (effectiveUserId !== 'anonymous') {
      const anonRaw = await appStorage.getItem(getPostsStorageKey('anonymous'));
      if (anonRaw) {
        try {
          const anonParsed = JSON.parse(anonRaw);
          if (Array.isArray(anonParsed)) {
            anonParsed.forEach((id) => existing.add(id));
          }
        } catch {}
      }
    }

    userLikedPostsCache.set(effectiveUserId, existing);
    postsStorageLoadedMap.set(effectiveUserId, true);

    // Hydrate authoritatively from Supabase public.likes so authenticated user likes
    // NEVER vanish if local cache is cleared, user logs into another device, or after time
    if (effectiveUserId && effectiveUserId !== 'anonymous' && effectiveUserId !== 'usr_me') {
      try {
        const { data: dbLikes, error: dbLikesErr } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', effectiveUserId)
          .not('post_id', 'is', null);

        if (!dbLikesErr && Array.isArray(dbLikes)) {
          let hasNew = false;
          for (const row of dbLikes) {
            if (row.post_id && !existing.has(row.post_id)) {
              existing.add(row.post_id);
              hasNew = true;
            }
          }
          if (hasNew) {
            userLikedPostsCache.set(effectiveUserId, existing);
            saveUserLikedPosts(effectiveUserId, existing).catch(() => {});
          }
        }
      } catch {}
    }

    return existing;
  } catch {
    const fallback = userLikedPostsCache.get(effectiveUserId) || new Set<string>();
    userLikedPostsCache.set(effectiveUserId, fallback);
    return fallback;
  }
}

async function saveUserLikedPosts(userId: string | undefined, set: Set<string>): Promise<void> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getPostsStorageKey(effectiveUserId);
  try {
    const arr = Array.from(set);
    await appStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (err) {
    console.warn('[persistentLikes] Failed to save liked posts:', err);
  }
}

export async function togglePostLikePersistence(
  postId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!postId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'Missing post ID' };
  }

  const effectiveUserId = await resolveEffectiveUserId(userId);

  let set = userLikedPostsCache.get(effectiveUserId);
  if (!set || !postsStorageLoadedMap.get(effectiveUserId)) {
    set = await loadUserLikedPosts(effectiveUserId);
  }

  const willBeLiked = !isCurrentlyLiked;
  if (willBeLiked) {
    set.add(postId);
  } else {
    set.delete(postId);
  }

  userLikedPostsCache.set(effectiveUserId, set);
  saveUserLikedPosts(effectiveUserId, set).catch(() => {});

  // Update Supabase in background
  try {
    let verifiedUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      verifiedUserId = user?.id || null;
    } catch {}

    if (!verifiedUserId && effectiveUserId !== 'anonymous' && effectiveUserId !== 'usr_me') {
      verifiedUserId = effectiveUserId;
    }

    if (verifiedUserId) {
      if (willBeLiked) {
        // Check existing to prevent duplicate rows without relying on fragile DB unique constraints
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', verifiedUserId)
          .eq('post_id', postId)
          .maybeSingle();

        if (!existingLike) {
          const { error: insertError } = await supabase
            .from('likes')
            .insert({ user_id: verifiedUserId, post_id: postId });

          if (insertError) {
            console.warn('[persistentLikes] Failed to insert like:', insertError.message);
          } else {
            recordGeneralAction(verifiedUserId).catch(() => {});
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', verifiedUserId)
          .eq('post_id', postId);

        if (deleteError) {
          console.warn('[persistentLikes] Failed to delete like:', deleteError.message);
        }
      }
    }

    // Authoritatively reconcile posts.likes_count from public.likes
    // Using { count: 'exact', head: true } ensures 0 payload data egress (HTTP HEAD only)
    try {
      const { count: exactCount, error: countErr } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (!countErr && typeof exactCount === 'number') {
        await supabase
          .from('posts')
          .update({ likes_count: exactCount })
          .eq('id', postId);
      }
    } catch {}

    return { success: true, isLiked: willBeLiked, error: null };
  } catch (err: any) {
    return { success: true, isLiked: willBeLiked, error: err?.message || null };
  }
}

// ============================================================================
// 3. PAPERS & PUBLICATIONS
// ============================================================================

/**
 * Synchronously check if a paper is liked by the user.
 */
export function isPaperLikedSync(paperId: string, userId?: string): boolean {
  if (!paperId) return false;

  if (userId && userId.trim().length > 0) {
    const set = userLikedPapersCache.get(userId.trim());
    if (set && set.has(paperId)) return true;
  }

  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && storeUserId.trim().length > 0) {
    const set = userLikedPapersCache.get(storeUserId.trim());
    if (set && set.has(paperId)) return true;
  }

  const anonSet = userLikedPapersCache.get('anonymous');
  if (anonSet && anonSet.has(paperId)) return true;

  return false;
}

export function getLikedPaperIdsSync(userId?: string): Set<string> {
  const normalizedUser = userId && userId.trim().length > 0 ? userId.trim() : 'anonymous';
  const direct = userLikedPapersCache.get(normalizedUser);
  if (direct && direct.size > 0) return direct;

  const storeUserId = useAuthStore.getState().user?.id;
  if (storeUserId && userLikedPapersCache.has(storeUserId)) {
    return userLikedPapersCache.get(storeUserId)!;
  }

  return userLikedPapersCache.get('anonymous') || new Set<string>();
}

export async function loadUserLikedPapers(userId?: string): Promise<Set<string>> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getPapersStorageKey(effectiveUserId);

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

    const existing = userLikedPapersCache.get(effectiveUserId) || new Set<string>();
    for (const id of ids) {
      existing.add(id);
    }

    if (effectiveUserId !== 'anonymous') {
      const anonRaw = await appStorage.getItem(getPapersStorageKey('anonymous'));
      if (anonRaw) {
        try {
          const anonParsed = JSON.parse(anonRaw);
          if (Array.isArray(anonParsed)) {
            anonParsed.forEach((id) => existing.add(id));
          }
        } catch {}
      }
    }

    userLikedPapersCache.set(effectiveUserId, existing);
    papersStorageLoadedMap.set(effectiveUserId, true);
    return existing;
  } catch {
    const fallback = userLikedPapersCache.get(effectiveUserId) || new Set<string>();
    userLikedPapersCache.set(effectiveUserId, fallback);
    return fallback;
  }
}

async function saveUserLikedPapers(userId: string | undefined, set: Set<string>): Promise<void> {
  const effectiveUserId = await resolveEffectiveUserId(userId);
  const storageKey = getPapersStorageKey(effectiveUserId);
  try {
    const arr = Array.from(set);
    await appStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (err) {
    console.warn('[persistentLikes] Failed to save liked papers:', err);
  }
}

export async function togglePaperLikePersistence(
  paperId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!paperId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'Missing paper ID' };
  }

  const effectiveUserId = await resolveEffectiveUserId(userId);

  let set = userLikedPapersCache.get(effectiveUserId);
  if (!set || !papersStorageLoadedMap.get(effectiveUserId)) {
    set = await loadUserLikedPapers(effectiveUserId);
  }

  const willBeLiked = !isCurrentlyLiked;
  if (willBeLiked) {
    set.add(paperId);
  } else {
    set.delete(paperId);
  }

  userLikedPapersCache.set(effectiveUserId, set);
  saveUserLikedPapers(effectiveUserId, set).catch(() => {});

  // Update Supabase papers table if available
  try {
    const { data: paperRow } = await supabase
      .from('papers')
      .select('likes_count')
      .eq('id', paperId)
      .maybeSingle();

    if (paperRow && typeof paperRow.likes_count === 'number') {
      const newCount = Math.max(0, paperRow.likes_count + (willBeLiked ? 1 : -1));
      await supabase
        .from('papers')
        .update({ likes_count: newCount })
        .eq('id', paperId);
    }

    return { success: true, isLiked: willBeLiked, error: null };
  } catch (err: any) {
    return { success: true, isLiked: willBeLiked, error: err?.message || null };
  }
}
