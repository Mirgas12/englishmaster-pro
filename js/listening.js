/**
 * Listening module with updated hour requirements
 * Based on Cambridge English research
 */

import Database from './database.js';
import AI from './ai.js';

class Listening {
    constructor() {
        this.currentAudio = null;
        this.session = null;
    }

    // Hour requirements by level
    static HOUR_REQUIREMENTS = {
        A1: { active: 15, passive: 0, total: 15, accuracy: 0.55 },
        A2: { active: 40, passive: 20, total: 50, accuracy: 0.60 },
        B1: { active: 80, passive: 40, total: 100, accuracy: 0.65 },
        B2: { active: 120, passive: 60, total: 150, accuracy: 0.70 },
        C1: { active: 180, passive: 80, total: 220, accuracy: 0.75 }
    };

    // Session types with effectiveness multipliers
    static SESSION_TYPES = {
        GUIDED: { name: 'Guided Listening', multiplier: 1.0 },
        COMPREHENSION: { name: 'Comprehension', multiplier: 1.2 },
        DICTATION: { name: 'Dictation', multiplier: 1.3 },
        SPEED_TRAINING: { name: 'Speed Training', multiplier: 1.1 },
        PASSIVE: { name: 'Passive Immersion', multiplier: 0.5 }
    };

    /**
     * Start listening session
     */
    async startSession(audioId, type, level) {
        const audio = await this.loadAudio(audioId, level);
        if (!audio) {
            return { success: false, message: 'Audio not found' };
        }

        this.currentAudio = audio;
        this.session = {
            audioId,
            type,
            level,
            startTime: Date.now(),
            pauseTime: 0,
            replays: 0,
            answers: [],
            dictationText: ''
        };

        return {
            success: true,
            audio: {
                url: audio.url,
                duration: audio.duration,
                title: audio.title,
                transcript: type === 'GUIDED' ? audio.transcript : null
            },
            type: Listening.SESSION_TYPES[type]
        };
    }

    /**
     * Load audio content
     */
    async loadAudio(audioId, level) {
        try {
            const response = await fetch(`data/listening/${level}/${audioId}.json`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('Loading audio failed');
        }

        // Return sample for development
        return this.getSampleAudio(level);
    }

    /**
     * Get sample audio for level
     */
    getSampleAudio(level) {
        return {
            id: `sample_${level}`,
            title: `Sample Audio ${level}`,
            duration: 120, // 2 minutes
            level,
            transcript: 'This is a sample transcript for the audio.',
            questions: [
                {
                    id: 1,
                    question: 'What is the main topic?',
                    options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
                    correctAnswer: 'Topic A',
                    timestamp: 30
                }
            ]
        };
    }

    /**
     * Track audio playback
     */
    onPlaybackEvent(event) {
        switch (event.type) {
            case 'play':
                this.session.lastPlayTime = Date.now();
                break;
            case 'pause':
                if (this.session.lastPlayTime) {
                    this.session.pauseTime += Date.now() - this.session.lastPlayTime;
                }
                break;
            case 'replay':
                this.session.replays++;
                break;
            case 'seek':
                // Track seeking behavior
                break;
        }
    }

    /**
     * Complete listening session
     */
    async completeSession(answers = null, dictationText = null) {
        if (!this.session) return null;

        const endTime = Date.now();
        const totalTime = endTime - this.session.startTime;
        const activeTime = this.session.pauseTime || totalTime;

        // Calculate effective hours
        const effectiveMinutes = this.calculateEffectiveMinutes(
            activeTime,
            this.session.type,
            answers
        );

        let accuracy = 0;
        let results = [];

        // Check comprehension answers
        if (answers && this.currentAudio.questions) {
            const checked = this.checkAnswers(answers);
            accuracy = checked.accuracy;
            results = checked.results;
        }

        // Check dictation
        if (dictationText && this.session.type === 'DICTATION') {
            const dictationResult = this.checkDictation(dictationText, this.currentAudio.transcript);
            accuracy = dictationResult.accuracy;
        }

        // Log session
        const sessionLog = {
            type: 'listening',
            audioId: this.session.audioId,
            sessionType: this.session.type,
            level: this.session.level,
            duration: activeTime,
            effectiveMinutes,
            accuracy,
            replays: this.session.replays
        };

        await Database.logSession(sessionLog);

        // Update user listening hours
        await this.updateListeningHours(effectiveMinutes, this.session.type === 'PASSIVE');

        return {
            duration: activeTime,
            effectiveMinutes,
            accuracy,
            results,
            replays: this.session.replays,
            feedback: this.getFeedback(accuracy, this.session.type)
        };
    }

    /**
     * Calculate effective listening minutes
     */
    calculateEffectiveMinutes(activeTimeMs, type, answers) {
        let baseMinutes = activeTimeMs / 60000;
        const sessionType = Listening.SESSION_TYPES[type];

        // Apply type multiplier
        let effective = baseMinutes * sessionType.multiplier;

        // Apply accuracy multiplier if answers provided
        if (answers) {
            const accuracy = this.calculateAccuracy(answers);
            if (accuracy >= 0.8) {
                effective *= 1.1;
            } else if (accuracy < 0.5) {
                effective *= 0.7;
            }
        }

        return Math.round(effective * 100) / 100;
    }

    /**
     * Calculate accuracy from answers
     */
    calculateAccuracy(answers) {
        if (!this.currentAudio?.questions) return 0;

        const correct = this.currentAudio.questions.filter((q, i) =>
            answers[i] === q.correctAnswer
        ).length;

        return correct / this.currentAudio.questions.length;
    }

    /**
     * Check answers against correct ones
     */
    checkAnswers(answers) {
        const questions = this.currentAudio.questions || [];
        let correct = 0;

        const results = questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctAnswer;
            if (isCorrect) correct++;

            return {
                question: q.question,
                userAnswer: answers[i],
                correctAnswer: q.correctAnswer,
                correct: isCorrect
            };
        });

