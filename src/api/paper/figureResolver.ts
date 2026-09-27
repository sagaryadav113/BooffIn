import { PaperFigure } from '../../types';
import { ParsedReferenceInput } from './types';

// In-memory cache for resolved paper figures
const figureCache = new Map<string, PaperFigure[]>();

interface FigureResolverParams {
  doi?: string;
  pmid?: string;
  pmcid?: string;
  arxivId?: string;
  canonicalUrl?: string;
  title?: string;
  journal?: string;
}

/**
 * Resolves up to 2 high-resolution scientific figures with titles/captions for a paper
 */
export async function resolvePaperFigures(
  params: FigureResolverParams
): Promise<PaperFigure[]> {
  const cacheKey =
    params.doi?.toLowerCase() ||
    params.arxivId ||
    params.pmid ||
    params.canonicalUrl ||
    params.title?.slice(0, 50);

  if (cacheKey && figureCache.has(cacheKey)) {
    const cached = figureCache.get(cacheKey)!;
    if (cached.length > 0) {
      return cached;
    }
  }

  let figures: PaperFigure[] = [];

  try {
    // 1. Try arXiv Figures
    if (params.arxivId || (params.canonicalUrl && params.canonicalUrl.includes('arxiv.org'))) {
      const arxivId =
        params.arxivId ||
        params.canonicalUrl?.match(/arxiv\.org\/(?:abs|pdf|html)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i)?.[1];

      if (arxivId) {
        figures = await resolveArxivFigures(arxivId);
      }
    }

    // 2. Try PubMed Central / Europe PMC XML (Works for Nature, Springer, PLOS, Frontiers, BMC, etc.)
    if (figures.length === 0 && (params.doi || params.pmid || params.pmcid)) {
      figures = await resolvePmcFigures({
        doi: params.doi,
        pmid: params.pmid,
        pmcid: params.pmcid,
        journal: params.journal,
        canonicalUrl: params.canonicalUrl,
      });
    }

    // 3. Try Publisher OpenGraph / HTML Meta Fallback
    if (figures.length === 0 && params.canonicalUrl && params.canonicalUrl.startsWith('http')) {
      figures = await resolveOpenGraphFigures(params.canonicalUrl, params.title);
    }
  } catch (err) {
    console.warn('[figureResolver] Error resolving figures:', err);
  }

  // Cache result if valid figures were found
  if (cacheKey && figures.length > 0) {
    figureCache.set(cacheKey, figures);
  }

  return figures;
}

/**
 * Resolves figures from NCBI PMC and Europe PMC XML
 */
async function resolvePmcFigures(params: {
  doi?: string;
  pmid?: string;
  pmcid?: string;
  journal?: string;
  canonicalUrl?: string;
}): Promise<PaperFigure[]> {
  try {
    let resolvedPmcId = params.pmcid;

    // If PMCID not given, find it via Europe PMC search
    if (!resolvedPmcId && (params.doi || params.pmid)) {
      const query = params.doi
        ? `DOI:${params.doi}`
        : `EXT_ID:${params.pmid} AND SRC:MED`;

      const epUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
        query
      )}&format=json&resultType=lite`;

      const epRes = await fetch(epUrl, {
        headers: { 'User-Agent': 'BooffIn/1.0 (academic; dev@booffin.science)' },
        signal: AbortSignal.timeout(4500),
      });

      if (epRes.ok) {
        const epData = await epRes.json();
        const hit = epData.resultList?.result?.[0];
        if (hit?.pmcid) {
          resolvedPmcId = hit.pmcid;
        }
      }
    }

    if (!resolvedPmcId) {
      return [];
    }

    const cleanPmcId = resolvedPmcId.replace(/^PMC/i, '');
    const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${cleanPmcId}&retmode=xml`;

    const efetchRes = await fetch(efetchUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!efetchRes.ok) return [];
    const xml = await efetchRes.text();

    const figMatches = xml.match(/<fig[\s\S]*?<\/fig>/gi) || [];
    if (figMatches.length === 0) return [];

    const figures: PaperFigure[] = [];
    const doiLower = (params.doi || '').toLowerCase();
    const journalLower = (params.journal || '').toLowerCase();
    const urlLower = (params.canonicalUrl || '').toLowerCase();

    const isSpringerNature =
      doiLower.startsWith('10.1038/') ||
      doiLower.startsWith('10.1007/') ||
      doiLower.startsWith('10.1186/') ||
      journalLower.includes('nature') ||
      journalLower.includes('springer') ||
      journalLower.includes('scientific reports') ||
      journalLower.includes('bmc') ||
      urlLower.includes('nature.com') ||
      urlLower.includes('springer.com');

    for (let i = 0; i < Math.min(figMatches.length, 2); i++) {
      const figXml = figMatches[i];

      // Extract Label e.g. "Fig. 1" or "Figure 1"
      const labelMatch = figXml.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
      const label = labelMatch
        ? labelMatch[1].replace(/<[^>]+>/g, '').trim()
        : `Figure ${i + 1}`;

      // Extract Caption / Title
      const captionMatch =
        figXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
        figXml.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);

      let captionText = captionMatch
        ? captionMatch[1].replace(/<[^>]+>/g, '').trim()
        : '';
      if (captionText.length > 120) {
        captionText = captionText.slice(0, 117) + '...';
      }

      // Extract Graphic href
      const graphicMatch =
        figXml.match(/xlink:href="([^"]+)"/i) ||
        figXml.match(/href="([^"]+)"/i);

      if (graphicMatch) {
        const rawGraphic = graphicMatch[1].trim();
        const baseGraphic = rawGraphic.replace(/\.(jpg|jpeg|png|tif|tiff)$/i, '');

        let imageUrl = '';

        if (isSpringerNature) {
          // Springer Nature / Scientific Reports / Nature CDN uses .png MediaObjects
          imageUrl = `https://media.springernature.com/lw685/springer-static/image/art%3A${encodeURIComponent(
            params.doi || ''
          )}/MediaObjects/${baseGraphic}.png`;
        } else if (doiLower.startsWith('10.1371/')) {
          // PLOS image API
          imageUrl = `https://journals.plos.org/plosone/article/figure/image?size=medium&id=${encodeURIComponent(
            params.doi || ''
          )}.${baseGraphic}`;
        } else {
          // Standard NCBI PMC binary CDN
          const finalGraphicName = rawGraphic.toLowerCase().endsWith('.jpg') || rawGraphic.toLowerCase().endsWith('.png')
            ? rawGraphic
            : `${rawGraphic}.jpg`;
          imageUrl = `https://pmc.ncbi.nlm.nih.gov/articles/PMC${cleanPmcId}/bin/${finalGraphicName}`;
        }

        figures.push({
          id: `fig_${cleanPmcId}_${i + 1}`,
          url: imageUrl,
          caption: captionText ? `${label}: ${captionText}` : label,
          isPrimary: i === 0,
        });
      }
    }

    return figures;
  } catch (err) {
    console.warn('[figureResolver] PMC figure error:', err);
    return [];
  }
}

