import { create } from 'zustand';
import { Paper } from '../types';
import { toggleBookmark as apiToggleBookmark, mapSupabasePaper } from '../api/socialService';
import { useAuthStore } from './useAuthStore';
import { supabase, appStorage } from '../api/client';

const SAVED_PAPER_IDS_KEY = 'booffin_saved_paper_ids';
const SAVED_PAPERS_CACHE_KEY = 'booffin_saved_papers_cache';

interface PaperState {
  papers: Paper[];
  savedPaperIds: Set<string>;
  isLoading: boolean;
  fetchPapers: () => Promise<void>;
  fetchPaperById: (id: string) => Promise<Paper | null>;
  toggleSavePaper: (paperId: string, currentUserId?: string, paper?: Paper) => Promise<void>;
  toggleLikePaper: (paperId: string) => void;
  getPaperById: (id: string) => Paper | undefined;
  getPaperByDoi: (doi: string) => Paper | undefined;
  addPaper: (paper: Paper) => void;
  searchPapers: (query: string) => Paper[];
}

export const usePaperStore = create<PaperState>((set, get) => ({
  papers: [],
  savedPaperIds: new Set<string>(),
  isLoading: false,

  fetchPapers: async () => {
    set({ isLoading: true });
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          authors:paper_authors(author_name, author_order, affiliation),
          paper_topics(topic:topics(name)),
          bookmarks!left(user_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Failed to fetch papers from Supabase:', error.message);
        set({ isLoading: false });
        return;
      }

      if (data) {
        const mappedPapers: Paper[] = data.map((row: any) => mapSupabasePaper(row, currentUserId));
        set({ papers: mappedPapers, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchPaperById: async (id: string) => {
    // 1. Check local cache
    const existing = get().papers.find((p) => p.id === id || p.doi === id);
    if (existing) return existing;

    // 2. Query Supabase
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          authors:paper_authors(author_name, author_order, affiliation),
          paper_topics(topic:topics(name)),
          bookmarks!left(user_id)
        `)
        .or(`id.eq.${id},doi.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;

      const paper: Paper = mapSupabasePaper(data, currentUserId);

      set((state) => ({
        papers: [paper, ...state.papers.filter((p) => p.id !== paper.id)],
      }));

      return paper;
    } catch {
      return null;
    }
  },

  toggleSavePaper: async (paperId, currentUserId, paper) => {
    const doi = paper?.doi || get().papers.find((p) => p.id === paperId)?.doi;
    const isCurrentlySaved =
      get().savedPaperIds.has(paperId) || (doi ? get().savedPaperIds.has(doi) : false);

    const nextSaved = new Set(get().savedPaperIds);
    if (isCurrentlySaved) {
      nextSaved.delete(paperId);
      if (doi) nextSaved.delete(doi);
    } else {
      nextSaved.add(paperId);
      if (doi) nextSaved.add(doi);
    }

    // 1. Optimistic state update with paper inclusion
    let updatedPapers = [...get().papers];
    const index = updatedPapers.findIndex((p) => p.id === paperId || (doi && p.doi === doi));

    if (index >= 0) {
      updatedPapers[index] = {
        ...updatedPapers[index],
        isSaved: !isCurrentlySaved,
        savesCount: isCurrentlySaved
          ? Math.max(0, (updatedPapers[index].savesCount || 1) - 1)
          : (updatedPapers[index].savesCount || 0) + 1,
      };
    } else if (paper && !isCurrentlySaved) {
      updatedPapers.unshift({
        ...paper,
        isSaved: true,
        savesCount: (paper.savesCount || 0) + 1,
      });
    }

    set({ papers: updatedPapers, savedPaperIds: nextSaved });

    // Persist to local storage immediately
    try {
      await appStorage.setItem(SAVED_PAPER_IDS_KEY, JSON.stringify(Array.from(nextSaved)));
      const savedList = updatedPapers.filter((p) => nextSaved.has(p.id) || (p.doi && nextSaved.has(p.doi)));
      await appStorage.setItem(SAVED_PAPERS_CACHE_KEY, JSON.stringify(savedList));
    } catch {}

    // 2. Real API mutation
    try {
      const userId = currentUserId || useAuthStore.getState().user?.id;
      let targetDbId = paperId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);

      // If paper is from external source and saving, ensure row in Supabase papers
      if (!isUuid && paper && !isCurrentlySaved) {
        try {
          const { data: existing } = await supabase
            .from('papers')
            .select('id')
            .eq('doi', paper.doi || 'none')
            .maybeSingle();

          if (existing?.id) {
            targetDbId = existing.id;
          } else {
            const { data: inserted } = await supabase
              .from('papers')
              .insert({
                doi: paper.doi || null,
                title: paper.title,
                abstract: paper.abstract || null,
                journal: paper.journal || 'Academic Preprint',
                publication_year: paper.publicationYear || new Date().getFullYear(),
                open_access_pdf_url: paper.openAccessUrl || null,
                canonical_url: paper.canonicalUrl || (paper.doi ? `https://doi.org/${paper.doi}` : null),
              })
              .select('id')
              .maybeSingle();
            if (inserted?.id) {
              targetDbId = inserted.id;
            }
          }
        } catch {}
      }

      if (userId && isUuid) {
        await apiToggleBookmark({ paperId: targetDbId }, isCurrentlySaved, userId);
      }
    } catch (e) {
      console.warn('[usePaperStore] Save sync warning:', e);
    }
  },
  toggleLikePaper: (paperId) =>
    set((state) => ({
      papers: state.papers.map((p) => {
        if (p.id === paperId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      }),
    })),
  getPaperById: (id) => get().papers.find((p) => p.id === id || (p.doi && p.doi === id)),
  getPaperByDoi: (doi) => get().papers.find((p) => p.doi && p.doi.toLowerCase() === doi.toLowerCase()),
  addPaper: (paper) =>
    set((state) => ({
      papers: [
        paper,
        ...state.papers.filter((p) => p.id !== paper.id && (!paper.doi || p.doi !== paper.doi)),
      ],
    })),
  searchPapers: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().papers;
    return get().papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q) ||
        p.journal.toLowerCase().includes(q) ||
        (p.doi && p.doi.toLowerCase().includes(q)) ||
        p.authors.some((a) => a.name.toLowerCase().includes(q)) ||
        p.topics.some((t) => t.toLowerCase().includes(q))
    );
  },
}));

// Auto-load saved IDs and cached saved papers from local storage
(async () => {
  try {
    const rawIds = await appStorage.getItem(SAVED_PAPER_IDS_KEY);
    if (rawIds) {
      const parsed: string[] = JSON.parse(rawIds);
      const setIds = new Set(parsed);
      usePaperStore.setState((s) => ({
        savedPaperIds: new Set([...s.savedPaperIds, ...setIds]),
      }));
    }
    const rawPapers = await appStorage.getItem(SAVED_PAPERS_CACHE_KEY);
    if (rawPapers) {
      const parsedPapers: Paper[] = JSON.parse(rawPapers);
      usePaperStore.setState((s) => ({
        papers: [
          ...parsedPapers.filter((sp) => !s.papers.some((p) => p.id === sp.id || (p.doi && sp.doi && p.doi === sp.doi))),
          ...s.papers,
        ],
      }));
    }
  } catch {}
})();
