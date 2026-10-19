/**
 * Vercel Serverless Function: Dynamic OpenGraph preview generator for shared BooffIn posts
 * Serves rich metadata specifically to social crawler bots (WhatsApp, Twitter, LinkedIn, etc.)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xdzrpsptamdhqomhvjsx.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_EXMXn9ZWnmn1ggqEt93WvQ_HHKqfKqs';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { id } = req.query;
  const postId = Array.isArray(id) ? id[0] : (id || '');

  let title = 'BooffIn | Research Finds Its People';
  let description = 'Connect with researchers, share scientific insights, and explore breakthrough discoveries on BooffIn.';
  let imageUrl = 'https://www.letsbooffin.com/og-preview.jpg';
  let postUrl = `https://www.letsbooffin.com/post/${postId}`;

  if (postId) {
    try {
      const { data: post } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          media_urls,
          created_at,
          author:profiles!author_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('id', postId)
        .maybeSingle();

      if (post) {
        const authorName = post.author?.full_name || 'Researcher';
        const cleanContent = (post.content || '')
          .replace(/<!--POLL_DATA:[\s\S]*?-->/g, '')
          .replace(/<!--ARTICLE_DATA:[\s\S]*?-->/g, '')
          .trim();

        title = `${authorName} on BooffIn`;
        if (cleanContent) {
          description = cleanContent.length > 200 ? `${cleanContent.slice(0, 200)}...` : cleanContent;
        }

        if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          imageUrl = post.media_urls[0];
        }
      }
    } catch (e) {
      // Fallback to default
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${postUrl}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="BooffIn" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@letsbooffin" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Redirect humans if opened directly in a browser -->
  <meta http-equiv="refresh" content="0;url=${postUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${postUrl}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).send(html);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
