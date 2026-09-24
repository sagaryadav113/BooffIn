import { SearchProvider, SearchQueryParams, SearchResults, UserProfile, Paper, Topic, Post } from '../../types';
import { supabase } from '../client';
import { isLiveSupabaseConfigured, mapProfileRecord } from '../authService';
import { MockSearchProvider } from './MockSearchProvider';

export class PostgresSearchProvider implements SearchProvider {
  private fallbackProvider = new MockSearchProvider();

  async search(params: SearchQueryParams): Promise<SearchResults> {
    const rawQuery = (params.query || '').trim();
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

    if (!isLiveSupabaseConfigured()) {
      return this.fallbackProvider.search(params);
    }

    try {
      const sanitizedQ = rawQuery.replace(/[%_]/g, '\\$&');
      const ilikePattern = `%${sanitizedQ}%`;

      let researchers: UserProfile[] = [];
      let papers: Paper[] = [];
      let topics: Topic[] = [];
      let discussions: Post[] = [];

      let countResearchers = 0;
      let countPapers = 0;
      let countTopics = 0;
      let countDiscussions = 0;

      // 1. Search Researchers (PostgreSQL profiles table)
      if (category === 'all' || category === 'researchers') {
        const fetchLimit = category === 'researchers' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .or(
            `full_name.ilike.${ilikePattern},username.ilike.${ilikePattern},academic_title.ilike.${ilikePattern},institution.ilike.${ilikePattern},bio.ilike.${ilikePattern}`
          )
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          researchers = data.map((row) => mapProfileRecord(row));
          countResearchers = count || data.length;
        }
      }

      // 2. Search Papers (PostgreSQL papers table)
      if (category === 'all' || category === 'papers') {
        const fetchLimit = category === 'papers' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('papers')
          .select('*', { count: 'exact' })
          .or(
            `title.ilike.${ilikePattern},abstract.ilike.${ilikePattern},journal.ilike.${ilikePattern},doi.ilike.${ilikePattern}`
          )
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          papers = data.map((row: any) => ({
            id: row.id,
            doi: row.doi,
            title: row.title,
            abstract: row.abstract || '',
            authors: Array.isArray(row.authors) ? row.authors : [{ name: row.primary_author || 'Author' }],
            journal: row.journal || 'Journal Reference',
            publisher: row.publisher || undefined,
            publicationYear: row.publication_year || (row.publication_date ? new Date(row.publication_date).getFullYear() : 2024),
            publicationDate: row.publication_date || undefined,
            canonicalUrl: row.canonical_url || `https://doi.org/${row.doi}`,
            isOpenAccess: Boolean(row.is_open_access),
            topics: Array.isArray(row.topics) ? row.topics : ['Research'],
            citationCount: row.citation_count || 0,
            discussionCount: row.discussion_count || 0,
            likesCount: row.likes_count || 0,
            savesCount: row.saves_count || 0,
            isSaved: Boolean(row.is_saved),
            isLiked: Boolean(row.is_liked),
          }));
          countPapers = count || data.length;
        }
      }

      // 3. Search Topics (PostgreSQL topics table)
      if (category === 'all' || category === 'topics') {
        const fetchLimit = category === 'topics' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('topics')
          .select('*', { count: 'exact' })
          .or(
            `name.ilike.${ilikePattern},description.ilike.${ilikePattern},category.ilike.${ilikePattern}`
          )
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          topics = data.map((row: any) => ({
            id: row.id,
            slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
            name: row.name,
            description: row.description || '',
            iconName: row.icon_name || 'BookOpen',
            category: row.category || 'General',
            followersCount: row.followers_count || 0,
            postsCount: row.posts_count || 0,
            isFollowing: Boolean(row.is_following),
          }));
          countTopics = count || data.length;
        }
      }

      // 4. Search Discussions / Posts (PostgreSQL posts table)
      if (category === 'all' || category === 'discussions') {
        const fetchLimit = category === 'discussions' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('posts')
          .select('*, author:profiles(*), paper:papers(*)', { count: 'exact' })
          .ilike('content', ilikePattern)
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          discussions = data.map((row: any) => ({
            id: row.id,
            author: row.author ? mapProfileRecord(row.author) : {
              id: row.user_id,
              handle: 'researcher',
              fullName: 'Researcher',
              academicTitle: 'Scholar',
              institution: 'Independent',
              bio: '',
              orcidVerified: false,
              followingCount: 0,
              followersCount: 0,
              postsCount: 0,
              savedCount: 0,
              joinedDate: '',
            },
            postType: row.post_type || 'discussion',
            content: row.content,
            paper: row.paper ? {
              id: row.paper.id,
              doi: row.paper.doi,
              title: row.paper.title,
              abstract: row.paper.abstract || '',
              authors: Array.isArray(row.paper.authors) ? row.paper.authors : [{ name: 'Author' }],
              journal: row.paper.journal || 'Journal',
              publicationYear: row.paper.publication_year || 2024,
              canonicalUrl: row.paper.canonical_url || `https://doi.org/${row.paper.doi}`,
              isOpenAccess: Boolean(row.paper.is_open_access),
              topics: Array.isArray(row.paper.topics) ? row.paper.topics : [],
              citationCount: row.paper.citation_count || 0,
              discussionCount: row.paper.discussion_count || 0,
              likesCount: row.paper.likes_count || 0,
              savesCount: row.paper.saves_count || 0,
            } : undefined,
            topics: Array.isArray(row.topics) ? row.topics : [],
            visibility: row.visibility || 'public',
            likesCount: row.likes_count || 0,
            commentsCount: row.comments_count || 0,
            repostsCount: row.reposts_count || 0,
            savesCount: row.saves_count || 0,
            isLiked: Boolean(row.is_liked),
            isReposted: Boolean(row.is_reposted),
            isSaved: Boolean(row.is_saved),
            createdAt: row.created_at || 'Recently',
          }));
          countDiscussions = count || data.length;
        }
      }

      const totalCounts = {
        researchers: countResearchers,
        papers: countPapers,
        topics: countTopics,
        discussions: countDiscussions,
        all: countResearchers + countPapers + countTopics + countDiscussions,
      };

      let hasMore = false;
      if (category === 'researchers') hasMore = offset + limit < countResearchers;
      else if (category === 'papers') hasMore = offset + limit < countPapers;
      else if (category === 'topics') hasMore = offset + limit < countTopics;
      else if (category === 'discussions') hasMore = offset + limit < countDiscussions;
      else {
        const perCategoryLimit = Math.max(3, Math.floor(limit / 4));
        hasMore =
          offset + perCategoryLimit < countResearchers ||
          offset + perCategoryLimit < countPapers ||
          offset + perCategoryLimit < countTopics ||
          offset + perCategoryLimit < countDiscussions;
      }

      return {
        query: rawQuery,
        category,
        researchers,
        papers,
        topics,
        discussions,
        totalCounts,
        hasMore,
        page,
      };
    } catch {
      // Graceful fallback to mock provider if network/database table is unavailable
      return this.fallbackProvider.search(params);
    }
  }
}
