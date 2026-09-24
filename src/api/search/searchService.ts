import { SearchProvider, SearchQueryParams, SearchResults } from '../../types';
import { PostgresSearchProvider } from './PostgresSearchProvider';
import { MockSearchProvider } from './MockSearchProvider';

let activeSearchProvider: SearchProvider = new PostgresSearchProvider();

/**
 * Get the currently active search provider
 */
export function getSearchProvider(): SearchProvider {
  return activeSearchProvider;
}

/**
 * Configure or swap the active search provider.
 * Allows migrating to dedicated search engines (e.g., Elasticsearch, Meilisearch, Typesense)
 * without modifying UI components or store contracts.
 */
export function setSearchProvider(provider: SearchProvider): void {
  activeSearchProvider = provider;
}

/**
 * Execute unified BoffIn search across researchers, papers, topics, and discussions.
 */
export async function searchBoffIn(params: SearchQueryParams): Promise<SearchResults> {
  const provider = getSearchProvider();
  return provider.search(params);
}

/**
 * Curated discovery queries for new / empty state exploration
 */
export interface SearchDiscoverySuggestion {
  category: 'researchers' | 'papers' | 'topics' | 'discussions';
  label: string;
  query: string;
  description: string;
}

export const POPULAR_DISCOVERIES: SearchDiscoverySuggestion[] = [
  {
    category: 'researchers',
    label: 'Dr. Smith',
    query: 'Dr. Smith',
    description: 'Find neuroscience and synaptic plasticity faculty',
  },
  {
    category: 'papers',
    label: 'Experience dependent plasticity',
    query: 'experience dependent plasticity',
    description: 'Peer-reviewed structural remodeling in adult cortex',
  },
  {
    category: 'topics',
    label: 'Neuroscience',
    query: 'neuroscience',
    description: 'Explore brain circuits, synaptic mechanisms, and imaging',
  },
  {
    category: 'discussions',
    label: 'CRISPR off target effects',
    query: 'CRISPR off target effects',
    description: 'Scientific questions and insights on genome editing fidelity',
  },
];
