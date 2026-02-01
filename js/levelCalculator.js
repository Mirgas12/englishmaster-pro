/**
 * Level Calculator module
 * Determines CEFR levels and time to goals
 */

import Config from './config.js';
import Database from './database.js';

class LevelCalculator {
    /**
     * Calculate overall level from skill levels
     */
    calculateOverallLevel(skillLevels) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

        // Overall is the minimum of all skills
        let minIndex = levels.length - 1;

        for (const skill of Object.values(skillLevels)) {
            const level = skill.level || skill;
            const index = levels.indexOf(level);
            if (index >= 0 && index < minIndex) {
                minIndex = index;
            }
        }

        return levels[minIndex];
    }

    /**
     * Calculate vocabulary level
     */
    calculateVocabularyLevel(receptive, productive, spellingAccuracy) {
        const targets = Config.vocabularyTargets;

        for (const level of ['C1', 'B2', 'B1', 'A2', 'A1']) {
            const target = targets[level];
            if (
                receptive >= target.receptive &&
                productive >= target.productive &&
                spellingAccuracy >= target.spelling
            ) {
                return level;
            }
        }

        return 'A1';
    }

    /**
     * Calculate listening level
     */
    calculateListeningLevel(activeHours, passiveHours, avgAccuracy) {
        const requirements = Config.listeningHours;
        const totalEffective = activeHours + (passiveHours * 0.5);

        for (const level of ['C1', 'B2', 'B1', 'A2', 'A1']) {
            const req = requirements[level];
            if (totalEffective >= req.total) {
                return level;
            }
        }

        return 'A1';
    }

    /**
     * Calculate writing level
     */
    calculateWritingLevel(avgBand, textsCount) {
        const targets = Config.writingTargets;
        const minTexts = { A1: 5, A2: 10, B1: 20, B2: 30, C1: 40 };

        for (const level of ['C1', 'B2', 'B1', 'A2', 'A1']) {
            if (avgBand >= targets[level] && textsCount >= minTexts[level]) {
                return level;
            }
        }

        return 'A1';
    }

    /**
     * Calculate time to goal
     */
    async calculateTimeToGoal(targetLevel) {
        const profile = await Database.getProfile();
        const currentLevel = profile.levels.overall;

        const currentHours = Config.levelHours[currentLevel] || 0;
        const targetHours = Config.levelHours[targetLevel] || 0;
        const hoursNeeded = Math.max(0, targetHours - currentHours);

        // Get average daily study time
        const sessions = await Database.getSessions(30);
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0) / 60000, 0);
        const avgDailyMinutes = sessions.length > 0
            ? totalMinutes / 30
            : profile.dailyGoalMinutes;

        const avgDailyHours = avgDailyMinutes / 60;

        // Calculate efficiency coefficient
        const efficiency = this.calculateEfficiency(profile, sessions);

        // Effective hours per day
        const effectiveHoursPerDay = avgDailyHours * efficiency;

        // Days needed
        const daysNeeded = effectiveHoursPerDay > 0
            ? Math.ceil(hoursNeeded / effectiveHoursPerDay)
            : Infinity;

        // Estimated date
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);

        return {
            currentLevel,
            targetLevel,
            hoursNeeded,
            avgDailyMinutes: Math.round(avgDailyMinutes),
            efficiency: Math.round(efficiency * 100),
            daysNeeded,
            estimatedDate: daysNeeded < Infinity ? estimatedDate : null,
            confidence: this.calculateConfidence(sessions, profile)
        };
    }

    /**
     * Calculate efficiency coefficient
     */
    calculateEfficiency(profile, sessions) {
        let coef = 0.85; // Base coefficient (app vs classroom)

        // Immersion bonus
        const immersionMinutes = this.calculateWeeklyImmersion(sessions);
        if (immersionMinutes >= 60) coef += 0.10;
        if (immersionMinutes >= 180) coef += 0.05;

        // Productive vocab ratio
        const vocabSessions = sessions.filter(s => s.type === 'vocabulary');
        const productiveSessions = vocabSessions.filter(s =>
            s.mode === 'productive' || s.mode === 'spelling'
        );
        const productiveRatio = vocabSessions.length > 0
            ? productiveSessions.length / vocabSessions.length
            : 0;
        if (productiveRatio >= 0.4) coef += 0.05;

        // External speaking practice
        if (profile.settings?.hasExternalSpeaking) coef += 0.10;

        // Streak bonus
        if (profile.streak > 30) coef += 0.05;

        return Math.min(coef, 1.20);
    }

    /**
     * Calculate weekly immersion minutes
     */
    calculateWeeklyImmersion(sessions) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentImmersion = sessions.filter(s =>
            s.type === 'immersion' && s.timestamp > weekAgo
        );

        return recentImmersion.reduce((sum, s) =>
            sum + (s.effectiveMinutes || 0), 0
        );
    }

    /**
     * Calculate confidence in prediction
     */
    calculateConfidence(sessions, profile) {
        // More data = higher confidence
        let confidence = 'low';

        if (sessions.length >= 30 && profile.totalStudyMinutes > 1000) {
            confidence = 'high';
        } else if (sessions.length >= 14 && profile.totalStudyMinutes > 300) {
            confidence = 'moderate';
        }

        return confidence;
    }

    /**
     * Check if level up test is recommended
     */
    async checkLevelUpRecommended() {
        const profile = await Database.getProfile();

        // Check each skill
        const recommendations = [];

        // Vocabulary
        const vocabLevel = this.calculateVocabularyLevel(
            profile.levels.vocabulary.receptive,
            profile.levels.vocabulary.productive,
            profile.levels.vocabulary.spelling || 0.7
        );
        if (this.isHigherLevel(vocabLevel, profile.levels.vocabulary.level)) {
            recommendations.push({
                skill: 'vocabulary',
                currentLevel: profile.levels.vocabulary.level,
                potentialLevel: vocabLevel
            });
        }

        // Check overall readiness
        if (recommendations.length >= 2) {
            return {
                recommended: true,
                message: 'Your progress suggests you may be ready for a level assessment!',
                skills: recommendations
            };
        }

        return { recommended: false };
    }

    /**
     * Check if level A is higher than level B
     */
    isHigherLevel(levelA, levelB) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        return levels.indexOf(levelA) > levels.indexOf(levelB);
    }

    /**
     * Get progress breakdown by skill
     */
    async getProgressBreakdown() {
        const profile = await Database.getProfile();
        const levels = profile.levels;

        return {
            overall: {
                level: levels.overall,
                progress: this.calculateProgressToNext(levels.overall)
            },
            vocabulary: {
                level: levels.vocabulary.level,
                receptive: levels.vocabulary.receptive,
                productive: levels.vocabulary.productive,
                gap: levels.vocabulary.receptive - levels.vocabulary.productive
            },
            grammar: {
                level: levels.grammar.level,
                topicsCompleted: levels.grammar.topicsCompleted,
                acquisition: levels.grammar.acquisition
            },
            reading: {
                level: levels.reading.level,
                avgAccuracy: levels.reading.avgAccuracy,
                avgWPM: levels.reading.avgWPM
            },
            listening: {
                level: levels.listening.level,
                activeHours: levels.listening.activeHours,
                passiveHours: levels.listening.passiveHours,
                totalEffective: levels.listening.activeHours +
                    (levels.listening.passiveHours * 0.5)
            },
            writing: {
                level: levels.writing.level,
                avgBand: levels.writing.avgBand,
                textsCount: levels.writing.textsCount
            },
            speaking: {
                level: levels.speaking.level,
                avgScore: levels.speaking.avgScore,
                needsExternalPractice: levels.speaking.needsExternalPractice
            }
        };
    }

    /**
     * Calculate progress percentage to next level
     */
    calculateProgressToNext(currentLevel) {
        // Simplified progress calculation
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const currentIndex = levelOrder.indexOf(currentLevel);

        if (currentIndex >= levelOrder.length - 1) {
            return 100; // Already at highest level
        }

        // Would need actual progress tracking for accurate percentage
        return 50; // Placeholder
    }
}

export default new LevelCalculator();
