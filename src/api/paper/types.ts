import { Paper, Author } from '../../types';

export type ReferenceInputType =
  | 'doi'
  | 'arxiv_id'
  | 'pmid'
  | 'pmcid'
  | 'publisher_url'
  | 'arxiv_url'
  | 'biorxiv_url'
  | 'pubmed_url'
  | 'generic_url';

export interface ParsedReferenceInput {
  rawInput: string;
  type: ReferenceInputType;
  doi?: string;
  arxivId?: string;
  pmid?: string;
  pmcid?: string;
  canonicalUrl?: string;
  detectedPublisher?: string;
  detectedJournal?: string;
}

export interface NormalizedPaperMetadata {
  doi?: string;
  title: string;
  abstract?: string;
  authors: Author[];
  journal: string;
  publisher?: string;
  publicationYear: number;
  publicationDate?: string;
  canonicalUrl: string;
  openAccessUrl?: string;
  isOpenAccess: boolean;
  openAccessStatus?: 'gold' | 'green' | 'bronze' | 'hybrid' | 'closed' | 'preprint';
  citationCount: number;
  topics: string[];
  providerName: string;
}

export interface MetadataProvider {
  name: string;
  supports(input: ParsedReferenceInput): boolean;
  resolve(input: ParsedReferenceInput): Promise<NormalizedPaperMetadata | null>;
}

export interface ResolvePaperResult {
  paper: Paper | null;
  isDuplicate: boolean;
  duplicatePaperId?: string;
  providerName?: string;
  error?: string | null;
  errorReason?: 'invalid_input' | 'not_found' | 'network_error' | 'unsupported_source';
}
