/**
 * AI module for Gemini and LanguageTool integration
 * Supports multiple deployment modes:
 *
 * 1. VERCEL (recommended): API keys in Environment Variables, requests via /api/* proxies
 * 2. LOCAL: Direct API calls using keys from config.local.js
 * 3. GITHUB PAGES: No serverless support, falls back to local mode (limited AI)
 *
 * Detection priority:
 * - localhost/127.0.0.1 → LOCAL
 * - *.vercel.app → VERCEL
 * - *.github.io → LOCAL (no serverless on GitHub Pages)
 * - Custom domain → VERCEL (assumes Vercel deployment with custom domain)
 */

import Config from './config.js';

class AI {
    constructor() {
        // Detect deployment mode
        this.deploymentMode = this.detectDeploymentMode();
        this.isVercel = this.deploymentMode === 'vercel';

        // Set endpoints based on deployment
        if (this.isVercel) {
            // Use serverless functions (API keys are on server)
            this.geminiUrl = '/api/gemini';
            this.grammarUrl = '/api/grammar-check';
            console.log('AI: Running in Vercel mode (using server proxies)');
        } else {
            // Local/GitHub Pages - direct API calls
            this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
            this.grammarUrl = Config.languageToolUrl;
            console.log(`AI: Running in ${this.deploymentMode} mode (direct API calls)`);
        }
    }

    /**
     * Detect deployment environment
     * @returns {'local' | 'vercel' | 'github-pages' | 'static'}
     */
    detectDeploymentMode() {
        const hostname = window.location.hostname;

        // 1. Local development
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.endsWith('.local')) {
            return 'local';
        }

        // 2. Vercel domains (serverless available)
        if (hostname.includes('vercel.app') ||
            hostname.includes('.vercel.') ||
            hostname.endsWith('-vercel.app')) {
            return 'vercel';
        }

        // 3. GitHub Pages (NO serverless, static only)
        if (hostname.includes('github.io') ||
            hostname.includes('githubusercontent.com')) {
            return 'github-pages';
        }

        // 4. Netlify (has serverless, but different path)
        if (hostname.includes('netlify.app') ||
            hostname.includes('netlify.com')) {
            // Netlify uses /.netlify/functions/ - not supported yet
            return 'static';
        }

        // 5. Custom domain - check if API routes exist
        // Assume Vercel if deployed with custom domain (most common case)
        // User can override via config if needed
        if (Config.forceLocalMode) {
            return 'static';
        }

        // Default: assume Vercel with custom domain
        return 'vercel';
    }

    /**
     * Call Gemini API (via proxy on Vercel, direct in local dev)
     */
    async callGemini(prompt, options = {}) {
        // In local mode, check for API key
        if (!this.isVercel && !Config.geminiApiKey) {
            console.warn('Gemini API key not configured (local mode)');
            return this.getFallbackResponse(prompt, options);
        }

        try {
            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 1024
                }
            };

            // Different URL for Vercel (proxy) vs local (direct with key)
            const url = this.isVercel
                ? this.geminiUrl
                : `${this.geminiUrl}?key=${Config.geminiApiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Gemini API error:', response.status, errorData);
                throw new Error(errorData.message || 'API request failed');
            }

            const data = await response.json();

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            throw new Error('Invalid Gemini response');
        } catch (error) {
            console.error('Gemini API error:', error);
            return this.getFallbackResponse(prompt, options);
        }
    }

    /**
     * Check writing with LanguageTool (via proxy on Vercel, direct in local)
     */
    async checkGrammar(text) {
        try {
            let response;

            if (this.isVercel) {
                // Use proxy endpoint (JSON body)
                response = await fetch(this.grammarUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        language: 'en-US'
                    })
                });
            } else {
                // Direct call to LanguageTool (form-urlencoded)
                response = await fetch(this.grammarUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        text: text,
                        language: 'en-US'
                    })
                });
            }

            const data = await response.json();

            return {
                matches: data.matches || [],
                errors: data.matches?.map(m => ({
                    message: m.message,
                    offset: m.offset,
                    length: m.length,
                    replacements: m.replacements?.slice(0, 3).map(r => r.value) || [],
                    rule: m.rule?.id,
                    category: m.rule?.category?.id
                })) || []
            };
        } catch (error) {
            console.error('LanguageTool error:', error);
            return { matches: [], errors: [] };
        }
    }

    /**
     * Assess writing (IELTS-style)
     */
    async assessWriting(text, taskType = 'essay') {
        const wordCount = text.split(/\s+/).length;

        // First check with LanguageTool
        const grammarCheck = await this.checkGrammar(text);

        // Then assess with AI
        const prompt = `You are an IELTS examiner. Assess this ${taskType} and provide scores.

