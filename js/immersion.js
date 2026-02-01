/**
 * Immersion module for content-based learning
 * Based on Webb & Rodgers (2009), Peters & Webb (2018)
 */

import Database from './database.js';
import AI from './ai.js';
import Vocabulary from './vocabulary.js';

class Immersion {
    constructor() {
        this.currentContent = null;
        this.watchSession = null;
    }

    // Content library by level
    static CONTENT_LIBRARY = {
        A1: [
            { id: 'peppa_pig', title: 'Peppa Pig', type: 'series', duration: 5 },
            { id: 'bluey', title: 'Bluey', type: 'series', duration: 7 },
            { id: 'finding_nemo', title: 'Finding Nemo', type: 'movie', duration: 100 },
            { id: 'paddington', title: 'Paddington', type: 'movie', duration: 95 }
        ],
        A2: [
            { id: 'extra_english', title: 'Extra English', type: 'series', duration: 25 },
            { id: 'simpsons', title: 'The Simpsons', type: 'series', duration: 22 },
            { id: 'young_sheldon', title: 'Young Sheldon', type: 'series', duration: 20 },
            { id: 'toy_story', title: 'Toy Story', type: 'movie', duration: 81 },
            { id: 'shrek', title: 'Shrek', type: 'movie', duration: 90 }
        ],
        B1: [
            { id: 'friends', title: 'Friends', type: 'series', duration: 22 },
            { id: 'himym', title: 'How I Met Your Mother', type: 'series', duration: 22 },
            { id: 'big_bang', title: 'Big Bang Theory', type: 'series', duration: 22 },
            { id: 'modern_family', title: 'Modern Family', type: 'series', duration: 22 },
            { id: 'forrest_gump', title: 'Forrest Gump', type: 'movie', duration: 142 }
        ],
        B2: [
            { id: 'the_office', title: 'The Office', type: 'series', duration: 22 },
            { id: 'stranger_things', title: 'Stranger Things', type: 'series', duration: 50 },
            { id: 'game_of_thrones', title: 'Game of Thrones', type: 'series', duration: 60 },
            { id: 'black_mirror', title: 'Black Mirror', type: 'series', duration: 60 },
            { id: 'the_crown', title: 'The Crown', type: 'series', duration: 58 }
        ],
        C1: [
            { id: 'sherlock', title: 'Sherlock', type: 'series', duration: 90 },
            { id: 'house_of_cards', title: 'House of Cards', type: 'series', duration: 50 },
            { id: 'peaky_blinders', title: 'Peaky Blinders', type: 'series', duration: 60 },
            { id: 'true_detective', title: 'True Detective', type: 'series', duration: 60 },
            { id: 'succession', title: 'Succession', type: 'series', duration: 60 }
        ]
    };

    // Question types with percentages
    static QUESTION_TYPES = {
        LITERAL: 0.30,       // Facts from plot
        INFERENTIAL: 0.30,   // Conclusions
        VOCABULARY: 0.30,    // Words from content
        VERIFICATION: 0.10   // Details that can't be guessed
    };

    /**
     * Get content recommendations for level
     */
    getRecommendations(level) {
        const content = Immersion.CONTENT_LIBRARY[level] || [];
        return content.map(c => ({
            ...c,
            levelMatch: level,
            recommendation: this.getRecommendationReason(c, level)
        }));
    }

    /**
     * Get recommendation reason
     */
    getRecommendationReason(content, level) {
        if (level === 'A1' || level === 'A2') {
            return 'Simple vocabulary and clear pronunciation';
        } else if (level === 'B1') {
            return 'Everyday conversations with some slang';
        } else if (level === 'B2') {
            return 'Complex plots and varied vocabulary';
        } else {
            return 'Advanced vocabulary and fast speech';
        }
    }

