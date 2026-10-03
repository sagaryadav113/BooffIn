import { create } from 'zustand';
import {
  DiscussionContribution,
  DiscussionReply,
  DiscussionType,
  InterestedPerson,
  Paper,
  UserProfile,
} from '../types';
import { supabase } from '../api/client';
import {
  isCommentLikedSync,
  loadUserLikedComments,
  toggleCommentLike,
} from '../utils/persistentLikes';
import {
  toggleLike as apiToggleLike,
  deletePost as apiDeletePost,
  deleteComment as apiDeleteComment,
  formatRelativeTime,
  mapSupabaseProfile,
} from '../api/socialService';

interface DiscussionState {
  discussions: Record<string, DiscussionContribution[]>;
  activeFilter: 'all' | DiscussionType;
  isLoading: boolean;

  // Actions
  setActiveFilter: (filter: 'all' | DiscussionType) => void;
  fetchDiscussionsForPaper: (
    paperId: string,
    currentUserId?: string,
    doi?: string,
    canonicalUrl?: string
  ) => Promise<void>;
  getDiscussionsForPaper: (paperId: string, filter?: 'all' | DiscussionType) => DiscussionContribution[];
  addDiscussion: (params: {
    paper?: Paper;
    paperId: string;
    author: UserProfile;
    type: DiscussionType;
    content: string;
    title?: string;
  }) => Promise<DiscussionContribution | null>;
  addReply: (params: {
    paperId: string;
    discussionId: string;
    author: UserProfile;
    content: string;
  }) => Promise<DiscussionReply | null>;
  deleteDiscussion: (paperId: string, discussionId: string, currentUserId?: string) => Promise<boolean>;
  deleteReply: (paperId: string, discussionId: string, replyId: string, currentUserId?: string) => Promise<boolean>;
  toggleLikeDiscussion: (paperId: string, discussionId: string, currentUserId?: string) => void;
  toggleLikeReply: (paperId: string, discussionId: string, replyId: string, currentUserId?: string) => void;
  getParticipatingResearchers: (paperId: string) => UserProfile[];
  getInterestedPeople: (paper: Paper, currentUserId?: string) => InterestedPerson[];
}

/**
 * Extracts @mentions from text content
 */
function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace('@', '').toLowerCase())));
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves or creates a canonical row in public.papers table in Supabase
 * and returns the paper's UUID.
 */
export async function ensurePaperInDatabase(paper?: Partial<Paper> & { id: string; title?: string }): Promise<string | null> {
  if (!paper || !paper.id) return null;

  // 1. If ID is already a valid UUID, check if it exists
  if (UUID_REGEX.test(paper.id)) {
    const { data: existing } = await supabase
      .from('papers')
      .select('id')
      .eq('id', paper.id)
      .maybeSingle();
    if (existing?.id) return existing.id;
  }

  // 2. Lookup by DOI
  const cleanDoi = paper.doi ? paper.doi.trim().toLowerCase() : null;
  if (cleanDoi) {
    const { data: existingDoi } = await supabase
      .from('papers')
      .select('id')
      .ilike('doi', cleanDoi)
      .maybeSingle();
    if (existingDoi?.id) return existingDoi.id;
  }

  // 3. Lookup by canonical_url
  if (paper.canonicalUrl) {
    const { data: existingUrl } = await supabase
      .from('papers')
      .select('id')
      .eq('canonical_url', paper.canonicalUrl)
      .maybeSingle();
    if (existingUrl?.id) return existingUrl.id;
  }

  // 4. Insert new canonical row into papers table
  try {
    const safeCanonicalUrl =
      paper.canonicalUrl ||
      (cleanDoi ? `https://doi.org/${cleanDoi}` : `https://booffin.science/paper/${paper.id}`);

    const { data: inserted, error } = await supabase
      .from('papers')
      .insert({
        doi: cleanDoi,
        canonical_url: safeCanonicalUrl,
        title: paper.title || 'Research Publication',
        abstract: paper.abstract || null,
        journal: paper.journal || 'Academic Literature',
        publisher: paper.publisher || null,
        publication_year: paper.publicationYear || new Date().getFullYear(),
        open_access_pdf_url: paper.openAccessUrl || null,
        open_access_status: paper.isOpenAccess ? 'gold' : 'closed',
      })
      .select('id')
      .maybeSingle();

    if (inserted?.id) return inserted.id;
    if (error) {
      console.warn('[useDiscussionStore] ensurePaperInDatabase error:', error.message);
    }
  } catch (err) {
    console.warn('[useDiscussionStore] ensurePaperInDatabase exception:', err);
  }

  return null;
}

