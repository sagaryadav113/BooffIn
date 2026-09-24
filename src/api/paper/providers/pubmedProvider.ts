import { MetadataProvider, ParsedReferenceInput, NormalizedPaperMetadata } from '../types';
import { Author } from '../../../types';

export class PubMedProvider implements MetadataProvider {
  name = 'EuropePMC / PubMed';

  supports(input: ParsedReferenceInput): boolean {
    return Boolean(input.pmid || input.pmcid || input.type === 'pubmed_url');
  }

  async resolve(input: ParsedReferenceInput): Promise<NormalizedPaperMetadata | null> {
    const pmid = input.pmid;
    const pmcid = input.pmcid;
    if (!pmid && !pmcid && !input.doi) return null;

    try {
      let query = '';
      if (pmid) query = `ext_id:${encodeURIComponent(pmid)} src:med`;
      else if (pmcid) query = `pmcid:${encodeURIComponent(pmcid)}`;
      else if (input.doi) query = `doi:${encodeURIComponent(input.doi)}`;
      else return null;

      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&resultType=core`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BooffIn-Academic-Discovery/1.0 (mailto:academic@booffin.science)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const resultList = data?.resultList?.result;

      if (!resultList || resultList.length === 0) return null;
      const item = resultList[0];

      const title = item.title ? item.title.replace(/<[^>]*>/g, '').trim() : 'Untitled Study';
      const abstract = item.abstractText ? item.abstractText.replace(/<[^>]*>/g, '').trim() : undefined;

      const authors: Author[] = (item.authorList?.author || []).map((a: any) => ({
        name: a.fullName || `${a.firstName ? a.firstName + ' ' : ''}${a.lastName || ''}`.trim() || 'Author',
        affiliation: a.affiliation,
        orcid: a.authorId?.type?.toLowerCase() === 'orcid' ? a.authorId.value : undefined,
      }));

      const publicationYear = item.pubYear ? parseInt(item.pubYear, 10) : new Date().getFullYear();
      const journal = item.journalInfo?.journal?.title || item.journalTitle || 'Medical Journal';
      const doi = item.doi ? item.doi.toLowerCase() : input.doi;
      const canonicalUrl = doi
        ? `https://doi.org/${doi}`
        : item.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
        : input.canonicalUrl || '';

      const isOpenAccess = item.isOpenAccess === 'Y';
      const openAccessPdfUrl = item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'pdf')?.url;

      return {
        doi,
        title,
        abstract,
        authors: authors.length > 0 ? authors : [{ name: 'Medical Research Group' }],
        journal,
        publisher: item.journalInfo?.journal?.medlineAbbreviation,
        publicationYear,
        publicationDate: item.firstPublicationDate || `${publicationYear}`,
        canonicalUrl,
        openAccessUrl: openAccessPdfUrl,
        isOpenAccess,
        openAccessStatus: isOpenAccess ? 'gold' : 'closed',
        citationCount: item.citedByCount || 0,
        topics: item.meshHeadingList?.meshHeading?.slice(0, 5) || ['Biomedical Sciences'],
        providerName: this.name,
      };
    } catch {
      return null;
    }
  }
}
