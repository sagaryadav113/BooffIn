import { create } from 'zustand';
import { Paper } from '../types';
import { mockPapers, currentUser } from '../data/mockData';
import { toggleBookmark as apiToggleBookmark } from '../api/socialService';

interface PaperState {
  papers: Paper[];
  savedPaperIds: Set<string>;
  toggleSavePaper: (paperId: string, currentUserId?: string) => Promise<void>;
  toggleLikePaper: (paperId: string) => void;
  getPaperById: (id: string) => Paper | undefined;
  getPaperByDoi: (doi: string) => Paper | undefined;
  addPaper: (paper: Paper) => void;
  searchPapers: (query: string) => Paper[];
}

export const usePaperStore = create<PaperState>((set, get) => ({
  papers: mockPapers,
  savedPaperIds: new Set(['paper_1', 'paper_3']),
  toggleSavePaper: async (paperId, currentUserId) => {
    const isCurrentlySaved = get().savedPaperIds.has(paperId);
    const nextSaved = new Set(get().savedPaperIds);
    if (isCurrentlySaved) {
      nextSaved.delete(paperId);
    } else {
      nextSaved.add(paperId);
    }

    // 1. Optimistic update
    set((state) => ({
      papers: state.papers.map((p) => {
        if (p.id === paperId) {
          return {
            ...p,
            isSaved: !isCurrentlySaved,
            savesCount: isCurrentlySaved ? Math.max(0, p.savesCount - 1) : p.savesCount + 1,
          };
        }
        return p;
      }),
      savedPaperIds: nextSaved,
    }));

    // 2. Real API mutation
    const userId = currentUserId || currentUser.id;
    const res = await apiToggleBookmark({ paperId }, isCurrentlySaved, userId);

    // 3. Rollback if error
    if (!res.success) {
      console.warn('[usePaperStore] Save paper mutation failed, rolling back:', res.error);
      const rollbackSaved = new Set(get().savedPaperIds);
      if (isCurrentlySaved) {
        rollbackSaved.add(paperId);
      } else {
        rollbackSaved.delete(paperId);
      }
      set((state) => ({
        papers: state.papers.map((p) => {
          if (p.id === paperId) {
            return {
              ...p,
              isSaved: isCurrentlySaved,
              savesCount: isCurrentlySaved ? p.savesCount + 1 : Math.max(0, p.savesCount - 1),
            };
          }
          return p;
        }),
        savedPaperIds: rollbackSaved,
      }));
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
