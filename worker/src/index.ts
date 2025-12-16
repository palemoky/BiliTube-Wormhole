import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';

/**
 * Cloudflare Worker for user mapping submissions
 */

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Validation schema
const SubmissionSchema = z.object({
  bilibiliUid: z.string().regex(/^\d+$/, 'Invalid Bilibili UID'),
  youtubeChannelId: z.string().regex(/^UC[\w-]{22}$/, 'Invalid YouTube Channel ID'),
  submitterEmail: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

// Rate limiting using KV
interface RateLimitData {
  count: number;
  resetAt: number;
}

async function checkRateLimit(env: any, ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  
  const data = await env.RATE_LIMIT_KV.get(key, 'json') as RateLimitData | null;
  
  if (!data || now > data.resetAt) {
    // Reset rate limit
    await env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({ count: 1, resetAt: now + 3600000 }), // 1 hour
      { expirationTtl: 3600 }
    );
    return true;
  }
  
  if (data.count >= 10) {
    return false;
  }
  
  // Increment count
  await env.RATE_LIMIT_KV.put(
    key,
    JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
    { expirationTtl: Math.floor((data.resetAt - now) / 1000) }
  );
  
  return true;
}

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'BiliTube-Wormhole Submission API' });
});

// Submit mapping
app.post('/submit', async (c) => {
  const env = c.env as any;
  
  // Get client IP
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown';
  
  // Check rate limit
  const allowed = await checkRateLimit(env, ip);
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
  }
  
  // Parse and validate request
  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  
  const validation = SubmissionSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: 'Validation failed', details: validation.error.issues }, 400);
  }
  
  const { bilibiliUid, youtubeChannelId, submitterEmail, notes } = validation.data;
  
  // Create GitHub issue
  try {
    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    
    const issueBody = `
## User Mapping Submission

**Bilibili UID**: ${bilibiliUid}
**YouTube Channel ID**: ${youtubeChannelId}

${submitterEmail ? `**Submitter Email**: ${submitterEmail}` : ''}

${notes ? `### Notes\n${notes}` : ''}

---

*This issue was automatically created by the BiliTube-Wormhole submission system.*
*The verification workflow will run automatically to validate this mapping.*
    `.trim();
    
    const issue = await octokit.rest.issues.create({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      title: `User Mapping: ${bilibiliUid} -> ${youtubeChannelId}`,
      body: issueBody,
      labels: ['user-mapping', 'pending-verification'],
    });
    
    return c.json({
      success: true,
      message: 'Submission received. Verification will be processed automatically.',
      issueUrl: issue.data.html_url,
      issueNumber: issue.data.number,
    });
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return c.json({ error: 'Failed to create submission. Please try again later.' }, 500);
  }
});

export default app;
