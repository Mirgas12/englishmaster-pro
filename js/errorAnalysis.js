/**
 * Error Analysis System
 * Tracks patterns and generates targeted practice
 */

import Database from './database.js';

class ErrorAnalysis {
    constructor() {
        this.patterns = null;
    }

    /**
     * Initialize error patterns
     */
    async init() {
        this.patterns = await Database.getErrorPatterns();
    }

    /**
     * Track grammar error
     */
    async trackGrammarError(category, context) {
        if (!this.patterns.grammar[category]) {
            this.patterns.grammar[category] = { count: 0, rate: 0, examples: [] };
        }

        const error = this.patterns.grammar[category];
        error.count++;
        error.examples.push({
            context,
            timestamp: Date.now()
        });

        // Keep only last 20 examples
        error.examples = error.examples.slice(-20);

        // Recalculate rate
        await this.updateRates();
        await Database.saveErrorPatterns(this.patterns);
    }

    /**
     * Track vocabulary confusion
     */
    async trackVocabConfusion(word1, word2) {
        const pair = [word1, word2].sort().join('|');

        const existing = this.patterns.vocabulary.confusedPairs.find(p =>
            p.words.sort().join('|') === pair
        );

        if (existing) {
            existing.mistakes++;
            existing.lastMistake = Date.now();
        } else {
            this.patterns.vocabulary.confusedPairs.push({
                words: [word1, word2],
                mistakes: 1,
                lastMistake: Date.now()
            });
        }

        await Database.saveErrorPatterns(this.patterns);
    }

    /**
     * Track pronunciation problem
     */
    async trackPronunciationError(sound, word, accuracy) {
        const existing = this.patterns.pronunciation.problematicSounds.find(p =>
            p.sound === sound
        );

        if (existing) {
            existing.attempts++;
            existing.accuracy = (existing.accuracy * (existing.attempts - 1) + accuracy) / existing.attempts;
            existing.words = [...new Set([...existing.words, word])].slice(-10);
        } else {
            this.patterns.pronunciation.problematicSounds.push({
                sound,
                accuracy,
                attempts: 1,
                words: [word]
            });
        }

        await Database.saveErrorPatterns(this.patterns);
    }

    /**
     * Track listening weak area
     */
    async trackListeningError(type, context) {
        const existing = this.patterns.listening.weakAreas.find(w =>
            w.type === type
        );

        if (existing) {
            existing.mistakes++;
            existing.accuracy = Math.max(0, existing.accuracy - 0.05);
        } else {
            this.patterns.listening.weakAreas.push({
                type,
                accuracy: 0.5,
                mistakes: 1
            });
        }

        await Database.saveErrorPatterns(this.patterns);
    }

    /**
     * Update error rates
     */
    async updateRates() {
        const totalGrammarErrors = Object.values(this.patterns.grammar)
            .reduce((sum, e) => sum + e.count, 0);

        for (const [category, data] of Object.entries(this.patterns.grammar)) {
            data.rate = totalGrammarErrors > 0
                ? data.count / totalGrammarErrors
                : 0;
        }
    }

    /**
     * Get top errors
     */
    getTopErrors(limit = 5) {
        // Grammar
        const grammarErrors = Object.entries(this.patterns.grammar)
            .sort((a, b) => b[1].rate - a[1].rate)
            .slice(0, limit)
            .map(([category, data]) => ({
                type: 'grammar',
                category,
                ...data
            }));

        // Vocabulary
        const vocabErrors = [...this.patterns.vocabulary.confusedPairs]
            .sort((a, b) => b.mistakes - a.mistakes)
            .slice(0, limit)
            .map(p => ({
                type: 'vocabulary',
                ...p
            }));

        // Pronunciation
        const pronErrors = [...this.patterns.pronunciation.problematicSounds]
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, limit)
            .map(p => ({
                type: 'pronunciation',
                ...p
            }));

