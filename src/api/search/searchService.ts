import { SearchProvider, SearchQueryParams, SearchResults } from '../../types';
import { PostgresSearchProvider } from './PostgresSearchProvider';

let activeSearchProvider: SearchProvider = new PostgresSearchProvider();

/**
 * Get the currently active search provider
 */
export function getSearchProvider(): SearchProvider {
  return activeSearchProvider;
}

/**
 * Configure or swap the active search provider.
 */
export function setSearchProvider(provider: SearchProvider): void {
  activeSearchProvider = provider;
}

/**
 * Execute unified BooffIn search across researchers, papers, topics, and discussions.
 */
export async function searchBooffIn(params: SearchQueryParams): Promise<SearchResults> {
  const provider = getSearchProvider();
  return provider.search(params);
}

export const searchBoffIn = searchBooffIn;

/**
 * Scientific search discovery queries for initial exploration
 */
export interface SearchDiscoverySuggestion {
  category: 'researchers' | 'papers' | 'topics' | 'discussions';
  label: string;
  query: string;
  description: string;
}

export const POPULAR_DISCOVERIES: SearchDiscoverySuggestion[] = [
  {
    category: 'topics',
    label: 'Neuroscience',
    query: 'Neuroscience',
    description: 'Explore neural circuits, synaptic plasticity, and bioimaging',
  },
  {
    category: 'topics',
    label: 'Genetics',
    query: 'Genetics',
    description: 'Explore genome sequencing, CRISPR editing, and epigenetics',
  },
  {
    category: 'topics',
    label: 'Molecular Biology',
    query: 'Molecular Biology',
    description: 'Explore cellular biochemistry and macromolecular complexes',
  },
  {
    category: 'topics',
    label: 'Bioinformatics',
    query: 'Bioinformatics',
    description: 'Explore multi-omics pipelines and computational modeling',
  },
];
