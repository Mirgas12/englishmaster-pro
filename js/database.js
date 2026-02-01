/**
 * Database module with localStorage and optional Firebase Firestore
 * Primary: localStorage for offline-first approach
 * Secondary: Firebase Firestore for cloud sync (when configured)
 */

import Config from './config.js';

class Database {
    constructor() {
        this.db = null;
        this.storage = null;
        this.userId = null;
        this.useLocalStorage = true;
        this.firebaseInitialized = false;
    }

    /**
     * Initialize database
     */
    async init() {
        // Always use localStorage as primary storage
        this.useLocalStorage = true;

        // If Firebase is configured, try to initialize for sync
        if (Config.firebase.apiKey && typeof firebase !== 'undefined') {
            try {
                await this.initFirebase();
                this.firebaseInitialized = true;
            } catch (error) {
                console.warn('Firebase initialization failed, using localStorage only:', error);
            }
        }
    }

    /**
     * Initialize Firebase (when available via script tag)
     */
    async initFirebase() {
        if (!window.firebase) {
            throw new Error('Firebase SDK not loaded');
        }

        // Check if already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(Config.firebase);
        }

        this.db = firebase.firestore();
        this.storage = firebase.storage();
    }

    /**
     * Set current user
     */
    setUser(userId) {
        this.userId = userId || 'local_user';
    }

    /**
     * Get user profile
     */
    async getProfile() {
        // Local storage primary
        const localProfile = this.getLocalData('profile');
        if (localProfile) {
            return localProfile;
        }

        // Firebase fallback
        if (this.firebaseInitialized && this.db) {
            try {
                const docRef = this.db.collection('users').doc(this.userId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    this.setLocalData('profile', data);
                    return data;
                }
            } catch (error) {
                console.warn('Firebase read failed:', error);
            }
        }

        return this.createDefaultProfile();
    }

    /**
     * Save user profile
     */
    async saveProfile(profile) {
        // Always save locally
        this.setLocalData('profile', profile);

        // Sync to Firebase if available
        if (this.firebaseInitialized && this.db) {
            try {
                await this.db.collection('users').doc(this.userId).set(profile, { merge: true });
            } catch (error) {
                console.warn('Firebase sync failed:', error);
            }
        }
    }

    /**
     * Get vocabulary cards
     */
    async getVocabulary() {
        return this.getLocalData('vocabulary') || [];
    }

    /**
     * Save vocabulary card
     */
    async saveVocabularyCard(card) {
        const vocab = await this.getVocabulary();
        const index = vocab.findIndex(v => v.word === card.word);
        if (index >= 0) {
            vocab[index] = card;
        } else {
            vocab.push(card);
        }
        this.setLocalData('vocabulary', vocab);

        // Sync to Firebase if available
        if (this.firebaseInitialized && this.db) {
            try {
                await this.db.collection('users').doc(this.userId)
                    .collection('vocabulary').doc(card.word).set(card);
            } catch (error) {
                console.warn('Firebase sync failed:', error);
            }
        }
    }

    /**
     * Get grammar progress
     */
    async getGrammarProgress() {
        return this.getLocalData('grammar') || {};
    }

    /**
     * Save grammar progress
     */
    async saveGrammarProgress(progress) {
        this.setLocalData('grammar', progress);

        if (this.firebaseInitialized && this.db) {
            try {
                await this.db.collection('users').doc(this.userId)
                    .collection('progress').doc('grammar').set(progress);
            } catch (error) {
                console.warn('Firebase sync failed:', error);
            }
        }
    }

    /**
     * Get reading progress
     */
    async getReadingProgress() {
        return this.getLocalData('reading') || {};
    }

    /**
     * Save reading progress
     */
    async saveReadingProgress(progress) {
        this.setLocalData('reading', progress);
    }

    /**
     * Get listening progress
     */
    async getListeningProgress() {
        return this.getLocalData('listening') || {};
    }

    /**
     * Save listening progress
     */
    async saveListeningProgress(progress) {
        this.setLocalData('listening', progress);
    }

    /**
     * Get immersion progress
     */
    async getImmersionProgress() {
        return this.getLocalData('immersion') || {};
    }

    /**
     * Save immersion progress
     */
    async saveImmersionProgress(progress) {
        this.setLocalData('immersion', progress);
    }

    /**
     * Get placement test result
     */
    async getPlacementResult() {
        return this.getLocalData('placementResult');
    }

    /**
     * Save placement test result
     */
    async savePlacementResult(result) {
        this.setLocalData('placementResult', result);
    }

    /**
     * Get error patterns
     */
    async getErrorPatterns() {
        return this.getLocalData('errors') || this.createDefaultErrors();
    }

    /**
     * Save error patterns
     */
    async saveErrorPatterns(errors) {
        this.setLocalData('errors', errors);
    }

    /**
     * Log study session
     */
    async logSession(session) {
        const sessions = await this.getSessions();
        sessions.push({ ...session, timestamp: Date.now() });

        // Keep last 100 sessions
        const trimmed = sessions.slice(-100);
        this.setLocalData('sessions', trimmed);
    }

    /**
     * Get study sessions
     */
    async getSessions(days = 30) {
        const sessions = this.getLocalData('sessions') || [];
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return sessions.filter(s => s.timestamp > cutoff);
    }

    /**
     * Get total study time (minutes)
     */
    async getTotalStudyTime() {
        const profile = await this.getProfile();
        return profile.totalStudyMinutes || 0;
    }

    /**
     * Update study time
     */
    async addStudyTime(minutes) {
        const profile = await this.getProfile();
        profile.totalStudyMinutes = (profile.totalStudyMinutes || 0) + minutes;
        profile.lastStudyDate = new Date().toISOString().split('T')[0];

        // Update streak
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (profile.lastStudyDate === yesterday) {
            profile.streak = (profile.streak || 0) + 1;
        } else if (profile.lastStudyDate !== today) {
            profile.streak = 1;
        }

        await this.saveProfile(profile);
    }

    /**
     * Get study streak
     */
    async getStreak() {
        const profile = await this.getProfile();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (profile.lastStudyDate === today || profile.lastStudyDate === yesterday) {
            return profile.streak || 0;
        }
        return 0;
    }

    // ============= LocalStorage Helpers =============

    /**
     * Get data from localStorage
     */
    getLocalData(key) {
        try {
            const data = localStorage.getItem(`em_${this.userId}_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('LocalStorage read error:', error);
            return null;
        }
    }

    /**
     * Set data to localStorage
     */
    setLocalData(key, value) {
        try {
            localStorage.setItem(`em_${this.userId}_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error('LocalStorage write error:', error);
            // Try to clear old data if quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.clearOldSessions();
            }
        }
    }

    /**
     * Clear old sessions if storage is full
     */
    clearOldSessions() {
        const sessions = this.getLocalData('sessions') || [];
        const trimmed = sessions.slice(-50);
        localStorage.setItem(`em_${this.userId}_sessions`, JSON.stringify(trimmed));
    }

    /**
     * Export all user data
     */
    async exportData() {
        return {
            profile: await this.getProfile(),
            vocabulary: await this.getVocabulary(),
            grammar: await this.getGrammarProgress(),
            reading: await this.getReadingProgress(),
            listening: await this.getListeningProgress(),
            immersion: await this.getImmersionProgress(),
            sessions: await this.getSessions(365),
            errors: await this.getErrorPatterns(),
            exportedAt: Date.now()
        };
    }

    /**
     * Import user data
     */
    async importData(data) {
        if (data.profile) await this.saveProfile(data.profile);
        if (data.vocabulary) {
            for (const card of data.vocabulary) {
                await this.saveVocabularyCard(card);
            }
        }
        if (data.grammar) await this.saveGrammarProgress(data.grammar);
        if (data.reading) await this.saveReadingProgress(data.reading);
        if (data.listening) await this.saveListeningProgress(data.listening);
        if (data.immersion) await this.saveImmersionProgress(data.immersion);
        if (data.errors) await this.saveErrorPatterns(data.errors);
    }

    /**
     * Clear all user data
     */
    async clearAllData() {
        const keys = ['profile', 'vocabulary', 'grammar', 'reading', 'listening',
                      'immersion', 'sessions', 'errors', 'placementResult'];
        for (const key of keys) {
            localStorage.removeItem(`em_${this.userId}_${key}`);
        }
    }

    // ============= Default Data Structures =============

    /**
     * Create default profile
     */
    createDefaultProfile() {
        return {
            levels: {
                overall: null,  // Set after placement test
                vocabulary: { level: 'A1', receptive: 0, productive: 0 },
                grammar: { level: 'A1', topicsCompleted: 0, acquisition: 0 },
                reading: { level: 'A1', avgAccuracy: 0, avgWPM: 0 },
                listening: { level: 'A1', activeHours: 0, passiveHours: 0, avgAccuracy: 0 },
                writing: { level: 'A1', avgBand: 0, textsCount: 0 },
                speaking: { level: 'A1', avgScore: 0, sessionsCount: 0, needsExternalPractice: false }
            },
            targetLevel: 'B2',
            dailyGoalMinutes: 30,
            totalStudyMinutes: 0,
            streak: 0,
            lastStudyDate: null,
            settings: {
                language: 'ru',
                productiveVocabEnabled: true,
                spellingEnabled: true,
                timedRecallEnabled: false,
                showDisclaimers: true,
                darkMode: false
            },
            createdAt: Date.now()
        };
    }

    /**
     * Create default error patterns
     */
    createDefaultErrors() {
        return {
            grammar: {},
            vocabulary: { confusedPairs: [] },
            pronunciation: { problematicSounds: [] },
            listening: { weakAreas: [] }
        };
    }
}

export default new Database();
