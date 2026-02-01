/**
 * LanguageTool Grammar Check Proxy - Serverless Function for Vercel
 * Provides centralized grammar checking with rate limiting
 *
 * Note: LanguageTool public API is free but has rate limits (20 req/min).
 * This proxy helps manage those limits across users.
 *
 * NOTE ON RATE LIMITING:
 * Serverless functions are stateless - rate limit is best-effort only.
 * For strict rate limiting, consider Vercel KV or Upstash Redis.
 */

// Best-effort rate limiting (not distributed across instances)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // requests per window (LanguageTool limit)

/**
 * Check rate limit for IP (best-effort)
 */
function checkRateLimit(ip) {
    const now = Date.now();

    // Clean old entries to prevent memory growth
    for (const [key, record] of rateLimitMap.entries()) {
        if (now - record.timestamp > RATE_LIMIT_WINDOW * 2) {
            rateLimitMap.delete(key);
        }
    }

    const record = rateLimitMap.get(ip);

    if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

/**
 * Validate request body
 */
function validateBody(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body' };
    }

    if (!body.text || typeof body.text !== 'string') {
        return { valid: false, error: 'Missing text field' };
    }

    // Limit text size (LanguageTool has limits)
    if (body.text.length > 20000) {
        return { valid: false, error: 'Text too long (max 20000 characters)' };
    }

    return { valid: true };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowed: ['POST']
        });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     'unknown';
    const rateLimit = checkRateLimit(clientIP);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

    if (!rateLimit.allowed) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Grammar check rate limit reached. Please wait.',
            retryAfter: 60
        });
    }

    // Validate body
    const validation = validateBody(req.body);
    if (!validation.valid) {
        return res.status(400).json({
            error: 'Bad request',
            message: validation.error
        });
    }

    try {
        const { text, language = 'en-US' } = req.body;

        // Determine LanguageTool URL
        // Use premium if API key is configured, otherwise public
        const baseUrl = process.env.LANGUAGETOOL_API_KEY
            ? 'https://api.languagetoolplus.com/v2/check'
            : 'https://api.languagetool.org/v2/check';

        // Build request body
        const formData = new URLSearchParams({
            text,
            language,
            enabledOnly: 'false'
        });

        // Add API key if available
        if (process.env.LANGUAGETOOL_API_KEY) {
            formData.append('apiKey', process.env.LANGUAGETOOL_API_KEY);
        }

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData.toString()
        });

        // Handle LanguageTool errors
        if (!response.ok) {
            console.error('LanguageTool error:', response.status);

            if (response.status === 429) {
                return res.status(429).json({
                    error: 'Service busy',
                    message: 'Grammar check service is busy. Please try again later.',
                    matches: []
                });
            }

            return res.status(502).json({
                error: 'Grammar check failed',
                message: 'Unable to check grammar',
                matches: []
            });
        }

        const data = await response.json();

        // Return successful response
        return res.status(200).json(data);

    } catch (error) {
        console.error('Grammar check proxy error:', error.message);

        return res.status(500).json({
            error: 'Internal error',
            message: 'Grammar check unavailable',
            matches: []
        });
    }
}
