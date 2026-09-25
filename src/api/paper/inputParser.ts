import { ParsedReferenceInput, ReferenceInputType } from './types';
import { sanitizeExternalUrl } from '../../utils/security';

// Standard DOI Regex pattern (compliant with Crossref / DataCite syntax)
const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i;

// arXiv ID patterns: New format (e.g., 2303.08774, 2101.00123v2) or Old format (e.g., hep-th/9912012)
const ARXIV_ID_REGEX = /(?:arxiv:\s*)?([a-z\-]+(?:\.[a-z\-]+)?\/\d{7}|\d{4}\.\d{4,5}(?:v\d+)?)/i;

// PubMed PMID / PMCID patterns
const PMID_REGEX = /(?:pmid:\s*|pubmed\.ncbi\.nlm\.nih\.gov\/)(\d{5,9})/i;
const PMCID_REGEX = /(?:pmcid:\s*|pmc\/articles\/)(PMC\d{5,9})/i;

/**
 * Normalizes and cleans a DOI string
 */
export function cleanDoi(doi: string): string {
  let cleaned = doi.trim().toLowerCase();
  // Remove leading URL components or doi: prefix
  cleaned = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  cleaned = cleaned.replace(/^doi:\s*/i, '');
  // Remove trailing punctuation that might come from pasted text
  cleaned = cleaned.replace(/[.,;)]+$/, '');
  return cleaned;
}

/**
 * Detects publisher or journal name from canonical URL or DOI
 */
export function detectPublisherFromUrl(url: string, doi?: string): { publisher?: string; journal?: string } {
  const lowerUrl = url.toLowerCase();
  const lowerDoi = (doi || '').toLowerCase();

  if (lowerUrl.includes('nature.com') || lowerDoi.startsWith('10.1038/')) {
    if (lowerUrl.includes('/nprot.') || lowerDoi.includes('s41596-')) return { publisher: 'Springer Nature', journal: 'Nature Protocols' };
    if (lowerUrl.includes('/neuro.') || lowerDoi.includes('s41593-')) return { publisher: 'Springer Nature', journal: 'Nature Neuroscience' };
    if (lowerUrl.includes('/ncomms.') || lowerDoi.includes('s41467-')) return { publisher: 'Springer Nature', journal: 'Nature Communications' };
    if (lowerUrl.includes('/srep.') || lowerDoi.includes('s41598-')) return { publisher: 'Springer Nature', journal: 'Scientific Reports' };
    return { publisher: 'Springer Nature', journal: 'Nature' };
  }

  if (lowerUrl.includes('science.org') || lowerDoi.startsWith('10.1126/')) {
    if (lowerUrl.includes('sciadv.') || lowerDoi.includes('sciadv')) return { publisher: 'AAAS', journal: 'Science Advances' };
    if (lowerUrl.includes('scitranslmed.')) return { publisher: 'AAAS', journal: 'Science Translational Medicine' };
    return { publisher: 'AAAS', journal: 'Science' };
  }

  if (lowerUrl.includes('cell.com') || lowerUrl.includes('sciencedirect.com') || lowerDoi.startsWith('10.1016/')) {
    if (lowerUrl.includes('/neuron/') || lowerUrl.includes('neuron')) return { publisher: 'Cell Press (Elsevier)', journal: 'Neuron' };
    if (lowerUrl.includes('/immunity/') || lowerUrl.includes('immunity')) return { publisher: 'Cell Press (Elsevier)', journal: 'Immunity' };
    if (lowerUrl.includes('/cancer-cell/')) return { publisher: 'Cell Press (Elsevier)', journal: 'Cancer Cell' };
    if (lowerUrl.includes('/molecular-cell/')) return { publisher: 'Cell Press (Elsevier)', journal: 'Molecular Cell' };
    return { publisher: 'Cell Press (Elsevier)', journal: 'Cell' };
  }

  if (lowerUrl.includes('biorxiv.org') || lowerDoi.startsWith('10.1101/')) {
    return { publisher: 'Cold Spring Harbor Laboratory', journal: 'bioRxiv Preprint' };
  }

  if (lowerUrl.includes('medrxiv.org')) {
    return { publisher: 'Cold Spring Harbor Laboratory', journal: 'medRxiv Preprint' };
  }

  if (lowerUrl.includes('arxiv.org')) {
    return { publisher: 'Cornell University', journal: 'arXiv Preprint' };
  }

  if (lowerUrl.includes('pnas.org') || lowerDoi.startsWith('10.1073/')) {
    return { publisher: 'National Academy of Sciences', journal: 'PNAS' };
  }

  if (lowerUrl.includes('thelancet.com') || lowerUrl.includes('lancet')) {
    return { publisher: 'Elsevier', journal: 'The Lancet' };
  }

  if (lowerUrl.includes('ieeexplore.ieee.org') || lowerDoi.startsWith('10.1109/')) {
    return { publisher: 'IEEE', journal: 'IEEE Transactions' };
  }

  if (lowerUrl.includes('journals.plos.org') || lowerDoi.startsWith('10.1371/')) {
    if (lowerUrl.includes('plosbiology') || lowerDoi.includes('pbio')) return { publisher: 'PLOS', journal: 'PLOS Biology' };
    if (lowerUrl.includes('plosgenetics') || lowerDoi.includes('pgen')) return { publisher: 'PLOS', journal: 'PLOS Genetics' };
    return { publisher: 'PLOS', journal: 'PLOS ONE' };
  }

  if (lowerUrl.includes('frontiersin.org') || lowerDoi.startsWith('10.3389/')) {
    return { publisher: 'Frontiers Media', journal: 'Frontiers in Science' };
  }

  if (lowerUrl.includes('onlinelibrary.wiley.com') || lowerDoi.startsWith('10.1002/') || lowerDoi.startsWith('10.1111/')) {
    return { publisher: 'Wiley-Blackwell', journal: 'Wiley Journal' };
  }

  if (lowerUrl.includes('springer.com') || lowerDoi.startsWith('10.1007/')) {
    return { publisher: 'Springer', journal: 'Springer Journal' };
  }

  return { publisher: undefined, journal: undefined };
}

