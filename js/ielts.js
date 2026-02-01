/**
 * IELTS Preparation and Simulation module
 */

import Database from './database.js';
import AI from './ai.js';
import Writing from './writing.js';
import Speaking from './speaking.js';

class IELTS {
    constructor() {
        this.currentTest = null;
        this.testSession = null;
    }

    // Test structure
    static TEST_STRUCTURE = {
        listening: { duration: 30, sections: 4, questions: 40 },
        reading: { duration: 60, passages: 3, questions: 40 },
        writing: { duration: 60, tasks: 2 },
        speaking: { duration: 14, parts: 3 }
    };

    // Band score descriptors
    static BAND_DESCRIPTORS = {
        9: 'Expert User',
        8: 'Very Good User',
        7: 'Good User',
        6: 'Competent User',
        5: 'Modest User',
        4: 'Limited User',
        3: 'Extremely Limited User',
        2: 'Intermittent User',
        1: 'Non User'
    };

    /**
     * Start full practice test
     */
    startFullTest() {
        this.testSession = {
            type: 'full',
            startTime: Date.now(),
            sections: {
                listening: { status: 'pending', score: null },
                reading: { status: 'pending', score: null },
                writing: { status: 'pending', score: null },
                speaking: { status: 'pending', score: null }
            },
            currentSection: null
        };

        return {
            structure: IELTS.TEST_STRUCTURE,
            estimatedDuration: '2 hours 45 minutes',
            sections: ['Listening', 'Reading', 'Writing', 'Speaking']
        };
    }

    /**
     * Start section practice
     */
    startSection(section) {
        const structure = IELTS.TEST_STRUCTURE[section];
        if (!structure) {
            return { success: false, message: 'Invalid section' };
        }

        this.currentTest = {
            section,
            startTime: Date.now(),
            timeLimit: structure.duration * 60 * 1000,
            answers: [],
            completed: false
        };

        return {
            success: true,
            section,
            timeLimit: structure.duration,
            instructions: this.getInstructions(section)
        };
    }

    /**
     * Get section instructions
     */
    getInstructions(section) {
        const instructions = {
            listening: `
                IELTS Listening Test
                • 4 sections, 40 questions
                • 30 minutes + 10 minutes transfer time
                • Audio plays ONCE only
                • Write answers on answer sheet
            `,
            reading: `
                IELTS Reading Test
                • 3 passages, 40 questions
                • 60 minutes total
                • Academic or General Training
                • No extra transfer time
            `,
            writing: `
                IELTS Writing Test
                • Task 1: 150 words (20 minutes)
                • Task 2: 250 words (40 minutes)
                • Task 2 is worth more marks
            `,
            speaking: `
                IELTS Speaking Test
                • Part 1: Introduction (4-5 minutes)
                • Part 2: Long turn (3-4 minutes)
                • Part 3: Discussion (4-5 minutes)
            `
        };

        return instructions[section] || '';
    }

    /**
     * Get remaining time
     */
    getRemainingTime() {
        if (!this.currentTest) return null;

        const elapsed = Date.now() - this.currentTest.startTime;
        const remaining = Math.max(0, this.currentTest.timeLimit - elapsed);

        return {
            remaining,
            minutes: Math.floor(remaining / 60000),
            seconds: Math.floor((remaining % 60000) / 1000),
            isOver: remaining <= 0
        };
    }

    /**
     * Submit section answers
     */
    async submitSection(answers, writingTexts = null) {
        if (!this.currentTest) return null;

        this.currentTest.endTime = Date.now();
        this.currentTest.answers = answers;

        let result;

        switch (this.currentTest.section) {
            case 'listening':
                result = await this.scoreListening(answers);
                break;
            case 'reading':
                result = await this.scoreReading(answers);
                break;
            case 'writing':
                result = await this.scoreWriting(writingTexts);
                break;
            case 'speaking':
                result = await this.scoreSpeaking(answers);
                break;
        }

        // Update session if full test
        if (this.testSession) {
            this.testSession.sections[this.currentTest.section] = {
                status: 'completed',
                score: result.band
            };
        }

        // Log result
        await Database.logSession({
            type: 'ielts',
            section: this.currentTest.section,
            band: result.band,
            duration: this.currentTest.endTime - this.currentTest.startTime,
            rawScore: result.rawScore
        });

        return result;
    }

    /**
     * Score listening section
     */
    async scoreListening(answers) {
        // In production, compare with correct answers from database
        const correctCount = this.simulateCorrectCount(answers.length);

        const band = this.listeningBandScore(correctCount);

        return {
            section: 'listening',
            rawScore: correctCount,
            total: 40,
            band,
            feedback: this.getListeningFeedback(band)
        };
    }

    /**
     * Convert listening raw score to band
     */
    listeningBandScore(correct) {
        if (correct >= 39) return 9.0;
        if (correct >= 37) return 8.5;
        if (correct >= 35) return 8.0;
        if (correct >= 32) return 7.5;
        if (correct >= 30) return 7.0;
        if (correct >= 26) return 6.5;
        if (correct >= 23) return 6.0;
        if (correct >= 18) return 5.5;
        if (correct >= 16) return 5.0;
        if (correct >= 13) return 4.5;
        if (correct >= 10) return 4.0;
        return 3.5;
    }

    /**
     * Score reading section
     */
    async scoreReading(answers) {
        const correctCount = this.simulateCorrectCount(answers.length);

        const band = this.readingBandScore(correctCount);

        return {
            section: 'reading',
            rawScore: correctCount,
            total: 40,
            band,
            feedback: this.getReadingFeedback(band)
        };
    }

