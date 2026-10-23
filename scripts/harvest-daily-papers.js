/**
 * BooffIn Autonomous Breakthrough Intelligence Harvester
 * 
 * - Demand-Driven: Queries Supabase for domains actively selected by real registered users.
 * - Zero Storage: Streams PDFs directly from open-access sources (0 MB stored in Supabase).
 * - Zero Cost: Runs on Gemini 1.5 Flash free tier once daily via GitHub Actions.
 * - Dedicated Personas: Posts under official verified accounts (e.g., @booffin_neuroscience).
 */

const { createClient } = require('@supabase/supabase-js');

// 1. Environment & Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Curator] Error: Missing SUPABASE_URL or SUPABASE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Fallback baseline domains if community is brand new
const BASELINE_DOMAINS = ['Neuroscience', 'Artificial Intelligence', 'Genetics'];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

/**
 * Step 1: Discover domains actively chosen by registered users
 */
async function getActiveUserDomains() {
  console.log('[Curator] Discovering active user domains from Supabase...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('research_interests')
      .not('research_interests', 'is', null);

    if (error) {
      console.warn('[Curator] Could not query profiles.research_interests:', error.message);
      return BASELINE_DOMAINS;
    }

    const domainSet = new Set();
    (profiles || []).forEach((p) => {
      if (Array.isArray(p.research_interests)) {
        p.research_interests.forEach((dom) => {
          if (dom && typeof dom === 'string' && dom.trim()) {
            domainSet.add(dom.trim());
          }
        });
      }
    });

    const activeList = Array.from(domainSet);
    console.log(`[Curator] Found ${activeList.length} unique active user domains.`);
    return activeList.length > 0 ? activeList.slice(0, 15) : BASELINE_DOMAINS;
  } catch (err) {
    console.warn('[Curator] Error fetching active domains:', err.message);
    return BASELINE_DOMAINS;
  }
}

/**
 * Step 2: Ensure the official Curator profile exists in Supabase
 */
async function getOrCreateCuratorProfile(domain) {
  const cleanSlug = slugify(domain);
  const handle = `booffin_${cleanSlug}`;
  const fullName = `BooffIn ${domain}`;

  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', handle)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  console.log(`[Curator] Provisioning new AI curator profile: @${handle}`);
  
  // Use a deterministic UUID for system curator nodes
  const crypto = require('crypto');
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const hash = crypto.createHash('sha1').update(namespace + handle).digest('hex');
  const curatorId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-8${hash.substring(17, 20)}-${hash.substring(20, 32)}`;

  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({
      id: curatorId,
      username: handle,
      full_name: fullName,
      avatar_url: 'https://letsbooffin.com/icon-192.png',
      academic_title: 'Official BooffIn Curator',
      institution: 'BooffIn Research Intelligence',
      bio: `Official BooffIn intelligence node curating daily breakthrough discoveries for researchers in ${domain}.`,
      is_verified: true,
      orcid_verified: false,
      visibility_level: 'public',
      is_private: false,
    }, { onConflict: 'username' })
    .select('id')
    .single();

  if (error) {
    console.warn(`[Curator] Failed to insert profile for @${handle}:`, error.message);
    // Fallback: try to find any system user or return existing
    const { data: fallback } = await supabase.from('profiles').select('id').limit(1).single();
    return fallback?.id || curatorId;
  }

  return created.id;
}

/**
 * Step 3: Fetch latest breakthrough papers from OpenAlex
 */
async function fetchPapersForDomain(domain) {
  console.log(`[Curator] Searching OpenAlex for breakthrough papers in: ${domain}`);
  try {
    const queryUrl = `https://api.openalex.org/works?search=${encodeURIComponent(domain)}&filter=open_access.is_oa:true,type:article&sort=publication_date:desc&per-page=2`;
    const res = await fetch(queryUrl, {
      headers: { 'User-Agent': 'BooffIn-Research-Harvester (mailto:support@letsbooffin.com)' }
    });

    if (!res.ok) {
      console.warn(`[Curator] OpenAlex API returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const works = data.results || [];
    
    return works.map((w) => {
      // Reconstruct abstract from OpenAlex inverted index
      let abstract = '';
      if (w.abstract_inverted_index) {
        const words = [];
        for (const [word, positions] of Object.entries(w.abstract_inverted_index)) {
          for (const pos of positions) {
            words[pos] = word;
          }
        }
        abstract = words.filter(Boolean).join(' ');
      }

      const authors = (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean);
      const pdfUrl = w.open_access?.oa_url || w.primary_location?.pdf_url || (w.doi ? `https://doi.org/${w.doi}` : null);

      return {
        title: w.title,
        abstract: abstract || 'Abstract available via primary open-access publication link.',
        doi: w.doi ? w.doi.replace('https://doi.org/', '') : null,
        canonicalUrl: w.doi || w.primary_location?.landing_page_url || `https://openalex.org/${w.id}`,
        openAccessPdfUrl: pdfUrl,
        journal: w.primary_location?.source?.display_name || 'Open Access Journal',
        publicationYear: w.publication_year || new Date().getFullYear(),
        publicationDate: w.publication_date || new Date().toISOString().split('T')[0],
        authors: authors.slice(0, 5),
        domain,
      };
    }).filter((p) => p.title && p.openAccessPdfUrl);
  } catch (err) {
    console.warn(`[Curator] OpenAlex error for ${domain}:`, err.message);
    return [];
  }
}

