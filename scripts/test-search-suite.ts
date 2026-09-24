const assert = {
  ok: (val: any, msg?: string) => {
    if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
  },
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || `Expected deep equality`);
  },
};

import {
  searchBoffIn,
  getSearchProvider,
  setSearchProvider,
  POPULAR_DISCOVERIES,
} from '../src/api/search/searchService';
import { MockSearchProvider } from '../src/api/search/MockSearchProvider';
import { PostgresSearchProvider } from '../src/api/search/PostgresSearchProvider';
import { SearchProvider, SearchQueryParams, SearchResults } from '../src/types/search';

async function runSearchTestSuite() {
  console.log('================================================================');
  console.log('🔍 BOOFFIN SEARCH & DISCOVERY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // TEST 1: RESEARCHER DISCOVERY
  console.log('--- 1. Researcher Search Discovery ---');
  await test('Search finds Researcher "Dr. Smith"', async () => {
    const res = await searchBoffIn({ query: 'Dr. Smith' });

    assert.ok(res.researchers.length > 0, 'Should find at least 1 researcher matching Dr. Smith');
    const smith = res.researchers.find((r) => r.fullName.includes('Smith'));
    assert.ok(smith, 'Found researcher must have name Dr. Christopher Smith');
    assert.strictEqual(smith?.handle, 'drsmith');
    assert.strictEqual(smith?.institution, 'Harvard Medical School');
    assert.ok(res.totalCounts.researchers >= 1);
  });

  // TEST 2: PAPER DISCOVERY
  console.log('\n--- 2. Paper Search Discovery ---');
  await test('Search finds Paper "experience dependent plasticity"', async () => {
    const res = await searchBoffIn({ query: 'experience dependent plasticity' });

    assert.ok(res.papers.length > 0, 'Should find paper on experience dependent plasticity');
    const paper = res.papers[0];
    assert.ok(
      paper.title.toLowerCase().includes('experience-dependent') &&
      paper.title.toLowerCase().includes('plasticity'),
      `Found paper title: "${paper.title}"`
    );
    assert.strictEqual(paper.journal, 'Nature');
    assert.ok(paper.isOpenAccess, 'Paper open access flag is preserved');
  });

  // TEST 3: TOPIC DISCOVERY
  console.log('\n--- 3. Topic Search Discovery ---');
  await test('Search finds Topic "neuroscience"', async () => {
    const res = await searchBoffIn({ query: 'neuroscience' });

    assert.ok(res.topics.length > 0, 'Should find topic for neuroscience');
    const neuroTopic = res.topics.find((t) => t.slug === 'neuroscience' || t.name.toLowerCase() === 'neuroscience');
    assert.ok(neuroTopic, 'Neuroscience topic must be returned');
    assert.strictEqual(neuroTopic?.name, 'Neuroscience');
    assert.strictEqual(neuroTopic?.category, 'Life Sciences');
  });

  // TEST 4: DISCUSSION DISCOVERY
  console.log('\n--- 4. Discussion Search Discovery ---');
  await test('Search finds Discussion "CRISPR off target effects"', async () => {
    const res = await searchBoffIn({ query: 'CRISPR off target effects' });

    assert.ok(res.discussions.length > 0, 'Should find discussion matching CRISPR off target effects');
    const disc = res.discussions[0];
    assert.ok(
      disc.content.toLowerCase().includes('crispr') &&
      disc.content.toLowerCase().includes('off-target') || disc.content.toLowerCase().includes('off target'),
      `Found discussion content: "${disc.content}"`
    );
    assert.ok(disc.author, 'Discussion author must be populated');
  });

  // TEST 5: CATEGORY FILTERING
  console.log('\n--- 5. Category Filtering Tests ---');
  await test('Filtering by "papers" only returns papers and empty lists for others', async () => {
    const res = await searchBoffIn({ query: 'brain', category: 'papers' });

    assert.ok(res.papers.length > 0, 'Should return matching papers');
    assert.strictEqual(res.researchers.length, 0, 'Researchers list must be empty when filtering by papers');
    assert.strictEqual(res.topics.length, 0, 'Topics list must be empty when filtering by papers');
    assert.strictEqual(res.discussions.length, 0, 'Discussions list must be empty when filtering by papers');
  });

  await test('Filtering by "researchers" only returns researchers', async () => {
    const res = await searchBoffIn({ query: 'neuroscience', category: 'researchers' });

    assert.ok(res.researchers.length > 0, 'Should return researchers with neuroscience interests');
    assert.strictEqual(res.papers.length, 0);
    assert.strictEqual(res.topics.length, 0);
    assert.strictEqual(res.discussions.length, 0);
  });

  await test('Filtering by "topics" only returns topics', async () => {
    const res = await searchBoffIn({ query: 'biology', category: 'topics' });

    assert.ok(res.topics.length > 0, 'Should return biology topics');
    assert.strictEqual(res.researchers.length, 0);
    assert.strictEqual(res.papers.length, 0);
    assert.strictEqual(res.discussions.length, 0);
  });

  await test('Filtering by "discussions" only returns scientific discussions', async () => {
    const res = await searchBoffIn({ query: 'organoid', category: 'discussions' });

    assert.ok(res.discussions.length > 0, 'Should return organoid discussions');
    assert.strictEqual(res.researchers.length, 0);
    assert.strictEqual(res.papers.length, 0);
    assert.strictEqual(res.topics.length, 0);
  });

  // TEST 6: PAGINATION
  console.log('\n--- 6. Pagination & Limits ---');
  await test('Pagination slices results accurately with limit and offset', async () => {
    const page1 = await searchBoffIn({ query: 'science', category: 'all', limit: 2, offset: 0, page: 1 });
    assert.strictEqual(page1.page, 1);

    const page2 = await searchBoffIn({ query: 'science', category: 'all', limit: 2, offset: 2, page: 2 });
    assert.strictEqual(page2.page, 2);
  });

  // TEST 7: EMPTY QUERY HANDLING
  console.log('\n--- 7. Empty Query & Zero Results ---');
  await test('Empty query returns clean zero counts without errors', async () => {
    const res = await searchBoffIn({ query: '' });

    assert.strictEqual(res.totalCounts.all, 0);
    assert.strictEqual(res.researchers.length, 0);
    assert.strictEqual(res.papers.length, 0);
    assert.strictEqual(res.topics.length, 0);
    assert.strictEqual(res.discussions.length, 0);
    assert.strictEqual(res.hasMore, false);
  });

  await test('Non-matching query returns 0 results cleanly', async () => {
    const res = await searchBoffIn({ query: 'xyznonexistentterm998877' });

    assert.strictEqual(res.totalCounts.all, 0);
    assert.strictEqual(res.hasMore, false);
  });

  // TEST 8: SEARCH PROVIDER EXTENSIBILITY
  console.log('\n--- 8. Search Engine Extensibility (Dedicated Search Engine Ready) ---');
  await test('Search provider can be dynamically swapped with custom search engine provider', async () => {
    class ElasticSearchEngineProvider implements SearchProvider {
      async search(params: SearchQueryParams): Promise<SearchResults> {
        return {
          query: params.query,
          category: params.category || 'all',
          researchers: [],
          papers: [],
          topics: [],
          discussions: [],
          totalCounts: { all: 99, researchers: 25, papers: 25, topics: 25, discussions: 24 },
          hasMore: true,
          page: 1,
        };
      }
    }

    const defaultProvider = getSearchProvider();
    const customEngine = new ElasticSearchEngineProvider();

    setSearchProvider(customEngine);
    assert.strictEqual(getSearchProvider(), customEngine);

    const customRes = await searchBoffIn({ query: 'quantum' });
    assert.strictEqual(customRes.totalCounts.all, 99);

    // Restore Postgres provider
    setSearchProvider(defaultProvider);
    assert.strictEqual(getSearchProvider(), defaultProvider);
  });

  console.log(`\n================================================================`);
  console.log(`🏁 Test Summary: ${passed}/${total} tests passed successfully.`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSearchTestSuite();
