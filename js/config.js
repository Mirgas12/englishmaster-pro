/**
 * Configuration module
 *
 * API Keys Security Strategy:
 * ================================
 * VERCEL (Production):
 *   - Gemini API key stored in Vercel Environment Variables
 *   - Requests go through /api/gemini serverless function
 *   - Keys are NEVER exposed to the browser
 *
 * LOCALHOST (Development):
 *   - Keys loaded from config.local.js (gitignored)
 *   - Direct API calls for faster development
 *
 * This file contains ONLY public configuration.
 * NEVER commit API keys to this file!
 */

const Config = {
    // Firebase config - loaded from config.local.js
    // Note: Firebase keys are designed to be "public" - security comes from Firebase Rules
    firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    },

    // Gemini AI key - ONLY for local development
    // On Vercel: handled by /api/gemini (key in Environment Variables)
    geminiApiKey: "",

    // LanguageTool - public free API
    // On Vercel: proxied through /api/grammar-check for rate limiting
    languageToolUrl: "https://api.languagetool.org/v2/check",

    // Free Dictionary API - fully public, no key needed
    dictionaryApiUrl: "https://api.dictionaryapi.dev/api/v2/entries/en",

    // CEFR Level hours (Cambridge official)
    levelHours: {
        A1: 95,
        A2: 190,
        B1: 375,
        B2: 550,
        C1: 750
    },

    // Vocabulary targets by level
    vocabularyTargets: {
        A1: { receptive: 500, productive: 250, spelling: 0.70 },
        A2: { receptive: 1500, productive: 750, spelling: 0.75 },
        B1: { receptive: 2500, productive: 1250, spelling: 0.80 },
        B2: { receptive: 3500, productive: 1750, spelling: 0.85 },
        C1: { receptive: 4500, productive: 2250, spelling: 0.90 }
    },

    // Listening hours by level
    listeningHours: {
        A1: { active: 15, passive: 0, total: 15 },
        A2: { active: 40, passive: 20, total: 50 },
        B1: { active: 80, passive: 40, total: 100 },
        B2: { active: 120, passive: 60, total: 150 },
        C1: { active: 180, passive: 80, total: 220 }
    },

    // Writing band targets
    writingTargets: {
        A1: 3.0,
        A2: 4.0,
        B1: 5.0,
        B2: 6.0,
        C1: 7.0
    },

    // Load local config if available
    loadLocalConfig() {
        if (typeof LocalConfig !== 'undefined') {
            Object.assign(this.firebase, LocalConfig.firebase || {});
            this.geminiApiKey = LocalConfig.geminiApiKey || this.geminiApiKey;
        }
    }
};

// Auto-load local config
Config.loadLocalConfig();

export default Config;