        return {
            results,
            correct,
            total: questions.length,
            accuracy: questions.length > 0 ? correct / questions.length : 0
        };
    }

    /**
     * Check dictation accuracy
     */
    checkDictation(userText, transcript) {
        const userWords = userText.toLowerCase().split(/\s+/).filter(w => w);
        const correctWords = transcript.toLowerCase().split(/\s+/).filter(w => w);

        let matches = 0;
        const errors = [];

        userWords.forEach((word, i) => {
            if (correctWords[i] && word === correctWords[i]) {
                matches++;
            } else if (correctWords[i]) {
                errors.push({
                    position: i,
                    typed: word,
                    correct: correctWords[i]
                });
            }
        });

        // Penalize missing words
        const missingCount = Math.max(0, correctWords.length - userWords.length);

        const accuracy = correctWords.length > 0
            ? matches / correctWords.length
            : 0;

        return {
            accuracy,
            matches,
            total: correctWords.length,
            errors,
            missingCount
        };
    }

    /**
     * Update user's listening hours
     */
    async updateListeningHours(minutes, isPassive = false) {
        const profile = await Database.getProfile();

        const hours = minutes / 60;

        if (isPassive) {
            profile.levels.listening.passiveHours += hours;
        } else {
            profile.levels.listening.activeHours += hours;
        }

        await Database.saveProfile(profile);
    }

    /**
     * Get listening progress
     */
    async getProgress() {
        const profile = await Database.getProfile();
        const listening = profile.levels.listening;

        const totalEffective = listening.activeHours + (listening.passiveHours * 0.5);

        // Determine current level based on hours
        let currentLevel = 'A1';
        for (const [level, req] of Object.entries(Listening.HOUR_REQUIREMENTS)) {
            if (totalEffective >= req.total) {
                currentLevel = level;
            }
        }

        const nextLevel = this.getNextLevel(currentLevel);
        const nextReq = Listening.HOUR_REQUIREMENTS[nextLevel];

        return {
            activeHours: listening.activeHours,
            passiveHours: listening.passiveHours,
            totalEffective,
            currentLevel,
            nextLevel,
            hoursToNext: nextReq ? nextReq.total - totalEffective : 0,
            avgAccuracy: listening.avgAccuracy
        };
    }

    /**
     * Get next CEFR level
     */
    getNextLevel(current) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const idx = levels.indexOf(current);
        return idx < levels.length - 1 ? levels[idx + 1] : 'C1';
    }

    /**
     * Get session feedback
     */
    getFeedback(accuracy, type) {
        let feedback = '';

        if (type === 'DICTATION') {
            if (accuracy >= 0.9) feedback = 'Excellent dictation accuracy!';
            else if (accuracy >= 0.7) feedback = 'Good dictation. Focus on the words you missed.';
            else feedback = 'Keep practicing. Try listening multiple times.';
        } else {
            if (accuracy >= 0.8) feedback = 'Great comprehension!';
            else if (accuracy >= 0.6) feedback = 'Good understanding. Review missed questions.';
            else feedback = 'Try listening again or choose easier content.';
        }

        return {
            message: feedback,
            suggestion: this.getSuggestion(accuracy, type)
        };
    }

    /**
     * Get improvement suggestion
     */
    getSuggestion(accuracy, type) {
        if (accuracy < 0.5) {
            return 'Try guided listening with transcript first.';
        } else if (accuracy < 0.7) {
            return 'Practice with slower audio or replay difficult parts.';
        } else {
            return 'Ready for more challenging content!';
        }
    }

    /**
     * Generate speed training session
     */
    createSpeedTraining(audioUrl, speeds = [0.75, 1.0, 1.25]) {
        return {
            type: 'SPEED_TRAINING',
            audioUrl,
            speeds,
            currentSpeedIndex: 0,
            instruction: 'Listen at each speed and try to understand everything.'
        };
    }

    /**
     * Text-to-speech for dictation practice
     */
    speakText(text, rate = 1.0) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = rate;
            speechSynthesis.speak(utterance);
        }
    }
}

export default new Listening();
