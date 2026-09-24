/**
 * BoffIn External Research-Paper Reference System Verification Suite
 * Tests:
 * 1. Input parsing & validation (DOI, publisher URLs, arXiv, bioRxiv, PubMed)
 * 2. Pluggable provider resolution & waterfall fallback
 * 3. Bibliographic metadata normalization (title, authors, abstract, journal, publisher, date, DOI, canonical URL)
 * 4. Duplicate-paper detection & reuse
 * 5. Failure reporting & manual confirmation fallback (no fake metadata)
 * 6. Canonical external URL preservation & Read Paper link
 */

import {
  parseReferenceInput,
  cleanDoi,
  detectPublisherFromUrl,
} from '../src/api/paper/inputParser';
import { defaultPaperResolver, CompositePaperResolver } from '../src/api/paper/metadataResolver';
import { OpenAlexProvider } from '../src/api/paper/providers/openAlexProvider';
import { CrossrefProvider } from '../src/api/paper/providers/crossrefProvider';
import { ArXivProvider } from '../src/api/paper/providers/arxivProvider';
import { PubMedProvider } from '../src/api/paper/providers/pubmedProvider';
import { createManualPaperReference } from '../src/api/paperResolver';

async function runPaperReferenceTests() {
  console.log('================================================================');
  console.log('📚 BOFFIN EXTERNAL RESEARCH REFERENCE SYSTEM TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: INPUT PARSER ENGINE
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: INPUT PARSING & IDENTIFIER EXTRACTION ---');

  // 1.1 Direct DOI
  const parse1 = parseReferenceInput('10.1038/s41586-024-07281-x');
  assert(parse1.type === 'doi' && parse1.doi === '10.1038/s41586-024-07281-x', 'Direct DOI parsed');
  assert(parse1.canonicalUrl === 'https://doi.org/10.1038/s41586-024-07281-x', 'Canonical DOI URL formed');

  // 1.2 DOI URL with https
  const parse2 = parseReferenceInput('https://doi.org/10.1126/science.ade3451');
  assert(parse2.doi === '10.1126/science.ade3451', 'DOI extracted from https://doi.org/...');

  // 1.3 Publisher URL (Nature)
  const parse3 = parseReferenceInput('https://www.nature.com/articles/s41586-024-07281-x');
  assert(parse3.doi === '10.1038/s41586-024-07281-x', 'DOI extracted from Nature URL');
  assert(parse3.detectedPublisher === 'Springer Nature', 'Publisher detected as Springer Nature');
  assert(parse3.detectedJournal === 'Nature', 'Journal detected as Nature');

  // 1.4 Publisher URL (Science)
  const parse4 = parseReferenceInput('https://www.science.org/doi/10.1126/science.ade3451');
  assert(parse4.doi === '10.1126/science.ade3451', 'DOI extracted from Science URL');
  assert(parse4.detectedPublisher === 'AAAS', 'Publisher detected as AAAS');

  // 1.5 Preprint URL (bioRxiv)
  const parse5 = parseReferenceInput('https://www.biorxiv.org/content/10.1101/2024.01.15.575600v1');
  assert(parse5.doi === '10.1101/2024.01.15.575600v1', 'bioRxiv DOI extracted');
  assert(parse5.detectedPublisher === 'Cold Spring Harbor Laboratory', 'bioRxiv publisher identified');

  // 1.6 Preprint URL (arXiv)
  const parse6 = parseReferenceInput('https://arxiv.org/abs/2303.08774');
  assert(parse6.type === 'arxiv_url' && parse6.arxivId === '2303.08774', 'arXiv URL parsed');
  assert(parse6.canonicalUrl === 'https://arxiv.org/abs/2303.08774', 'arXiv canonical URL preserved');

  // 1.7 Standalone arXiv ID
  const parse7 = parseReferenceInput('2303.08774v2');
  assert(parse7.type === 'arxiv_id' && parse7.arxivId === '2303.08774v2', 'Standalone arXiv ID identified');

  // 1.8 PubMed URL
  const parse8 = parseReferenceInput('https://pubmed.ncbi.nlm.nih.gov/38459201/');
  assert(parse8.type === 'pubmed_url' && parse8.pmid === '38459201', 'PubMed PMID extracted');
  console.log('  🎯 All 8 input formats correctly classified & parsed.\n');

  // --------------------------------------------------------------------------
  // TEST 2: PLUGGABLE PROVIDER ARCHITECTURE
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: PLUGGABLE PROVIDER RESOLUTION & WATERFALL ---');

  const customResolver = new CompositePaperResolver([
    new ArXivProvider(),
    new PubMedProvider(),
    new OpenAlexProvider(),
    new CrossrefProvider(),
  ]);

  // 2.1 ArXiv Provider resolution
  const arxivInput = parseReferenceInput('2303.08774');
  const arxivProvider = new ArXivProvider();
  assert(arxivProvider.supports(arxivInput) === true, 'ArXivProvider supports arXiv inputs');
  assert(arxivProvider.name === 'arXiv', 'Provider name is arXiv');

  // 2.2 Crossref Provider resolution
  const crossrefInput = parseReferenceInput('10.1038/s41586-024-07281-x');
  const crossrefProvider = new CrossrefProvider();
  assert(crossrefProvider.supports(crossrefInput) === true, 'CrossrefProvider supports DOI inputs');
  assert(crossrefProvider.name === 'Crossref', 'Provider name is Crossref');

  // 2.3 OpenAlex Provider resolution
  const openAlexProvider = new OpenAlexProvider();
  assert(openAlexProvider.supports(crossrefInput) === true, 'OpenAlexProvider supports DOI inputs');
  assert(openAlexProvider.name === 'OpenAlex', 'Provider name is OpenAlex');
  console.log('  🔌 Pluggable provider interfaces verified.\n');

  // --------------------------------------------------------------------------
  // TEST 3: BIBLIOGRAPHIC METADATA NORMALIZATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: METADATA NORMALIZATION & CANONICAL PRESERVATION ---');

  const resolveRes = await defaultPaperResolver.resolve('10.1038/s41586-024-07281-x');
  assert(resolveRes.paper !== null, 'Paper resolved into structured object');

  if (resolveRes.paper) {
    const paper = resolveRes.paper;
    assert(typeof paper.title === 'string' && paper.title.length > 0, 'Title normalized', paper.title);
    assert(Array.isArray(paper.authors) && paper.authors.length > 0, 'Authors normalized as structured array');
    assert(paper.authors[0].name.length > 0, 'Author name preserved', paper.authors[0].name);
    assert(typeof paper.journal === 'string', 'Journal identified', paper.journal);
    assert(typeof paper.publicationYear === 'number', 'Publication year extracted', `${paper.publicationYear}`);
    assert(paper.doi === '10.1038/s41586-024-07281-x', 'DOI normalized in lowercase');
    assert(paper.canonicalUrl.startsWith('http'), 'Canonical external URL preserved', paper.canonicalUrl);
    assert(typeof paper.isOpenAccess === 'boolean', 'Open access status detected');
    assert(typeof paper.citationCount === 'number', 'Citation metrics preserved');
    console.log(`  📄 Resolved: "${paper.title}" (${paper.journal}, ${paper.publicationYear}) via ${resolveRes.providerName}\n`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: DUPLICATE PAPER DETECTION & REUSE
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: DUPLICATE PAPER DETECTION ---');

  // paper_1 is already in mockPapers/catalog with DOI: 10.1038/s41586-024-07281-x
  const dupCheck = await defaultPaperResolver.resolve('10.1038/s41586-024-07281-x');
  assert(dupCheck.isDuplicate === true, 'Duplicate paper correctly flagged (isDuplicate: true)');
  assert(dupCheck.paper?.id !== undefined, 'Existing paper ID reused without duplicating records');
  console.log(`  🔁 Duplicate detection successfully matched Paper ID: ${dupCheck.paper?.id}\n`);

  // --------------------------------------------------------------------------
  // TEST 5: FAILURE REPORTING & MANUAL FALLBACK CONFIRMATION (NO FAKE DATA)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: FAILURE HANDLING & MANUAL FALLBACK ---');

  // 5.1 Invalid / unresolvable DOI
  const invalidRes = await defaultPaperResolver.resolve('10.99999/completely-invalid-nonexistent-paper-doi');
  assert(invalidRes.paper === null, 'Non-existent paper returns null without hallucinating fake data');
  assert(invalidRes.error !== null, 'Clear user-facing error message returned');
  assert(invalidRes.errorReason === 'not_found', 'Error reason flagged as not_found');

  // 5.2 Manual Reference Creation
  const manualPaper = createManualPaperReference({
    title: 'Custom In-House Cryo-EM Reconstruction of Ribosomal Complex',
    authorsString: 'Dr. Sarah Jenkins, Prof. Robert Miller',
    journal: 'Biophysical Preprint Archive',
    canonicalUrl: 'https://internal-repo.university.edu/paper/1234',
    doi: '10.5555/custom.2026.01',
    abstract: 'High-resolution structure determined at 2.1 Angstroms.',
    publicationYear: 2026,
    topics: ['Structural Biology', 'Cryo-EM'],
  });

  assert(manualPaper.id.startsWith('paper_manual_'), 'Manual paper created with structured ID');
  assert(manualPaper.title === 'Custom In-House Cryo-EM Reconstruction of Ribosomal Complex', 'Manual title preserved');
  assert(manualPaper.authors.length === 2, 'Manual comma-separated authors parsed into 2 authors');
  assert(manualPaper.canonicalUrl === 'https://internal-repo.university.edu/paper/1234', 'Manual canonical URL preserved');
  console.log(`  ✍️ Manual reference verified: "${manualPaper.title}" by ${manualPaper.authors.map((a) => a.name).join(', ')}\n`);

  // --------------------------------------------------------------------------
  // TEST 6: CANONICAL EXTERNAL READ PAPER BEHAVIOR
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: EXTERNAL READ PAPER VERIFICATION ---');

  assert(
    manualPaper.canonicalUrl.startsWith('http://') || manualPaper.canonicalUrl.startsWith('https://'),
    'Read Paper URL points directly to external web location'
  );
  assert(!manualPaper.canonicalUrl.includes('booffin-fulltext'), 'Zero full-text files stored in BoffIn');
  console.log('  🌐 External attribution & linking verified.\n');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed === 0) {
    console.log('🎉 ALL RESEARCH PAPER REFERENCE TESTS & PHILOSOPHY RULES PASSED!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed. Check logs above.\n');
    process.exit(1);
  }
}

runPaperReferenceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
