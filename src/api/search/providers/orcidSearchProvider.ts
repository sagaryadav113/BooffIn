import { ResearcherSearchResult } from '../types';
import { extractOrcidId } from '../../orcidService';

/**
 * Searches the official ORCID Public Registry for researchers
 */
export async function searchOrcidResearchers(
  query: string,
  limit = 10
): Promise<ResearcherSearchResult[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  // 1. Exact ORCID ID direct lookup
  const exactOrcid = extractOrcidId(cleanQ);
  if (exactOrcid) {
    try {
      const res = await fetch(`https://pub.orcid.org/v3.0/${exactOrcid}/record`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'BooffIn/1.0 (scholar-search; dev@booffin.science)',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json();
        const givenNames = data['person']?.['name']?.['given-names']?.['value'] || '';
        const familyName = data['person']?.['name']?.['family-name']?.['value'] || '';
        const fullName = `${givenNames} ${familyName}`.trim() || 'Verified Researcher';
        
        const institutions = (data['activities-summary']?.['employments']?.['affiliation-group'] || []).map(
          (g: any) => g?.['summaries']?.[0]?.['employment-summary']?.['organization']?.['name']
        ).filter(Boolean);

        const worksCount = data['activities-summary']?.['works']?.['group']?.length || 0;

        return [
          {
            id: `orcid_${exactOrcid}`,
            fullName,
            handle: fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'scholar',
            academicTitle: 'ORCID Verified Researcher',
            institution: institutions[0] || 'Academic Institution',
            orcidId: exactOrcid,
            orcidVerified: true,
            followersCount: 0,
            followingCount: 0,
            isRegisteredUser: false,
            worksCount,
          },
        ];
      }
    } catch {}
  }

  // 2. Query expanded search in ORCID Registry
  try {
    const searchUrl = `https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(
      cleanQ
    )}&rows=${limit}`;

    const res = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BooffIn/1.0 (scholar-search; dev@booffin.science)',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const results = data['expanded-result'] || [];

    const researchers: ResearcherSearchResult[] = [];
    for (const item of results) {
      const orcidId = item['orcid-id'];
      if (!orcidId) continue;

      const givenNames = item['given-names'] || '';
      const familyNames = item['family-names'] || '';
      const fullName = `${givenNames} ${familyNames}`.trim() || 'Researcher';
      const institution = item['institution-name']?.[0] || '';

      researchers.push({
        id: `orcid_${orcidId}`,
        fullName,
        handle: fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'scholar',
        academicTitle: 'ORCID Scholar',
        institution,
        orcidId,
        orcidVerified: true,
        followersCount: 0,
        followingCount: 0,
        isRegisteredUser: false,
      });
    }

    return researchers;
  } catch {
    return [];
  }
}
