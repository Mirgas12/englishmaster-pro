/**
 * Reading module with Comprehensible Input (i+1)
 * Based on Krashen's Input Hypothesis
 */

import Database from './database.js';
import AI from './ai.js';
import Vocabulary from './vocabulary.js';

class Reading {
    constructor() {
        this.currentText = null;
        this.readingSession = null;
    }

    // Text parameters by level (Krashen's i+1)
    static LEVEL_PARAMS = {
        A1: { words: [80, 120], vocabCoverage: 0.95, fleschGrade: [2, 3] },
        A2: { words: [150, 250], vocabCoverage: 0.90, fleschGrade: [4, 5] },
        B1: { words: [300, 450], vocabCoverage: 0.85, fleschGrade: [6, 7] },
        B2: { words: [500, 700], vocabCoverage: 0.80, fleschGrade: [8, 10] },
        C1: { words: [700, 1000], vocabCoverage: 0.75, fleschGrade: [11, 14] }
    };

    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validate text against LEVEL_PARAMS
     */
    validateTextForLevel(text, level) {
        const params = Reading.LEVEL_PARAMS[level];
        if (!params) return { valid: true, warnings: [] };

        const warnings = [];
        const wordCount = text.text ? text.text.split(/\s+/).filter(w => w.trim()).length : 0;
        const fleschGrade = this.calculateFleschKincaid(text.text || '');

        // Check word count
        if (wordCount < params.words[0]) {
            warnings.push(`Text is shorter than recommended (${wordCount} < ${params.words[0]} words)`);
        } else if (wordCount > params.words[1]) {
            warnings.push(`Text is longer than recommended (${wordCount} > ${params.words[1]} words)`);
        }

        // Check Flesch-Kincaid grade
        if (fleschGrade < params.fleschGrade[0]) {
            warnings.push(`Text may be too simple for ${level} (grade ${fleschGrade})`);
        } else if (fleschGrade > params.fleschGrade[1]) {
            warnings.push(`Text may be too complex for ${level} (grade ${fleschGrade})`);
        }

        return {
            valid: warnings.length === 0,
            warnings,
            stats: {
                wordCount,
                fleschGrade,
                expectedWords: params.words,
                expectedGrade: params.fleschGrade
            }
        };
    }

    /**
     * Start reading session
     */
    async startSession(textId, level) {
        const text = await this.loadText(textId, level);
        if (!text) {
            return { success: false, message: 'Text not found' };
        }

        // Validate text against level parameters
        const validation = this.validateTextForLevel(text, level);

        this.currentText = text;
        this.readingSession = {
            textId,
            level,
            startTime: Date.now(),
            wordsRead: 0,
            tappedWords: [],
            addedToVocab: [],
            validation
        };

        return {
            success: true,
            text: this.renderText(text),
            questions: text.questions,
            validation // Include validation info for UI
        };
    }