TEXT:
${text}

Word count: ${wordCount}
Grammar errors found: ${grammarCheck.errors.length}

Provide assessment in this JSON format:
{
    "taskAchievement": { "score": 0-9, "feedback": "..." },
    "coherenceCohesion": { "score": 0-9, "feedback": "..." },
    "lexicalResource": { "score": 0-9, "feedback": "..." },
    "grammaticalRange": { "score": 0-9, "feedback": "..." },
    "overall": 0-9,
    "strengths": ["...", "..."],
    "improvements": ["...", "..."]
}

Be realistic - most learners score 5-6.5. Only give 7+ for truly excellent writing.
Return ONLY valid JSON.`;

        const response = await this.callGemini(prompt, { temperature: 0.3 });

        try {
            const assessment = JSON.parse(response);

            // Calibrate score (AI tends to be generous)
            const calibrated = this.calibrateWritingScore(assessment, text, wordCount, grammarCheck);

            return {
                ...calibrated,
                grammarErrors: grammarCheck.errors,
                disclaimer: true
            };
        } catch (e) {
            // Return basic assessment if parsing fails
            return {
                overall: 5.0,
                range: { low: 4.5, high: 5.5 },
                grammarErrors: grammarCheck.errors,
                feedback: 'Unable to provide detailed assessment.',
                disclaimer: true
            };
        }
    }

    /**
     * Calibrate writing score
     */
    calibrateWritingScore(assessment, text, wordCount, grammarCheck) {
        let overall = assessment.overall;

        // Penalize for template usage
        const templates = ['in conclusion', 'to sum up', 'firstly', 'secondly', 'thirdly'];
        const templateCount = templates.filter(t => text.toLowerCase().includes(t)).length;
        if (templateCount >= 3) {
            overall -= 0.5;
        }

        // Penalize for short length
        const minWords = 250;
        if (wordCount < minWords * 0.9) {
            overall -= 0.5;
        }

        // Penalize for many grammar errors
        const errorRate = grammarCheck.errors.length / wordCount;
        if (errorRate > 0.05) {
            overall -= 0.5;
        }

        overall = Math.max(3, Math.min(9, overall));

        return {
            ...assessment,
            overall: Math.round(overall * 2) / 2, // Round to 0.5
            range: {
                low: Math.max(0, overall - 0.5),
                high: Math.min(9, overall + 0.5)
            }
        };
    }

    /**
     * Generate comprehension questions for text
     */
    async generateQuestions(text, count = 5, level = 'B1') {
        const prompt = `Generate ${count} comprehension questions for this text at CEFR ${level} level.

TEXT:
${text}

Create a mix of:
- Literal (facts from text): 30%
- Inferential (conclusions): 30%
- Vocabulary (word meaning): 30%
- Verification (specific details): 10%

Return JSON array:
[{
    "question": "...",
    "type": "literal|inferential|vocabulary|verification",
    "correctAnswer": "...",
    "options": ["...", "...", "...", "..."],
    "explanation": "..."
}]