/**
 * Resolves figures from arXiv HTML / ar5iv export
 */
async function resolveArxivFigures(arxivId: string): Promise<PaperFigure[]> {
  const cleanId = arxivId.replace(/^arxiv:/i, '').trim();
  try {
    const res = await fetch(`https://arxiv.org/html/${cleanId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const figures: PaperFigure[] = [];
    const figureBlocks = html.match(/<figure[\s\S]*?<\/figure>/gi) || [];

    if (figureBlocks.length > 0) {
      for (let i = 0; i < Math.min(figureBlocks.length, 2); i++) {
        const block = figureBlocks[i];
        const imgMatch = block.match(/<img[^>]+src="([^">]+)"[^>]*>/i);
        const captionMatch = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);

        if (imgMatch) {
          let src = imgMatch[1].trim();
          if (src.startsWith('/static/') || src.startsWith('data:image')) {
            continue;
          }

          let fullSrc = src;
          if (!src.startsWith('http')) {
            if (src.includes(cleanId)) {
              fullSrc = `https://arxiv.org/html/${src.replace(/^\.?\//, '')}`;
            } else {
              fullSrc = `https://arxiv.org/html/${cleanId}/${src.replace(/^\.?\//, '')}`;
            }
          }

          let caption = captionMatch
            ? captionMatch[1].replace(/<[^>]+>/g, '').trim()
            : `Figure ${i + 1}`;
          if (caption.length > 120) {
            caption = caption.slice(0, 117) + '...';
          }

          figures.push({
            id: `arxiv_${cleanId}_${i + 1}`,
            url: fullSrc,
            caption,
            isPrimary: i === 0,
          });
        }
      }
    }

    // Fallback if no <figure> wrapper, find standalone images
    if (figures.length === 0) {
      const imgMatches = [...html.matchAll(/<img[^>]+src="([^">]+)"[^>]*>/gi)];
      const filtered = imgMatches
        .map((m) => m[1].trim())
        .filter(
          (src) =>
            !src.startsWith('/static/') &&
            !src.startsWith('data:image') &&
            !src.includes('logo') &&
            !src.includes('icon') &&
            !src.includes('avatar') &&
            !src.includes('orcid') &&
            !src.includes('badge') &&
            !src.includes('funder')
        );

      for (let i = 0; i < Math.min(filtered.length, 2); i++) {
        let src = filtered[i];
        let fullSrc = src;
        if (!src.startsWith('http')) {
          if (src.includes(cleanId)) {
            fullSrc = `https://arxiv.org/html/${src.replace(/^\.?\//, '')}`;
          } else {
            fullSrc = `https://arxiv.org/html/${cleanId}/${src.replace(/^\.?\//, '')}`;
          }
        }
        figures.push({
          id: `arxiv_${cleanId}_${i + 1}`,
          url: fullSrc,
          caption: `Figure ${i + 1}`,
          isPrimary: i === 0,
        });
      }
    }

    return figures;
  } catch (err) {
    console.warn('[figureResolver] arXiv figure error:', err);
    return [];
  }
}

/**
 * Resolves OpenGraph / Twitter Card preview images for arbitrary publisher links
 */
async function resolveOpenGraphFigures(
  url: string,
  paperTitle?: string
): Promise<PaperFigure[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"'>]+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"'>]+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"'>]+)["']/i) ||
      html.match(/<meta[^>]+name=["']citation_image["'][^>]+content=["']([^"'>]+)["']/i);

    if (ogMatch && ogMatch[1]) {
      let imgUrl = ogMatch[1].trim();
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      } else if (imgUrl.startsWith('/')) {
        try {
          const parsedOrigin = new URL(url).origin;
          imgUrl = parsedOrigin + imgUrl;
        } catch {}
      }

      // Filter out generic platform logos if possible
      if (
        !imgUrl.includes('fallback') &&
        !imgUrl.includes('logo_') &&
        !imgUrl.includes('default_image') &&
        !imgUrl.endsWith('favicon.ico')
      ) {
        return [
          {
            id: `og_${Date.now()}`,
            url: imgUrl,
            caption: paperTitle ? `Figure: ${paperTitle.slice(0, 100)}` : 'Key Paper Figure',
            isPrimary: true,
          },
        ];
      }
    }

    return [];
  } catch {
    return [];
  }
}
