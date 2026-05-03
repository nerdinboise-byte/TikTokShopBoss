import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // TikTok API Configuration
  const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
  const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

  // Legal Pages for Verification
  app.get('/terms', (req, res) => {
    res.send(`
      <html>
        <head><title>Terms of Service - ShopBoss</title></head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto;">
          <h1>Terms of Service</h1>
          <p>Welcome to ShopBoss. By using our service, you agree to these terms.</p>
          <h2>1. Description of Service</h2>
          <p>ShopBoss is a management tool for TikTok Shop affiliates to organize their work, track metrics, and generate content scripts.</p>
          <h2>2. Data Privacy</h2>
          <p>We use your TikTok data solely to provide performance metrics within the dashboard. We do not sell your data.</p>
          <h2>3. Limitation of Liability</h2>
          <p>ShopBoss is provided "as is" without warranties of any kind.</p>
        </body>
      </html>
    `);
  });

  app.get('/privacy', (req, res) => {
    res.send(`
      <html>
        <head><title>Privacy Policy - ShopBoss</title></head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto;">
          <h1>Privacy Policy</h1>
          <p>Your privacy is important to us.</p>
          <h2>1. Information We Collect</h2>
          <p>We collect your TikTok account information (via OAuth) to display video performance metrics and basic profile info.</p>
          <h2>2. How We Use Information</h2>
          <p>Information is used only to populate your personal dashboard. Tokens are stored securely and used only for API requests on your behalf.</p>
          <h2>3. Data Deletion</h2>
          <p>You can disconnect your TikTok account at any time, which will remove all associated tokens from our database.</p>
        </body>
      </html>
    `);
  });

  // TikTok Site Verification
  app.get(['/tiktok-developers-site-verification.txt', '/tiktok-developers-site-verification'], (req, res) => {
    res.type('text/plain');
    res.send('tiktok-developers-site-verification=gx6OutO9gjlnTejxDI87p3lHgdzDqH8I');
  });

  // State management for CSRF (In a real app, use a session or database)
  const states = new Set<string>();

  app.get('/api/tiktok/auth', (req, res) => {
    if (!TIKTOK_CLIENT_KEY) {
      return res.status(500).json({ error: 'TIKTOK_CLIENT_KEY is not configured' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    states.add(state);

    const redirectUri = `${APP_URL}/api/tiktok/callback`;
    const scope = 'user.info.basic,video.list,video.data.inline'; // Scopes for basic info and video data
    
    const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    tiktokAuthUrl.searchParams.append('client_key', TIKTOK_CLIENT_KEY);
    tiktokAuthUrl.searchParams.append('scope', scope);
    tiktokAuthUrl.searchParams.append('response_type', 'code');
    tiktokAuthUrl.searchParams.append('redirect_uri', redirectUri);
    tiktokAuthUrl.searchParams.append('state', state);

    res.json({ url: tiktokAuthUrl.toString() });
  });

  app.get('/api/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!states.has(state as string)) {
       return res.status(403).send('Invalid state parameter');
    }
    states.delete(state as string);

    if (!code) {
      return res.status(400).send('No code provided');
    }

    try {
      const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY!,
          client_secret: TIKTOK_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: `${APP_URL}/api/tiktok/callback`,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      // Success! We send a postMessage to the parent window and close.
      // The tokens should be handled by the client or stored temporarily.
      // For this implementation, we'll pass them back to the client via postMessage
      // and the client will save them to Firestore UserProfile.
      
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'TIKTOK_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(data)} 
              }, '*');
              window.close();
            </script>
            <p>TikTok connected successfully! Closing window...</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('TikTok Auth Error:', error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Proxy for TikTok API calls to keep tokens on server or handle them securely
  app.post('/api/tiktok/fetch-metrics', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    try {
      // 1. Fetch User Info
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userRes.json();

      // 2. Fetch Videos
      const videosRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max_count: 20 })
      });
      const videosData = await videosRes.json();

      // Note: Real TikTok Shop API requires specific credentials and is often a different base URL.
      // We'll mock some sales data if the user is in "Demo Mode" or if we can't hit a real shop API.
      // However, for video metrics, the above works.

      res.json({
        user: userData.data?.user,
        videos: videosData.data?.videos || [],
        // Mocked sales data for the "Income Hub" integration as requested
        sales: [
          { date: new Date().toISOString().split('T')[0], amount: Math.random() * 1000, source: 'TikTok Shop' }
        ]
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
