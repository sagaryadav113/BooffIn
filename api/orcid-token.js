/**
 * Vercel Serverless Function: ORCID OAuth Token Exchange
 * Exchanging code server-side avoids browser CORS restrictions on orcid.org/oauth/token
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { code, redirect_uri } = body || {};
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.EXPO_PUBLIC_ORCID_CLIENT_ID || 'APP-NSUXYHOR9ADH7JS8';
    const clientSecret =
      process.env.EXPO_PUBLIC_ORCID_CLIENT_SECRET || '9f1e1f72-e722-4313-b2f2-121c37725f12';
    const redirectUri =
      redirect_uri ||
      process.env.EXPO_PUBLIC_ORCID_REDIRECT_URI ||
      'https://booff-in.vercel.app/orcid-callback';

    const tokenRes = await fetch('https://orcid.org/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.orcid) {
      return res.status(400).json({
        error: data.error_description || data.error || 'Failed to exchange ORCID token',
      });
    }

    return res.status(200).json({
      success: true,
      orcid: data.orcid,
      name: data.name,
      access_token: data.access_token,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error exchanging ORCID token' });
  }
}