        // Listening
        const listenErrors = [...this.patterns.listening.weakAreas]
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, limit)
            .map(w => ({
                type: 'listening',
                ...w
            }));

        return {
            grammar: grammarErrors,
            vocabulary: vocabErrors,
            pronunciation: pronErrors,
            listening: listenErrors
        };
    }

    /**
     * Get analysis dashboard data
     */
    getDashboard() {
        const topErrors = this.getTopErrors(3);

        // Get primary focus area
        const focusArea = this.determineFocusArea(topErrors);

        return {
            grammar: {
                topErrors: topErrors.grammar,
                totalErrors: Object.values(this.patterns.grammar)
                    .reduce((sum, e) => sum + e.count, 0)
            },
            vocabulary: {
                confusedPairs: topErrors.vocabulary,
                totalConfusions: this.patterns.vocabulary.confusedPairs
                    .reduce((sum, p) => sum + p.mistakes, 0)
            },
            pronunciation: {
                problematicSounds: topErrors.pronunciation,
                avgAccuracy: this.calculateAvgPronunciation()
            },
            listening: {
                weakAreas: topErrors.listening
            },
            recommendation: {
                focusArea,
                message: this.getRecommendationMessage(focusArea, topErrors)
            }
        };
    }

    /**
     * Calculate average pronunciation accuracy
     */
    calculateAvgPronunciation() {
        const sounds = this.patterns.pronunciation.problematicSounds;
        if (sounds.length === 0) return 1;

        return sounds.reduce((sum, s) => sum + s.accuracy, 0) / sounds.length;
    }

    /**
     * Determine primary focus area
     */
    determineFocusArea(topErrors) {
        // Simple heuristic - focus on area with worst metrics
        const scores = {
            grammar: topErrors.grammar.length > 0
                ? topErrors.grammar[0].rate
                : 0,
            vocabulary: topErrors.vocabulary.length > 0
                ? topErrors.vocabulary[0].mistakes / 10
                : 0,
            pronunciation: topErrors.pronunciation.length > 0
                ? 1 - topErrors.pronunciation[0].accuracy
                : 0,
            listening: topErrors.listening.length > 0
                ? 1 - topErrors.listening[0].accuracy
                : 0
        };

        const maxArea = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])[0];

        return maxArea[0];
    }

    /**
     * Get recommendation message
     */
    getRecommendationMessage(focusArea, topErrors) {
        switch (focusArea) {
            case 'grammar':
                const grammarError = topErrors.grammar[0];
                return grammarError
                    ? `Focus on ${this.formatCategory(grammarError.category)}. You make this error ${Math.round(grammarError.rate * 100)}% of the time.`
                    : 'Great grammar! Keep practicing.';

            case 'vocabulary':
                const vocabError = topErrors.vocabulary[0];
                return vocabError
                    ? `You often confuse "${vocabError.words[0]}" and "${vocabError.words[1]}". Practice these words!`
                    : 'Good vocabulary knowledge!';

            case 'pronunciation':
                const pronError = topErrors.pronunciation[0];
                return pronError
                    ? `Work on the ${pronError.sound} sound. Current accuracy: ${Math.round(pronError.accuracy * 100)}%.`
                    : 'Good pronunciation!';

            case 'listening':
                const listenError = topErrors.listening[0];
                return listenError
                    ? `Improve ${listenError.type} recognition in listening.`
                    : 'Good listening skills!';

            default:
                return 'Keep up the good work!';
        }
    }

    /**
     * Format grammar category
     */
    formatCategory(category) {
        return category
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Generate targeted practice based on errors
     */
    generateTargetedPractice() {
        const topErrors = this.getTopErrors(3);
        const practice = [];

        // Grammar exercises
        for (const error of topErrors.grammar) {
            practice.push({
                type: 'grammar',
                category: error.category,
                exercises: this.getGrammarExercises(error.category)
            });
        }

        // Vocabulary review
        for (const pair of topErrors.vocabulary) {
            practice.push({
                type: 'vocabulary',
                words: pair.words,
                exercises: this.getVocabExercises(pair.words)
            });
        }

        // Pronunciation drills
        for (const sound of topErrors.pronunciation) {
            practice.push({
                type: 'pronunciation',
                sound: sound.sound,
                words: sound.words,
                exercises: this.getPronunciationExercises(sound)
            });
        }

        return practice;
    }

    /**
     * Get grammar exercises for category
     */
    getGrammarExercises(category) {
        // Template exercises
        return [
            {
                type: 'fill_blank',
                instruction: `Practice ${this.formatCategory(category)}`,
                count: 5
            },
            {
                type: 'error_correction',
                instruction: 'Find and fix the error',
                count: 3
            }
        ];
    }

    /**
     * Get vocabulary exercises for confused words
     */
    getVocabExercises(words) {
        return [
            {
                type: 'definition_match',
                instruction: 'Match words to definitions',
                words
            },
            {
                type: 'sentence_completion',
                instruction: 'Choose the correct word',
                words
            }
        ];
    }

    /**
     * Get pronunciation exercises
     */
    getPronunciationExercises(soundData) {
        return [
            {
                type: 'minimal_pairs',
                sound: soundData.sound,
                instruction: 'Practice these similar sounds'
            },
            {
                type: 'word_drill',
                words: soundData.words,
                instruction: 'Practice these words'
            }
        ];
    }

    /**
     * Clear old error data
     */
    async clearOldData(daysToKeep = 90) {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

        // Clear old examples from grammar
        for (const category of Object.keys(this.patterns.grammar)) {
            this.patterns.grammar[category].examples =
                this.patterns.grammar[category].examples.filter(e =>
                    e.timestamp > cutoff
                );
        }

        await Database.saveErrorPatterns(this.patterns);
    }
}

export default new ErrorAnalysis();