    /**
     * Load text from data files
     */
    async loadText(textId, level) {
        try {
            const response = await fetch(`data/reading/${level}/${textId}.json`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('Loading text failed');
        }

        // Return sample text for development
        return this.getSampleText(level);
    }

    /**
     * Get sample text for level
     */
    getSampleText(level) {
        const samples = {
            A1: {
                id: 'sample_a1',
                title: 'My Day',
                text: 'I wake up at 7 o\'clock. I eat breakfast. I drink coffee. I go to work. I work from 9 to 5. I come home. I eat dinner. I watch TV. I go to bed at 10.',
                wordCount: 40,
                level: 'A1'
            },
            A2: {
                id: 'sample_a2',
                title: 'The Weather',
                text: 'Today the weather is beautiful. The sun is shining and the sky is blue. It is warm but not too hot. I decided to go for a walk in the park. I saw many people there. Some were running, others were having a picnic. I sat on a bench and read my book.',
                wordCount: 55,
                level: 'A2'
            },
            B1: {
                id: 'sample_b1',
                title: 'Technology',
                text: 'Technology has changed our lives dramatically over the past few decades. Smartphones have become essential tools that we use every day for communication, entertainment, and work. However, some experts worry that we spend too much time looking at screens. Studies have shown that excessive screen time can affect our sleep quality and mental health. Finding a balance between using technology and spending time offline is important for our wellbeing.',
                wordCount: 75,
                level: 'B1'
            }
        };

        return samples[level] || samples.A1;
    }

    /**
     * Render text with tap-to-translate capability
     * Includes XSS protection for all content
     */
    renderText(text) {
        const words = text.text.split(/(\s+)/);
        const rendered = words.map((word, index) => {
            if (/^\s+$/.test(word)) return word;

            // Escape HTML to prevent XSS
            const escapedWord = this.escapeHtml(word);
            const cleanWord = word.replace(/[.,!?;:'"]/g, '');
            const escapedCleanWord = this.escapeHtml(cleanWord);

            return {
                id: index,
                display: escapedWord,
                word: escapedCleanWord,
                tappable: true
            };
        });

        return {
            title: this.escapeHtml(text.title || ''),
            content: rendered,
            wordCount: text.wordCount || words.filter(w => !/^\s+$/.test(w)).length,
            level: text.level
        };
    }

    /**
     * Handle word tap
     */
    async onWordTap(word) {
        this.readingSession.tappedWords.push({
            word,
            timestamp: Date.now()
        });

        // Get word info
        const wordInfo = await AI.getWordInfo(word);

        return {
            word,
            info: wordInfo,
            canAdd: !Vocabulary.cards.find(c => c.word.toLowerCase() === word.toLowerCase())
        };
    }

    /**
     * Add tapped word to vocabulary
     */
    async addWordToVocab(word) {
        const result = await Vocabulary.addWord(word);
        if (result.success) {
            this.readingSession.addedToVocab.push(word);
        }
        return result;
    }

    /**
     * Complete reading and show questions
     */
    async completeReading() {
        if (!this.readingSession) return null;

        const duration = Date.now() - this.readingSession.startTime;
        const wordCount = this.currentText.wordCount || 100;

        // Calculate WPM
        const wpm = Math.round((wordCount / duration) * 60000);

        this.readingSession.duration = duration;
        this.readingSession.wpm = wpm;

        // Generate comprehension questions if not already present
        let questions = this.currentText.questions;
        if (!questions || questions.length === 0) {
            questions = await AI.generateQuestions(
                this.currentText.text,
                5,
                this.currentText.level
            );
        }

        return {
            wpm,
            duration,
            tappedWords: this.readingSession.tappedWords.length,
            addedWords: this.readingSession.addedToVocab.length,
            questions
        };
    }

    /**
     * Submit comprehension answers
     */
    async submitAnswers(answers) {
        const questions = this.currentText.questions || [];
        let correct = 0;

        const results = questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.correctAnswer;
            if (isCorrect) correct++;

            return {
                question: q.question,
                userAnswer,
                correctAnswer: q.correctAnswer,
                correct: isCorrect,
                explanation: q.explanation
            };
        });

        const accuracy = questions.length > 0 ? correct / questions.length : 0;

        // Log session
        await Database.logSession({
            type: 'reading',
            textId: this.readingSession.textId,
            level: this.readingSession.level,
            duration: this.readingSession.duration,
            wpm: this.readingSession.wpm,
            accuracy,
            wordsAdded: this.readingSession.addedToVocab.length
        });

        return {
            results,
            total: questions.length,
            correct,
            accuracy,
            summary: this.getSessionSummary(accuracy)
        };
    }

    /**
     * Get session summary with feedback
     */
    getSessionSummary(accuracy) {
        const wpm = this.readingSession.wpm;

        let speedFeedback;
        if (wpm < 100) {
            speedFeedback = 'Your reading speed is developing. Keep practicing!';
        } else if (wpm < 150) {
            speedFeedback = 'Good reading speed for your level.';
        } else if (wpm < 200) {
            speedFeedback = 'Excellent reading speed!';
        } else {
            speedFeedback = 'Very fast reader! Make sure you understand everything.';
        }

        let accuracyFeedback;
        if (accuracy < 0.5) {
            accuracyFeedback = 'Try reading more carefully or choose easier texts.';
        } else if (accuracy < 0.7) {
            accuracyFeedback = 'Good understanding. Some details were missed.';
        } else if (accuracy < 0.9) {
            accuracyFeedback = 'Great comprehension!';
        } else {
            accuracyFeedback = 'Excellent! You understood everything perfectly.';
        }

        return {
            speedFeedback,
            accuracyFeedback,
            recommendation: this.getRecommendation(accuracy, wpm)
        };
    }

    /**
     * Get reading recommendation
     */
    getRecommendation(accuracy, wpm) {
        if (accuracy >= 0.85 && wpm >= 150) {
            return 'Ready for harder texts!';
        } else if (accuracy < 0.6) {
            return 'Consider easier texts for better comprehension.';
        } else {
            return 'Good progress! Continue with similar difficulty.';
        }
    }

    /**
     * Get texts for grammar input flood
     */
    async getInputFloodTexts(grammarTopic, level, count = 5) {
        // In production, fetch from backend
        // For now, return placeholder
        return Array(count).fill(null).map((_, i) => ({
            id: `flood_${grammarTopic}_${i}`,
            title: `Practice Text ${i + 1}`,
            text: `This is a practice text for ${grammarTopic}.`,
            grammarHighlight: grammarTopic,
            level
        }));
    }

    /**
     * Calculate Flesch-Kincaid grade level
     */
    calculateFleschKincaid(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        const words = text.split(/\s+/).filter(w => w.trim());
        const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

        if (sentences.length === 0 || words.length === 0) return 0;

        const grade = 0.39 * (words.length / sentences.length) +
            11.8 * (syllables / words.length) - 15.59;

        return Math.max(0, Math.round(grade * 10) / 10);
    }

    /**
     * Count syllables in word (approximation)
     */
    countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length <= 3) return 1;

        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');

        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
}

export default new Reading();