Return ONLY valid JSON array.`;

        const response = await this.callGemini(prompt, { temperature: 0.5 });

        try {
            return JSON.parse(response);
        } catch (e) {
            return this.getDefaultQuestions(text);
        }
    }

    /**
     * Check grammar exercise
     */
    async checkGrammarExercise(userAnswer, correctPattern, topic) {
        const prompt = `Check if this answer follows the grammar pattern correctly.

Topic: ${topic}
Expected pattern: ${correctPattern}
User answer: ${userAnswer}

Return JSON:
{
    "correct": true/false,
    "feedback": "...",
    "correction": "..." (if wrong)
}

Return ONLY valid JSON.`;

        const response = await this.callGemini(prompt, { temperature: 0.2 });

        try {
            return JSON.parse(response);
        } catch (e) {
            return { correct: false, feedback: 'Unable to check answer.' };
        }
    }

    /**
     * Generate conversation response for speaking practice
     */
    async generateConversation(context, userMessage, level = 'B1') {
        const prompt = `You are having a conversation in English with a ${level} level learner.

Context: ${context}
User said: "${userMessage}"

Respond naturally and appropriately for their level. Keep it brief (1-3 sentences).
If they made errors, subtly model correct usage without explicitly correcting.

Return just the response, no JSON.`;

        return await this.callGemini(prompt, { temperature: 0.8, maxTokens: 200 });
    }

    /**
     * Get word definition and examples
     */
    async getWordInfo(word) {
        // Try Free Dictionary API first
        try {
            const response = await fetch(`${Config.dictionaryApiUrl}/${word}`);
            if (response.ok) {
                const data = await response.json();
                if (data[0]) {
                    return this.parseFreeDictionaryResponse(data[0]);
                }
            }
        } catch (e) {
            console.warn('Free Dictionary API error:', e);
        }

        // Fallback to Gemini
        const prompt = `Provide info for word "${word}" in JSON:
{
    "word": "${word}",
    "phonetic": "/.../ (IPA)",
    "partOfSpeech": "noun/verb/etc",
    "definition": "...",
    "translation_ru": "...",
    "examples": ["...", "..."],
    "collocations": ["...", "..."],
    "level": "A1/A2/B1/B2/C1"
}
Return ONLY valid JSON.`;

        const response = await this.callGemini(prompt, { temperature: 0.2 });

        try {
            return JSON.parse(response);
        } catch (e) {
            return null;
        }
    }

    /**
     * Parse Free Dictionary API response
     */
    parseFreeDictionaryResponse(data) {
        const meaning = data.meanings?.[0];
        return {
            word: data.word,
            phonetic: data.phonetic || data.phonetics?.[0]?.text || '',
            partOfSpeech: meaning?.partOfSpeech || '',
            definition: meaning?.definitions?.[0]?.definition || '',
            examples: meaning?.definitions?.slice(0, 3).map(d => d.example).filter(Boolean) || [],
            synonyms: meaning?.synonyms?.slice(0, 5) || [],
            audio: data.phonetics?.find(p => p.audio)?.audio || ''
        };
    }

    /**
     * Fallback responses when API unavailable
     */
    getFallbackResponse(prompt, options) {
        if (prompt.includes('comprehension questions')) {
            return JSON.stringify([
                {
                    question: 'What is the main topic of this text?',
                    type: 'literal',
                    correctAnswer: 'The main topic',
                    options: ['The main topic', 'Option B', 'Option C', 'Option D']
                }
            ]);
        }

        return 'AI service temporarily unavailable. Please try again later.';
    }

    /**
     * Default questions fallback
     */
    getDefaultQuestions(text) {
        return [{
            question: 'What is the main idea of this text?',
            type: 'literal',
            correctAnswer: 'Main idea',
            options: ['Main idea', 'Wrong A', 'Wrong B', 'Wrong C'],
            explanation: 'The main idea is stated in the text.'
        }];
    }
}

export default new AI();