export const useDiscussionStore = create<DiscussionState>((set, get) => ({
  discussions: {},
  activeFilter: 'all',
  isLoading: false,

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  fetchDiscussionsForPaper: async (paperId: string, currentUserId?: string, doi?: string, canonicalUrl?: string) => {
    if (!paperId && !doi) return;
    set({ isLoading: true });

    try {
      await loadUserLikedComments(currentUserId);

      // Resolve paper UUID in database
      let resolvedPaperUuid: string | null = null;
      if (UUID_REGEX.test(paperId)) {
        resolvedPaperUuid = paperId;
      } else {
        const cleanDoi = doi ? doi.trim().toLowerCase() : paperId.startsWith('10.') ? paperId.trim().toLowerCase() : null;
        if (cleanDoi) {
          const { data: paperByDoi } = await supabase
            .from('papers')
            .select('id')
            .ilike('doi', cleanDoi)
            .maybeSingle();
          if (paperByDoi?.id) resolvedPaperUuid = paperByDoi.id;
        }
        if (!resolvedPaperUuid && canonicalUrl) {
          const { data: paperByUrl } = await supabase
            .from('papers')
            .select('id')
            .eq('canonical_url', canonicalUrl)
            .maybeSingle();
          if (paperByUrl?.id) resolvedPaperUuid = paperByUrl.id;
        }
      }

      if (!resolvedPaperUuid) {
        set((state) => ({
          discussions: {
            ...state.discussions,
            [paperId]: state.discussions[paperId] || [],
          },
          isLoading: false,
        }));
        return;
      }

      // Query posts referencing this paper's UUID from Supabase
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          post_type,
          likes_count,
          created_at,
          author:profiles!author_id(
            id,
            username,
            full_name,
            avatar_url,
            academic_title,
            institution,
            orcid_id,
            orcid_verified
          ),
          comments(
            id,
            content,
            likes_count,
            created_at,
            author:profiles!author_id(
              id,
              username,
              full_name,
              avatar_url,
              academic_title,
              institution,
              orcid_id,
              orcid_verified
            )
          )
        `)
        .eq('paper_id', resolvedPaperUuid)
        .order('created_at', { ascending: false });

      if (error || !data) {
        set({ isLoading: false });
        return;
      }

      const mapped: DiscussionContribution[] = data.map((row: any) => {
        const rawContent = row.content || '';
        let cleanContent = rawContent;
        let title: string | undefined = undefined;

        // Extract title if formatted as "Title\n\nContent"
        const parts = rawContent.split('\n\n');
        if (parts.length > 1 && parts[0].length < 120 && !parts[0].startsWith('[')) {
          title = parts[0];
          cleanContent = parts.slice(1).join('\n\n');
        }

        const author = mapSupabaseProfile(row.author);

        const replies: DiscussionReply[] = (row.comments || [])
          .filter((c: any) => !c.content || !c.content.startsWith('[POLL_VOTE:'))
          .map((c: any) => ({
            id: c.id,
            discussionId: row.id,
            author: mapSupabaseProfile(c.author),
            content: c.content || '',
            mentions: extractMentions(c.content || ''),
            likesCount: typeof c.likes_count === 'number' ? c.likes_count : 0,
            isLiked: isCommentLikedSync(c.id, currentUserId),
            createdAt: formatRelativeTime(c.created_at),
          }));

        return {
          id: row.id,
          paperId,
          author,
          type: (row.post_type as DiscussionType) || 'discussion',
          title,
          content: cleanContent,
          mentions: extractMentions(rawContent),
          likesCount: typeof row.likes_count === 'number' ? row.likes_count : 0,
          isLiked: isCommentLikedSync(row.id, currentUserId),
          repliesCount: replies.length,
          createdAt: formatRelativeTime(row.created_at),
          replies,
        };
      });

      set((state) => ({
        discussions: {
          ...state.discussions,
          [paperId]: mapped,
          ...(resolvedPaperUuid ? { [resolvedPaperUuid]: mapped } : {}),
        },
        isLoading: false,
      }));
    } catch (err) {
      console.warn('[useDiscussionStore.fetchDiscussionsForPaper] Error:', err);
      set({ isLoading: false });
    }
  },

  getDiscussionsForPaper: (paperId: string, filter?: 'all' | DiscussionType) => {
    const list = get().discussions[paperId] || [];
    const active = filter || get().activeFilter;
    if (!active || active === 'all') {
      return list;
    }
    return list.filter((d) => d.type === active);
  },

  addDiscussion: async ({ paper, paperId, author, type, content, title }) => {
    const mentions = extractMentions(content);
    const tempId = `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanContent = content.trim();

    const optimisticDiscussion: DiscussionContribution = {
      id: tempId,
      paperId,
      author,
      type,
      title: title?.trim() || undefined,
      content: cleanContent,
      mentions,
      likesCount: 0,
      isLiked: false,
      repliesCount: 0,
      createdAt: 'Just now',
      replies: [],
    };

    // 1. Optimistic state insert
    set((state) => {
      const existing = state.discussions[paperId] || [];
      return {
        discussions: {
          ...state.discussions,
          [paperId]: [optimisticDiscussion, ...existing],
        },
      };
    });

    // 2. Database mutation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return optimisticDiscussion;

      // Ensure canonical row in public.papers
      const targetPaper = paper || { id: paperId, title: title || 'Research Publication' };
      const paperDbId = await ensurePaperInDatabase(targetPaper);

      // Format content payload
      let formattedContent = cleanContent;
      if (title && title.trim()) {
        formattedContent = `${title.trim()}\n\n${formattedContent}`;
      }
      if (type !== 'discussion') {
        formattedContent = `[${type}] ${formattedContent}`;
      }

      const { data: postRow, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          post_type: type,
          content: formattedContent,
          paper_id: paperDbId,
          visibility: 'public',
        })
        .select(`
          id,
          content,
          post_type,
          likes_count,
          created_at,
          author:profiles!author_id (
            id,
            username,
            full_name,
            avatar_url,
            academic_title,
            institution,
            orcid_id,
            orcid_verified
          )
        `)
        .single();

      if (error || !postRow) {
        console.warn('[useDiscussionStore.addDiscussion] DB insert error:', error?.message);
        return optimisticDiscussion;
      }

      // Update optimistic discussion with persistent ID
      const persistentDiscussion: DiscussionContribution = {
        ...optimisticDiscussion,
        id: postRow.id,
        createdAt: formatRelativeTime(postRow.created_at),
      };

      set((state) => {
        const existing = state.discussions[paperId] || [];
        const updated = existing.map((d) => (d.id === tempId ? persistentDiscussion : d));
        return {
          discussions: {
            ...state.discussions,
            [paperId]: updated,
            ...(paperDbId ? { [paperDbId]: updated } : {}),
          },
        };
      });

      // Increment discussion count in papers table
      if (paperDbId) {
        try {
          const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('paper_id', paperDbId);
          if (typeof count === 'number') {
            await supabase.from('papers').update({ discussion_count: count }).eq('id', paperDbId);
          }
        } catch {}
      }

      return persistentDiscussion;
    } catch (err) {
      console.warn('[useDiscussionStore.addDiscussion] Exception:', err);
      return optimisticDiscussion;
    }
  },

  addReply: async ({ paperId, discussionId, author, content }) => {
    const mentions = extractMentions(content);
    const tempReplyId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanContent = content.trim();

    const optimisticReply: DiscussionReply = {
      id: tempReplyId,
      discussionId,
      author,
      content: cleanContent,
      mentions,
      likesCount: 0,
      isLiked: false,
      createdAt: 'Just now',
    };

    // 1. Optimistic state insert
    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId) {
          const currentReplies = disc.replies || [];
          return {
            ...disc,
            repliesCount: disc.repliesCount + 1,
            replies: [...currentReplies, optimisticReply],
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });

    // 2. Real API mutation to public.comments
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return optimisticReply;

      const { data: commentRow, error } = await supabase
        .from('comments')
        .insert({
          post_id: discussionId,
          author_id: user.id,
          content: cleanContent,
        })
        .select(`
          id,
          post_id,
          content,
          likes_count,
          created_at,
          author:profiles!author_id (
            id,
            username,
            full_name,
            avatar_url,
            academic_title,
            institution,
            orcid_id,
            orcid_verified
          )
        `)
        .single();

      if (error || !commentRow) {
        console.warn('[useDiscussionStore.addReply] DB insert error:', error?.message);
        return optimisticReply;
      }

      const persistentReply: DiscussionReply = {
        ...optimisticReply,
        id: commentRow.id,
        createdAt: formatRelativeTime(commentRow.created_at),
      };

      set((state) => {
        const paperList = state.discussions[paperId] || [];
        const updated = paperList.map((disc) => {
          if (disc.id === discussionId) {
            const replies = (disc.replies || []).map((r) =>
              r.id === tempReplyId ? persistentReply : r
            );
            return {
              ...disc,
              replies,
            };
          }
          return disc;
        });

        return {
          discussions: {
            ...state.discussions,
            [paperId]: updated,
          },
        };
      });

      // Synchronize posts.comments_count
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', discussionId);
        if (typeof count === 'number') {
          await supabase.from('posts').update({ comments_count: count }).eq('id', discussionId);
        }
      } catch {}

      return persistentReply;
    } catch (err) {
      console.warn('[useDiscussionStore.addReply] Exception:', err);
      return optimisticReply;
    }
  },

  deleteDiscussion: async (paperId: string, discussionId: string, currentUserId?: string) => {
    // 1. Optimistic removal
    const previous = get().discussions[paperId] || [];
    set((state) => ({
      discussions: {
        ...state.discussions,
        [paperId]: (state.discussions[paperId] || []).filter((d) => d.id !== discussionId),
      },
    }));

    // 2. API delete
    const res = await apiDeletePost(discussionId, currentUserId);
    if (!res.success) {
      console.warn('[useDiscussionStore.deleteDiscussion] Rollback:', res.error);
      set((state) => ({
        discussions: {
          ...state.discussions,
          [paperId]: previous,
        },
      }));
      return false;
    }
    return true;
  },

  deleteReply: async (paperId: string, discussionId: string, replyId: string, currentUserId?: string) => {
    // 1. Optimistic removal
    const previous = get().discussions[paperId] || [];
    set((state) => ({
      discussions: {
        ...state.discussions,
        [paperId]: (state.discussions[paperId] || []).map((disc) => {
          if (disc.id === discussionId) {
            return {
              ...disc,
              repliesCount: Math.max(0, disc.repliesCount - 1),
              replies: (disc.replies || []).filter((r) => r.id !== replyId),
            };
          }
          return disc;
        }),
      },
    }));

    // 2. API delete
    const res = await apiDeleteComment(replyId, discussionId, currentUserId);
    if (!res.success) {
      console.warn('[useDiscussionStore.deleteReply] Rollback:', res.error);
      set((state) => ({
        discussions: {
          ...state.discussions,
          [paperId]: previous,
        },
      }));
      return false;
    }
    return true;
  },

  toggleLikeDiscussion: (paperId: string, discussionId: string, currentUserId?: string) => {
    let wasLiked = false;
    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId) {
          wasLiked = Boolean(disc.isLiked);
          const isLiked = !wasLiked;
          return {
            ...disc,
            isLiked,
            likesCount: isLiked ? disc.likesCount + 1 : Math.max(0, disc.likesCount - 1),
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });

    apiToggleLike(discussionId, wasLiked, currentUserId).catch(() => {});
  },

  toggleLikeReply: (paperId: string, discussionId: string, replyId: string, currentUserId?: string) => {
    let wasLiked = false;
    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId && disc.replies) {
          const updatedReplies = disc.replies.map((rep) => {
            if (rep.id === replyId) {
              wasLiked = Boolean(rep.isLiked);
              const isLiked = !wasLiked;
              return {
                ...rep,
                isLiked,
                likesCount: isLiked ? rep.likesCount + 1 : Math.max(0, rep.likesCount - 1),
              };
            }
            return rep;
          });

          return {
            ...disc,
            replies: updatedReplies,
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });

    toggleCommentLike(replyId, wasLiked, currentUserId).catch(() => {});
  },

  getParticipatingResearchers: (paperId: string) => {
    const list = get().discussions[paperId] || [];
    const map = new Map<string, UserProfile>();

    for (const disc of list) {
      if (!map.has(disc.author.id)) {
        map.set(disc.author.id, disc.author);
      }
      if (disc.replies) {
        for (const rep of disc.replies) {
          if (!map.has(rep.author.id)) {
            map.set(rep.author.id, rep.author);
          }
        }
      }
    }

    return Array.from(map.values());
  },

  getInterestedPeople: (paper: Paper, currentUserId?: string) => {
    return [];
  },
}));