/**
 * Extracts DOI from canonical publisher URLs or text
 */
export function extractDoiFromUrl(url: string): string | undefined {
  // 1. Direct standard DOI pattern in URL
  const match = url.match(DOI_REGEX);
  if (match) {
    return cleanDoi(match[1]);
  }

  // 2. Nature URL format: nature.com/articles/{articleId}
  const natureMatch = url.match(/nature\.com\/articles\/([a-zA-Z0-9.-]+)/i);
  if (natureMatch) {
    const articleId = natureMatch[1];
    return `10.1038/${articleId}`;
  }

  // 3. bioRxiv / medRxiv format: biorxiv.org/content/10.1101/{id}
  const biorxivMatch = url.match(/(?:biorxiv|medrxiv)\.org\/content\/(?:early\/[0-9/]+\/)?(?:10\.1101\/)?([0-9.]+)/i);
  if (biorxivMatch) {
    const id = biorxivMatch[1];
    return id.startsWith('10.1101/') ? id : `10.1101/${id}`;
  }

  // 4. Science format: science.org/doi/10.1126/{id}
  const scienceMatch = url.match(/science\.org\/doi\/(?:abs\/|full\/)?(?:10\.1126\/)?([a-zA-Z0-9.-]+)/i);
  if (scienceMatch) {
    const id = scienceMatch[1];
    return id.startsWith('10.1126/') ? id : `10.1126/${id}`;
  }

  // 5. PNAS format: pnas.org/doi/(?:10.1073/)?{id}
  const pnasMatch = url.match(/pnas\.org\/doi\/(?:10\.1073\/)?([a-zA-Z0-9.-]+)/i);
  if (pnasMatch) {
    const id = pnasMatch[1];
    return id.startsWith('10.1073/') ? id : `10.1073/${id}`;
  }

  return undefined;
}

/**
 * Parses user input (DOI, URL, arXiv ID, PMID) into a structured reference input
 */
export function parseReferenceInput(rawInput: string): ParsedReferenceInput {
  const trimmed = rawInput.trim();

  // 1. Check for DOI in string or URL
  const extractedDoi = extractDoiFromUrl(trimmed);
  if (extractedDoi) {
    const doi = cleanDoi(extractedDoi);
    const isExplicitUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const detected = detectPublisherFromUrl(trimmed, doi);

    let inputType: ReferenceInputType = 'doi';
    if (trimmed.includes('biorxiv.org')) inputType = 'biorxiv_url';
    else if (trimmed.includes('arxiv.org')) inputType = 'arxiv_url';
    else if (isExplicitUrl) inputType = 'publisher_url';

    return {
      rawInput: trimmed,
      type: inputType,
      doi,
      canonicalUrl: isExplicitUrl ? trimmed : `https://doi.org/${doi}`,
      detectedPublisher: detected.publisher,
      detectedJournal: detected.journal,
    };
  }

  // 2. Check for arXiv ID or URL
  if (trimmed.includes('arxiv.org') || trimmed.toLowerCase().startsWith('arxiv:')) {
    const arxivMatch = trimmed.match(ARXIV_ID_REGEX);
    const arxivId = arxivMatch ? arxivMatch[1] : undefined;
    return {
      rawInput: trimmed,
      type: 'arxiv_url',
      arxivId,
      canonicalUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : trimmed,
      detectedPublisher: 'Cornell University',
      detectedJournal: 'arXiv Preprint',
    };
  }

  // 3. Check for PubMed PMID or URL
  const pmidMatch = trimmed.match(PMID_REGEX);
  if (pmidMatch) {
    const pmid = pmidMatch[1];
    return {
      rawInput: trimmed,
      type: 'pubmed_url',
      pmid,
      canonicalUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      detectedPublisher: 'NCBI / NLM',
      detectedJournal: 'PubMed Reference',
    };
  }

  // 4. Check for PMCID
  const pmcidMatch = trimmed.match(PMCID_REGEX);
  if (pmcidMatch) {
    const pmcid = pmcidMatch[1];
    return {
      rawInput: trimmed,
      type: 'pubmed_url',
      pmcid,
      canonicalUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`,
      detectedPublisher: 'NCBI PMC',
      detectedJournal: 'PubMed Central Open Access',
    };
  }

  // 5. Check if it's a standalone arXiv ID (e.g. "2303.08774")
  const standaloneArxivMatch = trimmed.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/);
  if (standaloneArxivMatch) {
    const arxivId = standaloneArxivMatch[0];
    return {
      rawInput: trimmed,
      type: 'arxiv_id',
      arxivId,
      canonicalUrl: `https://arxiv.org/abs/${arxivId}`,
      detectedPublisher: 'Cornell University',
      detectedJournal: 'arXiv Preprint',
    };
  }

  // 6. Generic URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const safeUrl = sanitizeExternalUrl(trimmed) || trimmed;
    const detected = detectPublisherFromUrl(trimmed);
    return {
      rawInput: trimmed,
      type: 'generic_url',
      canonicalUrl: safeUrl,
      detectedPublisher: detected.publisher,
      detectedJournal: detected.journal,
    };
  }

  // Fallback as unformatted search / query
  return {
    rawInput: trimmed,
    type: 'generic_url',
    canonicalUrl: sanitizeExternalUrl(trimmed) || trimmed,
  };
}
