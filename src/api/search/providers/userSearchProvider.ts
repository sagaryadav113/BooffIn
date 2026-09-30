import { supabase } from '../../client';
import { ResearcherSearchResult } from '../types';

/**
 * Fetch with retry on network failure
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  retries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw new Error('fetch failed after retries');
}

/**
 * Searches BooffIn registered users from the profiles table (Supabase)
 */
export async function searchBooffInUsers(
  query: string,
  limit = 10
): Promise<ResearcherSearchResult[]> {
  const cleanQ = query.trim().replace(/^@/, '');
  if (!cleanQ) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url, academic_title, institution, bio, orcid_id, is_orcid_verified, followers_count, following_count'
      )
      .or(
        `username.ilike.%${cleanQ}%,full_name.ilike.%${cleanQ}%,academic_title.ilike.%${cleanQ}%,institution.ilike.%${cleanQ}%,bio.ilike.%${cleanQ}%`
      )
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      fullName: row.full_name || 'Researcher',
      handle: row.username || 'scholar',
      avatarUrl: row.avatar_url,
      academicTitle: row.academic_title || 'Researcher',
      institution: row.institution || '',
      bio: row.bio || '',
      orcidId: row.orcid_id,
      orcidVerified: Boolean(row.is_orcid_verified),
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      isRegisteredUser: true,
    }));
  } catch {
    return [];
  }
}

/**
 * Searches OpenAlex Authors API for scientists / researchers.
 * Returns up to `limit` results. Great for names not in ORCID registry.
 */
export async function searchOpenAlexAuthors(
  query: string,
  limit = 8,
  page = 1
): Promise<ResearcherSearchResult[]> {
  const cleanQ = query.trim().replace(/^@/, '');
  if (!cleanQ) return [];

  try {
    const url = `https://api.openalex.org/authors?search=${encodeURIComponent(
      cleanQ
    )}&per-page=${limit}&page=${page}&select=id,display_name,display_name_alternatives,last_known_institution,works_count,cited_by_count,orcid,x_concepts&mailto=dev@booffin.science`;

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (scholar-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits: any[] = data.results || [];

    const researchers: ResearcherSearchResult[] = [];
    for (const item of hits) {
      if (!item.display_name) continue;

      const orcidId = item.orcid?.replace('https://orcid.org/', '');
      const institution =
        item.last_known_institution?.display_name || '';
      const topConcepts: string[] = (item.x_concepts || [])
        .slice(0, 3)
        .map((c: any) => c.display_name);

      researchers.push({
        id: `openalex_author_${item.id?.replace('https://openalex.org/', '') || Date.now()}`,
        fullName: item.display_name,
        handle: item.display_name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24) || 'scholar',
        academicTitle: topConcepts.length > 0 ? topConcepts.join(' · ') : 'Researcher',
        institution,
        bio: topConcepts.length > 0 ? `Research areas: ${topConcepts.join(', ')}` : '',
        orcidId,
        orcidVerified: Boolean(orcidId),
        followersCount: 0,
        followingCount: 0,
        isRegisteredUser: false,
        worksCount: item.works_count || 0,
        citationCount: item.cited_by_count || 0,
      });
    }

    return researchers;
  } catch {
    return [];
  }
}