/**
 * Step 4: Synthesize Human-Researcher Discussion Post using Gemini 1.5 Flash
 */
async function generateHumanPost(paper, domain) {
  if (!GEMINI_API_KEY) {
    // High-quality deterministic fallback if no API key is provided
    return `Notable new findings in #${slugify(domain)}: "${paper.title}".\n\nThe authors present compelling data challenging conventional assumptions in the field. How does this methodology hold up compared to recent benchmarks in your lab?\n\n📄 Paper: ${paper.title}\n#${slugify(domain)} #AcademicResearch #ScientificDiscovery`;
  }

  try {
    const prompt = `You are an opinionated, brilliant senior researcher in ${domain} sharing a freshly published paper with your peers on BooffIn.
Write a natural, conversational scientific discussion post (under 120 words) analyzing this paper.

Paper Title: "${paper.title}"
Abstract: "${paper.abstract.slice(0, 1000)}"

STRICT RULES:
1. Do NOT use generic AI marketing clichés (FORBIDDEN: delve, game-changer, revolutionary, groundbreaking, unpack, crucial, testament, buckle up).
2. Start directly with the core paradox or tension in the findings or methodology.
3. Cite one specific empirical metric, sample size, or mechanism from the abstract.
4. Conclude with a sharp, open-ended question inviting peers to critique, bookmark, or discuss.
5. End with:
📄 Paper: ${paper.title}
#${slugify(domain)} #ResearchDiscovery`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        }
      })
    });

    if (!response.ok) {
      console.warn('[Curator] Gemini API returned error:', response.status);
      return `Notable new findings in #${slugify(domain)}: "${paper.title}".\n\nThe authors present compelling data challenging conventional assumptions in the field. How does this methodology hold up compared to recent benchmarks in your lab?\n\n📄 Paper: ${paper.title}\n#${slugify(domain)} #AcademicResearch`;
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText ? candidateText.trim() : `Exciting developments in #${slugify(domain)}: "${paper.title}". What are your thoughts on their methodology?\n\n📄 Paper: ${paper.title}\n#${slugify(domain)}`;
  } catch (err) {
    console.warn('[Curator] Gemini generation exception:', err.message);
    return `New research in #${slugify(domain)}: "${paper.title}".\n\n📄 Paper: ${paper.title}\n#${slugify(domain)}`;
  }
}

/**
 * Step 5: Insert Paper & Post into Supabase
 */
async function publishCuratedPost(paper, curatorId, postContent) {
  try {
    // 1. Insert Paper record (Streamable PDF URL, 0 MB storage)
    const { data: paperRow, error: paperError } = await supabase
      .from('papers')
      .upsert({
        doi: paper.doi || `openalex_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        canonical_url: paper.canonicalUrl,
        title: paper.title.slice(0, 500),
        abstract: paper.abstract.slice(0, 5000),
        journal: paper.journal,
        publication_year: paper.publicationYear,
        publication_date: paper.publicationDate,
        open_access_status: 'gold',
        open_access_pdf_url: paper.openAccessPdfUrl,
      }, { onConflict: 'doi' })
      .select('id')
      .single();

    if (paperError) {
      console.warn('[Curator] Paper insert notice:', paperError.message);
    }

    const paperId = paperRow?.id || null;

    // 2. Insert Post record
    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: curatorId,
        post_type: 'paper_share',
        content: postContent,
        paper_id: paperId,
        visibility: 'public',
        media_urls: [],
      })
      .select('id')
      .single();

    if (postError) {
      console.error('[Curator] Failed to insert post:', postError.message);
      return false;
    }

    console.log(`[Curator] Successfully published post ID: ${postRow.id}`);
    return true;
  } catch (err) {
    console.error('[Curator] Publish error:', err.message);
    return false;
  }
}

/**
 * Main Orchestrator
 */
async function main() {
  console.log('--- Starting BooffIn Daily Breakthrough Harvester ---');
  const domains = await getActiveUserDomains();

  let totalPublished = 0;

  for (const domain of domains) {
    try {
      const curatorId = await getOrCreateCuratorProfile(domain);
      const papers = await fetchPapersForDomain(domain);

      for (const paper of papers.slice(0, 1)) {
        const postText = await generateHumanPost(paper, domain);
        const success = await publishCuratedPost(paper, curatorId, postText);
        if (success) totalPublished++;
      }
    } catch (domainErr) {
      console.warn(`[Curator] Failed processing domain ${domain}:`, domainErr.message);
    }
  }

  console.log(`--- Harvester Finished. Published ${totalPublished} curated breakthrough posts. ---`);
}

main().catch((err) => {
  console.error('[Curator] Fatal error:', err);
  process.exit(1);
});
