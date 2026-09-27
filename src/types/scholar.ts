export interface ScholarPublication {
  id: string;
  userId: string;
  orcidId: string;
  workPutCode?: string;
  title: string;
  authors: string[];
  journalName?: string;
  publicationYear?: number;
  publicationDate?: string;
  workType?: string; // 'journal-article' | 'preprint' | 'conference-paper' | 'book' | string
  doi?: string;
  url?: string;
  openAccessPdfUrl?: string;
  isOpenAccess: boolean;
  abstract?: string;
  topics?: string[];
  citationCount: number;
  discussionCount?: number;
  isVerified: boolean;
  source: 'orcid' | 'openalex' | 'manual';
  createdAt?: string;
}

export interface ScholarProfileStats {
  totalPublications: number;
  totalCitations: number;
  openAccessCount: number;
  orcidId?: string;
  isVerified: boolean;
  lastSyncedAt?: string;
}
