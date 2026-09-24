import { SearchProvider, SearchQueryParams, SearchResults, UserProfile, Paper, Topic, Post } from '../../types';
import { mockUsers, mockPapers, mockTopics, mockPosts } from '../../data/mockData';

export class MockSearchProvider implements SearchProvider {
  async search(params: SearchQueryParams): Promise<SearchResults> {
    const rawQuery = (params.query || '').trim().toLowerCase();
    const category = params.category || 'all';
    const limit = params.limit || 15;
    const page = params.page || 1;
    const offset = params.offset !== undefined ? params.offset : (page - 1) * limit;

    if (!rawQuery) {
      return {
        query: '',
        category,
        researchers: [],
        papers: [],
        topics: [],
        discussions: [],
        totalCounts: {
          all: 0,
          researchers: 0,
          papers: 0,
          topics: 0,
          discussions: 0,
        },
        hasMore: false,
        page,
      };
    }

    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    const matchesTokens = (text: string): boolean => {
      if (!text) return false;
      const lower = text.toLowerCase();
      // Exact substring match or every token matches
      if (lower.includes(rawQuery)) return true;
      return queryTokens.every((token) => lower.includes(token));
    };

    // 1. Search Researchers
    const matchedResearchers = mockUsers.filter((u: UserProfile) => {
      const haystack = [
        u.fullName,
        u.handle,
        u.academicTitle,
        u.institution,
        u.bio,
        ...(u.researchInterests || []),
      ].join(' ');
      return matchesTokens(haystack);
    });

    // 2. Search Papers
    const matchedPapers = mockPapers.filter((p: Paper) => {
      const authorsStr = (p.authors || []).map((a) => `${a.name} ${a.affiliation || ''}`).join(' ');
      const topicsStr = (p.topics || []).join(' ');
      const haystack = [
        p.title,
        p.abstract,
        p.journal,
        p.publisher,
        p.doi,
        authorsStr,
        topicsStr,
      ].join(' ');
      return matchesTokens(haystack);
    });

    // 3. Search Topics
    const matchedTopics = mockTopics.filter((t: Topic) => {
      const haystack = [t.name, t.slug, t.description, t.category].join(' ');
      return matchesTokens(haystack);
    });

    // 4. Search Discussions / Posts
    const matchedDiscussions = mockPosts.filter((p: Post) => {
      const authorStr = `${p.author.fullName} @${p.author.handle}`;
      const paperStr = p.paper ? `${p.paper.title} ${p.paper.journal}` : '';
      const topicsStr = (p.topics || []).join(' ');
      const haystack = [p.content, p.postType, authorStr, paperStr, topicsStr].join(' ');
      return matchesTokens(haystack);
    });

    const totalCounts = {
      researchers: matchedResearchers.length,
      papers: matchedPapers.length,
      topics: matchedTopics.length,
      discussions: matchedDiscussions.length,
      all:
        matchedResearchers.length +
        matchedPapers.length +
        matchedTopics.length +
        matchedDiscussions.length,
    };

    let pagedResearchers: UserProfile[] = [];
    let pagedPapers: Paper[] = [];
    let pagedTopics: Topic[] = [];
    let pagedDiscussions: Post[] = [];
    let hasMore = false;

    if (category === 'researchers') {
      pagedResearchers = matchedResearchers.slice(offset, offset + limit);
      hasMore = offset + limit < matchedResearchers.length;
    } else if (category === 'papers') {
      pagedPapers = matchedPapers.slice(offset, offset + limit);
      hasMore = offset + limit < matchedPapers.length;
    } else if (category === 'topics') {
      pagedTopics = matchedTopics.slice(offset, offset + limit);
      hasMore = offset + limit < matchedTopics.length;
    } else if (category === 'discussions') {
      pagedDiscussions = matchedDiscussions.slice(offset, offset + limit);
      hasMore = offset + limit < matchedDiscussions.length;
    } else {
      // 'all' category: combine items proportionally or slice top items per category
      const perCategoryLimit = Math.max(3, Math.floor(limit / 4));
      pagedResearchers = matchedResearchers.slice(offset, offset + perCategoryLimit);
      pagedPapers = matchedPapers.slice(offset, offset + perCategoryLimit);
      pagedTopics = matchedTopics.slice(offset, offset + perCategoryLimit);
      pagedDiscussions = matchedDiscussions.slice(offset, offset + perCategoryLimit);

      const maxCategoryLen = Math.max(
        matchedResearchers.length,
        matchedPapers.length,
        matchedTopics.length,
        matchedDiscussions.length
      );
      hasMore = offset + perCategoryLimit < maxCategoryLen;
    }

    return {
      query: params.query,
      category,
      researchers: pagedResearchers,
      papers: pagedPapers,
      topics: pagedTopics,
      discussions: pagedDiscussions,
      totalCounts,
      hasMore,
      page,
    };
  }
}
