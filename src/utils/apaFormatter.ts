import { Paper } from '../types/paper';
import { ArticleReference } from '../types/post';

/**
 * Normalizes author name to APA 7th style: "Last, F. M."
 */
export function formatAuthorToApa(authorName: string): string {
  const trimmed = authorName.trim();
  if (!trimmed) return 'Unknown Author';

  // If already in "Last, F." format
  if (trimmed.includes(',')) {
    return trimmed;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }

  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, parts.length - 1)
    .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ''))
    .filter(Boolean)
    .join(' ');

  return initials ? `${lastName}, ${initials}` : lastName;
}

/**
 * Formats an array of authors for the full APA bibliography
 * APA 7th rules:
 * - 1 author: Last, F. M.
 * - 2 authors: Last, F. M., & Last, F. M.
 * - 3-20 authors: Last, F. M., Last, F. M., & Last, F. M.
 * - 21+ authors: First 19, ... Last
 */
export function formatAuthorsForBibliography(authors: string[]): string {
  if (!authors || authors.length === 0) return 'Unknown Author.';

  const formatted = authors.map(formatAuthorToApa);

  if (formatted.length === 1) {
    return `${formatted[0]}.`;
  }

  if (formatted.length === 2) {
    return `${formatted[0]}, & ${formatted[1]}.`;
  }

  if (formatted.length <= 20) {
    const allButLast = formatted.slice(0, -1).join(', ');
    const last = formatted[formatted.length - 1];
    return `${allButLast}, & ${last}.`;
  }

  // 21+ authors
  const first19 = formatted.slice(0, 19).join(', ');
  const last = formatted[formatted.length - 1];
  return `${first19}, ... ${last}.`;
}

/**
 * Formats in-text APA citation:
 * - 1 author: (Sharma, 2019)
 * - 2 authors: (Sharma & Gupta, 2019)
 * - 3+ authors: (Sharma et al., 2019)
 */
export function formatApaInTextCitation(authors: string[], year?: number): string {
  const yearStr = year && !isNaN(year) ? `${year}` : 'n.d.';

  if (!authors || authors.length === 0) {
    return `(Unknown, ${yearStr})`;
  }

  // Extract last name for in-text
  const getLastName = (authorStr: string): string => {
    const trimmed = authorStr.trim();
    if (trimmed.includes(',')) {
      return trimmed.split(',')[0].trim();
    }
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1] || trimmed;
  };

  const lastNames = authors.map(getLastName);

  if (lastNames.length === 1) {
    return `(${lastNames[0]}, ${yearStr})`;
  }

  if (lastNames.length === 2) {
    return `(${lastNames[0]} & ${lastNames[1]}, ${yearStr})`;
  }

  // 3 or more authors in APA 7th uses "et al." from first citation
  return `(${lastNames[0]} et al., ${yearStr})`;
}

/**
 * Formats a full APA 7th edition citation string
 * Author, A. A. (Year). Title of article. Journal Name, volume(issue). https://doi.org/xx
 */
export function formatApaFullCitation(params: {
  authors: string[];
  title: string;
  publicationYear?: number;
  journal?: string;
  doi?: string;
  url?: string;
}): string {
  const { authors, title, publicationYear, journal, doi, url } = params;

  const authorsPart = formatAuthorsForBibliography(authors);
  const yearPart = publicationYear && !isNaN(publicationYear) ? `(${publicationYear}).` : '(n.d.).';
  
  // Ensure title ends with a period
  const cleanTitle = title.trim().replace(/[.]+$/, '');
  const titlePart = `${cleanTitle}.`;

  const journalPart = journal?.trim() ? `${journal.trim()}.` : '';

  let linkPart = '';
  if (doi?.trim()) {
    const cleanDoiVal = doi.trim().replace(/^https?:\/\/doi\.org\//i, '');
    linkPart = `https://doi.org/${cleanDoiVal}`;
  } else if (url?.trim()) {
    linkPart = url.trim();
  }

  return [authorsPart, yearPart, titlePart, journalPart, linkPart]
    .filter(Boolean)
    .join(' ');
}

/**
 * Creates an ArticleReference object from a Paper entity
 */
export function createArticleReferenceFromPaper(paper: Paper): ArticleReference {
  const authorNames = (paper.authors || []).map((a) => (typeof a === 'string' ? a : a.name));

  const inTextCitation = formatApaInTextCitation(authorNames, paper.publicationYear);
  const fullCitation = formatApaFullCitation({
    authors: authorNames,
    title: paper.title,
    publicationYear: paper.publicationYear,
    journal: paper.journal,
    doi: paper.doi,
    url: paper.canonicalUrl || paper.openAccessUrl,
  });

  return {
    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    paperId: paper.id,
    title: paper.title,
    authors: authorNames,
    publicationYear: paper.publicationYear,
    journal: paper.journal,
    doi: paper.doi,
    url: paper.canonicalUrl || paper.openAccessUrl,
    openAccessPdfUrl: paper.openAccessUrl,
    apaInTextCitation: inTextCitation,
    apaFullCitation: fullCitation,
  };
}