    /**
     * Start watching session
     */
    startWatchSession(contentId, level) {
        const content = this.findContent(contentId, level);
        if (!content) {
            return { success: false, message: 'Content not found' };
        }

        this.currentContent = content;
        this.watchSession = {
            contentId,
            level,
            startTime: Date.now(),
            pauseTime: 0,
            pauses: [],
            wordsNoted: [],
            completed: false
        };

        return {
            success: true,
            content,
            instructions: this.getWatchInstructions(level)
        };
    }

    /**
     * Find content in library
     */
    findContent(contentId, level) {
        for (const [lvl, contents] of Object.entries(Immersion.CONTENT_LIBRARY)) {
            const found = contents.find(c => c.id === contentId);
            if (found) return { ...found, level: lvl };
        }
        return null;
    }

    /**
     * Get watching instructions
     */
    getWatchInstructions(level) {
        return {
            subtitles: level === 'A1' || level === 'A2'
                ? 'Use English subtitles for support'
                : 'Try without subtitles first',
            noteWords: 'Note down unfamiliar words to add later',
            focus: 'Focus on understanding the main story',
            replay: 'Don\'t be afraid to replay confusing parts'
        };
    }

    /**
     * Note word during watching
     */
    noteWord(word) {
        if (!this.watchSession) return;

        this.watchSession.wordsNoted.push({
            word,
            timestamp: Date.now() - this.watchSession.startTime
        });
    }

    /**
     * Track pause
     */
    trackPause(start) {
        if (!this.watchSession) return;

        if (start) {
            this.watchSession.pauses.push({ start: Date.now() });
        } else {
            const lastPause = this.watchSession.pauses[this.watchSession.pauses.length - 1];
            if (lastPause && !lastPause.end) {
                lastPause.end = Date.now();
                this.watchSession.pauseTime += lastPause.end - lastPause.start;
            }
        }
    }

    /**
     * Complete watching and start quiz
     */
    async completeWatching() {
        if (!this.watchSession) return null;

        const totalTime = Date.now() - this.watchSession.startTime;
        const watchTime = totalTime - this.watchSession.pauseTime;
        const contentDuration = this.currentContent.duration * 60 * 1000;

        // Check if actually watched
        const watchRatio = watchTime / contentDuration;

        let status = 'completed';
        let message = '';

        if (watchRatio < 0.7) {
            status = 'suspicious';
            message = 'It seems you didn\'t finish watching. Would you like to continue or take a partial quiz?';
        }

        this.watchSession.watchTime = watchTime;
        this.watchSession.status = status;

        // Generate quiz questions
        const questions = await this.generateQuiz(
            this.currentContent,
            this.watchSession.level
        );

        return {
            status,
            message,
            watchTime,
            wordsNoted: this.watchSession.wordsNoted,
            questions
        };
    }

    /**
     * Generate quiz questions
     */
    async generateQuiz(content, level) {
        // In production, these would come from a database
        // For now, generate with AI or use templates

        const questionCount = 5;
        const questions = [];

        // Distribute by type
        const types = Object.entries(Immersion.QUESTION_TYPES);

        for (let i = 0; i < questionCount; i++) {
            const type = this.selectQuestionType(types);
            questions.push(this.generateQuestion(content, type, level));
        }

        return questions;
    }

    /**
     * Select question type based on distribution
     */
    selectQuestionType(types) {
        const random = Math.random();
        let cumulative = 0;

        for (const [type, probability] of types) {
            cumulative += probability;
            if (random <= cumulative) {
                return type;
            }
        }

        return 'LITERAL';
    }

    /**
     * Generate single question
     */
    generateQuestion(content, type, level) {
        // Template-based questions for each type
        const templates = {
            LITERAL: {
                question: `What happens in ${content.title}?`,
                type: 'literal',
                instruction: 'Choose the correct plot detail'
            },
            INFERENTIAL: {
                question: 'Why do you think the character did this?',
                type: 'inferential',
                instruction: 'Choose the best interpretation'
            },
            VOCABULARY: {
                question: 'What does this phrase mean in context?',
                type: 'vocabulary',
                instruction: 'Choose the correct meaning'
            },
            VERIFICATION: {
                question: 'What specific detail appeared?',
                type: 'verification',
                instruction: 'This tests if you actually watched'
            }
        };

        const template = templates[type] || templates.LITERAL;

        return {
            ...template,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A'
        };
    }

