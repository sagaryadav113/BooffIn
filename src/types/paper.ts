export type JournalType = 'Nature' | 'Science' | 'Cell' | 'bioRxiv' | 'arXiv' | 'PNAS' | 'Lancet' | 'IEEE' | 'Nature Protocols' | 'Other';

export interface Author {
  name: string;
  affiliation?: string;
  orcid?: string;
}

export interface PaperFigure {
  id: string;
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface Paper {
  id: string;
  doi: string;
  title: string;
  abstract: string;
  authors: Author[];
  journal: JournalType | string;
  publisher?: string;
  publicationYear: number;
  publicationDate?: string;
  canonicalUrl: string; // "View on Publisher ->"
  openAccessUrl?: string;
  isOpenAccess: boolean;
  topics: string[];
  figures?: PaperFigure[];
  citationCount: number;
  discussionCount: number;
  likesCount: number;
  savesCount: number;
  isSaved?: boolean;
  isLiked?: boolean;
}
