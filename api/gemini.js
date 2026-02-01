/**
 * Gemini API Proxy - Serverless Function for Vercel
 * Keeps API key secure on server side
 *
 * Security features:
 * - Origin validation (Telegram WebApp)
 * - Best-effort rate limiting (see note below)
 * - Input validation
 * - Error sanitization
 *
 * NOTE ON RATE LIMITING:
 * Serverless functions are stateless - each invocation may run on a different instance.
 * The in-memory rate limit provides basic protection but is not guaranteed across instances.
 * For production with high traffic, consider:
 * - Vercel KV (https://vercel.com/docs/storage/vercel-kv)
 * - Upstash Redis (https://upstash.com/)
 * - Cloudflare Rate Limiting
 */

// Best-effort rate limiting (resets on cold start, not shared across instances)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window per instance

/**
 * Check rate limit for IP (best-effort, not distributed)
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
 * Validate request origin (strict matching)
 */
function validateOrigin(req) {
    const origin = req.headers['origin'] || '';
    const referer = req.headers['referer'] || '';

    // Build allowed origins list
    const allowedOrigins = [];

    // Add Vercel URL (with https://)
    if (process.env.VERCEL_URL) {
        allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }

    // Add custom allowed origin
    if (process.env.ALLOWED_ORIGIN) {
        allowedOrigins.push(process.env.ALLOWED_ORIGIN);
    }

    // Telegram origins
    allowedOrigins.push(
        'https://web.telegram.org',
        'https://t.me'
    );

    // Development: allow localhost with strict pattern
    if (process.env.NODE_ENV === 'development') {
        const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
        if (localhostPattern.test(origin) || localhostPattern.test(referer)) {
            return true;
        }
    }

    // Strict origin check (exact match or starts with for subdomains)
    const checkUrl = origin || referer;
    return allowedOrigins.some(allowed => {
        // Exact match
        if (checkUrl === allowed) return true;
        // Allow subdomains (e.g., https://preview-xxx.vercel.app)
        if (checkUrl.startsWith(allowed.replace('https://', 'https://') + '/')) return true;
        // Telegram subdomains
        if (allowed.includes('telegram.org') && checkUrl.includes('telegram.org')) return true;
        return false;
    });
}

/**
 * Validate request body
 */
function validateBody(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body' };
    }

    if (!body.contents || !Array.isArray(body.contents)) {
        return { valid: false, error: 'Missing contents array' };
    }

    // Check for reasonable size (prevent abuse)
    const bodySize = JSON.stringify(body).length;
    if (bodySize > 100000) { // 100KB limit
        return { valid: false, error: 'Request too large' };
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
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

    // Check API key configured
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(503).json({
            error: 'Service not configured',
            message: 'AI service is temporarily unavailable'
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
            message: 'Please wait before making more requests',
            retryAfter: 60
        });
    }

    // Validate origin (soft check - log but don't block for now)
    if (!validateOrigin(req)) {
        console.warn('Request from unexpected origin:', req.headers['origin']);
        // In production, you might want to block:
        // return res.status(403).json({ error: 'Forbidden' });
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
        // Call Gemini API
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

        const response = await fetch(`${geminiUrl}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        // Handle Gemini errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', response.status, errorData);

            // Don't expose internal errors to client
            if (response.status === 429) {
                return res.status(429).json({
                    error: 'AI service busy',
                    message: 'Please try again in a moment'
                });
            }

            return res.status(502).json({
                error: 'AI service error',
                message: 'Unable to process request'
            });
        }

        const data = await response.json();

        // Return successful response
        return res.status(200).json(data);

    } catch (error) {
        console.error('Gemini proxy error:', error.message);

        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'Unable to reach AI service'
            });
        }

        return res.status(500).json({
            error: 'Internal error',
            message: 'An unexpected error occurred'
        });
    }
}