    /**
     * Convert reading raw score to band
     */
    readingBandScore(correct) {
        if (correct >= 39) return 9.0;
        if (correct >= 37) return 8.5;
        if (correct >= 35) return 8.0;
        if (correct >= 33) return 7.5;
        if (correct >= 30) return 7.0;
        if (correct >= 27) return 6.5;
        if (correct >= 23) return 6.0;
        if (correct >= 19) return 5.5;
        if (correct >= 15) return 5.0;
        if (correct >= 13) return 4.5;
        if (correct >= 10) return 4.0;
        return 3.5;
    }

    /**
     * Score writing section
     */
    async scoreWriting(texts) {
        const task1Result = await Writing.submitForAssessment(texts.task1);
        const task2Result = await Writing.submitForAssessment(texts.task2);

        // Task 2 weighted more heavily (2/3)
        const overallBand = Math.round(
            (task1Result.overall * 1 + task2Result.overall * 2) / 3 * 2
        ) / 2;

        return {
            section: 'writing',
            task1: {
                band: task1Result.overall,
                range: task1Result.range,
                feedback: task1Result.feedback
            },
            task2: {
                band: task2Result.overall,
                range: task2Result.range,
                feedback: task2Result.feedback
            },
            band: overallBand,
            disclaimer: 'AI assessment. Real IELTS may differ by ±0.5-1.0 bands.'
        };
    }

    /**
     * Score speaking section
     */
    async scoreSpeaking(recordings) {
        // Simulated scoring - in production would use pronunciation API
        const avgScore = 5.5; // Placeholder

        return {
            section: 'speaking',
            band: avgScore,
            criteria: {
                fluency: 5.5,
                lexical: 5.5,
                grammar: 5.5,
                pronunciation: 5.5
            },
            disclaimer: 'AI assessment cannot fully evaluate speaking. Practice with real people for accurate assessment.'
        };
    }

    /**
     * Simulate correct count for demo
     */
    simulateCorrectCount(totalAnswers) {
        // Returns 60-80% correct for demo
        const rate = 0.6 + Math.random() * 0.2;
        return Math.round(totalAnswers * rate);
    }

    /**
     * Get full test prediction
     */
    async getPrediction() {
        const profile = await Database.getProfile();
        const sessions = await Database.getSessions(90);

        // Get recent IELTS practice scores
        const ieltsSessions = sessions.filter(s => s.type === 'ielts');

        const avgBySection = {};
        for (const section of ['listening', 'reading', 'writing', 'speaking']) {
            const sectionSessions = ieltsSessions.filter(s => s.section === section);
            avgBySection[section] = sectionSessions.length > 0
                ? sectionSessions.reduce((sum, s) => sum + s.band, 0) / sectionSessions.length
                : null;
        }

        // Calculate overall
        const validScores = Object.values(avgBySection).filter(s => s !== null);
        const overallPrediction = validScores.length >= 3
            ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length * 2) / 2
            : null;

        return {
            listening: avgBySection.listening,
            reading: avgBySection.reading,
            writing: avgBySection.writing,
            speaking: avgBySection.speaking,
            overall: overallPrediction,
            confidence: validScores.length >= 3 ? 'moderate' : 'low',
            disclaimer: 'Prediction may differ from actual IELTS by ±0.5-1.0 bands.',
            recommendations: this.getRecommendations(avgBySection)
        };
    }

    /**
     * Get improvement recommendations
     */
    getRecommendations(scores) {
        const recommendations = [];

        if (!scores.listening || scores.listening < 6.5) {
            recommendations.push({
                section: 'Listening',
                suggestion: 'Practice with various accents and faster speech'
            });
        }

        if (!scores.reading || scores.reading < 6.5) {
            recommendations.push({
                section: 'Reading',
                suggestion: 'Work on time management and skimming techniques'
            });
        }

        if (!scores.writing || scores.writing < 6.0) {
            recommendations.push({
                section: 'Writing',
                suggestion: 'Focus on task achievement and essay structure'
            });
        }

        if (!scores.speaking || scores.speaking < 6.0) {
            recommendations.push({
                section: 'Speaking',
                suggestion: 'Practice with real people for fluency improvement'
            });
        }

        return recommendations;
    }

    /**
     * Get listening feedback
     */
    getListeningFeedback(band) {
        if (band >= 7) return 'Strong listening skills. Focus on maintaining accuracy.';
        if (band >= 6) return 'Good comprehension. Work on detail questions.';
        if (band >= 5) return 'Basic understanding. Practice with various accents.';
        return 'Needs improvement. Start with slower, clearer audio.';
    }

    /**
     * Get reading feedback
     */
    getReadingFeedback(band) {
        if (band >= 7) return 'Strong reading skills. Focus on time management.';
        if (band >= 6) return 'Good comprehension. Practice inference questions.';
        if (band >= 5) return 'Developing skills. Work on vocabulary expansion.';
        return 'Needs improvement. Focus on basic comprehension.';
    }

    /**
     * Get study plan for target band
     */
    getStudyPlan(currentBand, targetBand) {
        const bandGap = targetBand - currentBand;

        if (bandGap <= 0) {
            return { message: 'You\'ve already reached your target!' };
        }

        const weeksNeeded = Math.ceil(bandGap * 8); // ~8 weeks per 0.5 band

        return {
            currentBand,
            targetBand,
            estimatedWeeks: weeksNeeded,
            weeklyPlan: {
                listening: '5 practice tests + daily listening',
                reading: '3 timed passages + vocabulary',
                writing: '2-3 essays with feedback',
                speaking: '2-3 mock tests + daily practice'
            },
            tips: [
                'Consistency is key - practice daily',
                'Focus on your weakest section',
                'Review mistakes carefully',
                'Time yourself during practice'
            ]
        };
    }
}

export default new IELTS();