    /**
     * Submit quiz answers
     */
    async submitQuiz(answers) {
        const questions = this.watchSession.questions || [];
        let correct = 0;
        let verificationPassed = true;

        const results = questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctAnswer;
            if (isCorrect) correct++;

            // Check verification questions
            if (q.type === 'verification' && !isCorrect) {
                verificationPassed = false;
            }

            return {
                question: q.question,
                userAnswer: answers[i],
                correctAnswer: q.correctAnswer,
                correct: isCorrect,
                type: q.type
            };
        });

        const accuracy = questions.length > 0 ? correct / questions.length : 0;

        // Calculate effective minutes
        const effectiveMinutes = this.calculateEffectiveMinutes(
            this.watchSession.watchTime,
            accuracy,
            verificationPassed
        );

        // Add noted words to vocabulary
        for (const noted of this.watchSession.wordsNoted) {
            await Vocabulary.addWord(noted.word);
        }

        // Log session
        await Database.logSession({
            type: 'immersion',
            contentId: this.watchSession.contentId,
            level: this.watchSession.level,
            watchTime: this.watchSession.watchTime,
            effectiveMinutes,
            quizAccuracy: accuracy,
            verificationPassed,
            wordsAdded: this.watchSession.wordsNoted.length
        });

        return {
            results,
            accuracy,
            verificationPassed,
            effectiveMinutes,
            wordsAdded: this.watchSession.wordsNoted.length,
            feedback: this.getQuizFeedback(accuracy, verificationPassed)
        };
    }

    /**
     * Calculate effective immersion minutes
     */
    calculateEffectiveMinutes(watchTimeMs, accuracy, verificationPassed) {
        let baseMinutes = watchTimeMs / 60000;

        // Accuracy multiplier
        if (accuracy >= 0.8) {
            baseMinutes *= 1.2;
        } else if (accuracy < 0.5) {
            baseMinutes *= 0.6;
        }

        // Verification penalty
        if (!verificationPassed) {
            baseMinutes *= 0.5;
        }

        return Math.round(baseMinutes * 100) / 100;
    }

    /**
     * Get quiz feedback
     */
    getQuizFeedback(accuracy, verificationPassed) {
        if (!verificationPassed) {
            return {
                message: 'Some answers suggest you may not have watched the full content.',
                suggestion: 'Try watching more carefully next time.'
            };
        }

        if (accuracy >= 0.8) {
            return {
                message: 'Excellent comprehension!',
                suggestion: 'You\'re ready for more challenging content.'
            };
        } else if (accuracy >= 0.6) {
            return {
                message: 'Good understanding of the content.',
                suggestion: 'Review the parts you found difficult.'
            };
        } else {
            return {
                message: 'Keep practicing! Understanding comes with time.',
                suggestion: 'Try using subtitles or rewatching.'
            };
        }
    }

    /**
     * Get immersion statistics
     */
    async getStats() {
        const sessions = await Database.getSessions(30);
        const immersionSessions = sessions.filter(s => s.type === 'immersion');

        const totalMinutes = immersionSessions.reduce((sum, s) =>
            sum + (s.effectiveMinutes || 0), 0
        );

        const avgAccuracy = immersionSessions.length > 0
            ? immersionSessions.reduce((sum, s) => sum + (s.quizAccuracy || 0), 0) / immersionSessions.length
            : 0;

        return {
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60 * 10) / 10,
            sessionsCount: immersionSessions.length,
            avgAccuracy,
            weeklyGoal: 60, // minutes
            weeklyProgress: Math.min(100, (totalMinutes / 60) * 100)
        };
    }
}

export default new Immersion();
