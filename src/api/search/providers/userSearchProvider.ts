import { supabase } from '../../client';
import { ResearcherSearchResult } from '../types';

/**
 * Searches BooffIn registered users from the profiles table
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
      .select('id, username, full_name, avatar_url, academic_title, institution, bio, orcid_id, is_orcid_verified, followers_count, following_count')
      .or(`username.ilike.%${cleanQ}%,full_name.ilike.%${cleanQ}%,academic_title.ilike.%${cleanQ}%,institution.ilike.%${cleanQ}%`)
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
