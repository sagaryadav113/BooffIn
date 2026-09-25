import { SearchProvider, SearchQueryParams, SearchResults, UserProfile, Paper, Topic, Post } from '../../types';
import { supabase } from '../client';
import { mapProfileRecord } from '../authService';
import { mapSupabasePaper, mapSupabasePost, mapSupabaseProfile } from '../socialService';

export class PostgresSearchProvider implements SearchProvider {
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
          .select(`
            *,
            paper_authors (*),
            paper_topics ( topic:topics(name) )
          `, { count: 'exact' })
          .or(
            `title.ilike.${ilikePattern},abstract.ilike.${ilikePattern},journal.ilike.${ilikePattern},doi.ilike.${ilikePattern}`
          )
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          papers = data.map((row: any) => mapSupabasePaper(row));
          countPapers = count || data.length;
        }
      }

      // 3. Search Topics (PostgreSQL topics table)
      if (category === 'all' || category === 'topics') {
        const fetchLimit = category === 'topics' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('topics')
          .select('*', { count: 'exact' })
          .or(`name.ilike.${ilikePattern},slug.ilike.${ilikePattern},description.ilike.${ilikePattern}`)
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          topics = data.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            description: row.description || undefined,
            iconName: row.icon_name || 'Brain',
            category: row.category || 'General Science',
            followersCount: row.followers_count || 0,
            postsCount: row.posts_count || 0,
            isFollowing: false,
          }));
          countTopics = count || data.length;
        }
      }

      // 4. Search Discussions & Research Shares (PostgreSQL posts table)
      if (category === 'all' || category === 'discussions') {
        const fetchLimit = category === 'discussions' ? limit : Math.max(3, Math.floor(limit / 4));
        const { data, count, error } = await supabase
          .from('posts')
          .select(
            `
            id,
            post_type,
            content,
            visibility,
            media_urls,
            likes_count,
            comments_count,
            reposts_count,
            saves_count,
            created_at,
            author:profiles!author_id (*),
            paper:papers!paper_id (
              id,
              doi,
              canonical_url,
              title,
              journal,
              publication_year,
              paper_authors (*)
            ),
            post_topics ( topic:topics!topic_id (*) )
          `,
            { count: 'exact' }
          )
          .ilike('content', ilikePattern)
          .range(offset, offset + fetchLimit - 1);

        if (!error && data) {
          discussions = data.map((row: any) => mapSupabasePost(row));
          countDiscussions = count || data.length;
        }
      }

      const totalAll = countResearchers + countPapers + countTopics + countDiscussions;
      const targetCount =
        category === 'researchers'
          ? countResearchers
          : category === 'papers'
          ? countPapers
          : category === 'topics'
          ? countTopics
          : category === 'discussions'
          ? countDiscussions
          : totalAll;

      const hasMore = offset + limit < targetCount;

      return {
        query: rawQuery,
        category,
        researchers,
        papers,
        topics,
        discussions,
        totalCounts: {
          all: totalAll,
          researchers: countResearchers,
          papers: countPapers,
          topics: countTopics,
          discussions: countDiscussions,
        },
        hasMore,
        page,
      };
    } catch (err: any) {
      console.warn('[PostgresSearchProvider] Search error:', err);
      return {
        query: rawQuery,
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
  }
}
