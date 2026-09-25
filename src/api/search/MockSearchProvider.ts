import { SearchProvider, SearchQueryParams, SearchResults } from '../../types';
import { PostgresSearchProvider } from './PostgresSearchProvider';

/**
 * Live search provider delegating to PostgresSearchProvider
 */
export class MockSearchProvider implements SearchProvider {
  private provider = new PostgresSearchProvider();

  async search(params: SearchQueryParams): Promise<SearchResults> {
    return this.provider.search(params);
  }
}
