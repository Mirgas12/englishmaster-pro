/**
 * Main Application Controller
 * EnglishMaster Pro v3.0
 */

import Auth from './auth.js';
import Database from './database.js';
import Vocabulary from './vocabulary.js';
import Grammar from './grammar.js';
import Reading from './reading.js';
import Listening from './listening.js';
import Writing from './writing.js';
import Speaking from './speaking.js';
import Immersion from './immersion.js';
import IELTS from './ielts.js';
import ErrorAnalysis from './errorAnalysis.js';
import LevelCalculator from './levelCalculator.js';
import PlacementTest from './placementTest.js';

class App {
    constructor() {
        this.user = null;
        this.profile = null;
        this.currentModule = null;
        this.modules = {
            vocabulary: Vocabulary,
            grammar: Grammar,
            reading: Reading,
            listening: Listening,
            writing: Writing,
            speaking: Speaking,
            immersion: Immersion,
            ielts: IELTS
        };
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Initialize auth
            this.user = Auth.init();

            // Initialize database
            await Database.init();

            // Load user profile
            this.profile = await Database.getProfile();

            // Check if new user
            if (!this.profile.createdAt || !this.profile.lastPlacementTest) {
                return { status: 'new_user', needsPlacementTest: true };
            }

            // Initialize modules
            await this.initializeModules();

            // Check for reassessment
            const reassessment = await PlacementTest.checkReassessmentNeeded();
            if (reassessment.needed) {
                return { status: 'reassessment_suggested', ...reassessment };
            }

            // Update streak
            await this.updateStreak();

            return {
                status: 'ready',
                user: this.user,
                profile: this.profile,
                dashboard: await this.getDashboard()
            };
        } catch (error) {
            console.error('App initialization error:', error);
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Initialize all modules
     */
    async initializeModules() {
        await Vocabulary.init();
        await Grammar.init();
        await ErrorAnalysis.init();

        // Initialize Speech Recognition for Speaking
        Speaking.init();
    }

    /**
     * Get dashboard data
     */
    async getDashboard() {
        const progressBreakdown = await LevelCalculator.getProgressBreakdown();
        const vocabStats = Vocabulary.getStats();
        const vocabGap = Vocabulary.getGap();
        const grammarStats = Grammar.getStats();
        const errorDashboard = ErrorAnalysis.getDashboard();
        const dueCounts = Vocabulary.getDueCounts();

        // Calculate time to goal
        const timeToGoal = await LevelCalculator.calculateTimeToGoal(
            this.profile.targetLevel
        );

        return {
            user: {
                name: this.user.firstName,
                level: this.profile.levels.overall,
                targetLevel: this.profile.targetLevel,
                streak: this.profile.streak,
                totalMinutes: this.profile.totalStudyMinutes
            },
            progress: progressBreakdown,
            vocabulary: {
                ...vocabStats,
                gap: vocabGap,
                dueToday: dueCounts
            },
            grammar: grammarStats,
            errors: errorDashboard,
            timeToGoal,
            todayTasks: this.getTodayTasks(dueCounts)
        };
    }

    /**
     * Get today's recommended tasks
     */
    getTodayTasks(dueCounts) {
        const tasks = [];

        // Vocabulary reviews
        if (dueCounts.overdue.receptive > 0) {
            tasks.push({
                type: 'vocabulary',
                mode: 'receptive',
                count: dueCounts.overdue.receptive,
                priority: 'high',
                label: `Review ${dueCounts.overdue.receptive} overdue words`
            });
        }

        if (dueCounts.overdue.productive > 0) {
            tasks.push({
                type: 'vocabulary',
                mode: 'productive',
                count: dueCounts.overdue.productive,
                priority: 'high',
                label: `Practice ${dueCounts.overdue.productive} words (RU→EN)`
            });
        }

        // Grammar recommendation
        const nextGrammarTopic = Grammar.getNextTopic(this.profile.levels.grammar.level);
        if (nextGrammarTopic) {
            tasks.push({
                type: 'grammar',
                topic: nextGrammarTopic,
                priority: 'medium',
                label: 'Continue grammar journey'
            });
        }

        // Daily goals
        const remainingMinutes = Math.max(0,
            this.profile.dailyGoalMinutes - this.getTodayStudyMinutes()
        );
        if (remainingMinutes > 0) {
            tasks.push({
                type: 'goal',
                minutes: remainingMinutes,
                priority: 'low',
                label: `${remainingMinutes} min to reach daily goal`
            });
        }

        return tasks;
    }

    /**
     * Get today's study minutes
     */
    getTodayStudyMinutes() {
        // Would need to track this in sessions
        return 0;
    }

    /**
     * Update user streak
     */
    async updateStreak() {
        const today = new Date().toDateString();
        const lastStudy = this.profile.lastStudyDate
            ? new Date(this.profile.lastStudyDate).toDateString()
            : null;

        if (lastStudy === today) {
            // Already studied today
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastStudy === yesterday.toDateString()) {
            // Continued streak
            this.profile.streak++;
        } else if (lastStudy !== today) {
            // Streak broken
            this.profile.streak = 1;
        }

        this.profile.lastStudyDate = Date.now();
        await Database.saveProfile(this.profile);
    }

    /**
     * Start module session
     */
    async startModule(moduleName, options = {}) {
        const module = this.modules[moduleName];
        if (!module) {
            return { success: false, message: 'Module not found' };
        }

        this.currentModule = moduleName;

        // Track session start
        await Database.logSession({
            type: moduleName,
            action: 'start',
            level: this.profile.levels[moduleName]?.level || this.profile.levels.overall,
            ...options
        });

        return { success: true, module: moduleName };
    }

    /**
     * End module session
     */
    async endModule(results = {}) {
        if (!this.currentModule) return;

        // Update total study time
        if (results.duration) {
            this.profile.totalStudyMinutes += results.duration / 60000;
            await Database.saveProfile(this.profile);
        }

        this.currentModule = null;
    }

    /**
     * Navigate to screen
     */
    navigate(screen, params = {}) {
        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { screen, params }
        }));
    }

    /**
     * Show notification
     */
    notify(message, type = 'info') {
        window.dispatchEvent(new CustomEvent('notify', {
            detail: { message, type }
        }));
    }

    /**
     * Update settings
     */
    async updateSettings(settings) {
        Object.assign(this.profile.settings, settings);
        await Database.saveProfile(this.profile);
        return this.profile.settings;
    }

    /**
     * Get user statistics
     */
    async getStatistics() {
        const sessions = await Database.getSessions(30);

        // Group by type
        const byType = {};
        for (const session of sessions) {
            if (!byType[session.type]) {
                byType[session.type] = { count: 0, totalMinutes: 0 };
            }
            byType[session.type].count++;
            byType[session.type].totalMinutes += (session.duration || 0) / 60000;
        }

        // Daily activity
        const dailyActivity = this.calculateDailyActivity(sessions);

        return {
            totalSessions: sessions.length,
            totalMinutes: this.profile.totalStudyMinutes,
            streak: this.profile.streak,
            longestStreak: this.profile.longestStreak || this.profile.streak,
            byType,
            dailyActivity,
            level: this.profile.levels.overall
        };
    }

    /**
     * Calculate daily activity for chart
     */
    calculateDailyActivity(sessions) {
        const activity = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            activity[key] = 0;
        }

        for (const session of sessions) {
            const date = new Date(session.timestamp).toISOString().split('T')[0];
            if (activity[date] !== undefined) {
                activity[date] += (session.duration || 0) / 60000;
            }
        }

        return Object.entries(activity).map(([date, minutes]) => ({
            date,
            minutes: Math.round(minutes)
        }));
    }

    /**
     * Export user data
     */
    async exportData() {
        return {
            profile: this.profile,
            vocabulary: await Database.getVocabulary(),
            grammar: await Database.getGrammarProgress(),
            errors: await Database.getErrorPatterns(),
            exportedAt: Date.now()
        };
    }
}

// Create and export app instance
const app = new App();

// Make available globally for HTML
window.EnglishMasterApp = app;

export default app;
