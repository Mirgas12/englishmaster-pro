/**
 * Speaking module with Honest Assessment
 * Includes disclaimer about app limitations for B2+
 */

import Database from './database.js';
import AI from './ai.js';

class Speaking {
    constructor() {
        this.recognition = null;
        this.currentSession = null;
        this.isListening = false;
    }

    // Disclaimer for users (REQUIRED)
    static DISCLAIMER = {
        title: 'Important Information',
        message: `Speaking practice in this app provides 60-70% of the effect of live conversation with a native speaker.

For B2+ Speaking, you NEED practice with real people:

• Tandem (free) - Language exchange
• HelloTalk (free) - Language exchange
• italki (paid) - Online tutors
• Cambly (paid) - Native speakers

This app helps with pronunciation and fluency basics, but cannot replace human interaction for advanced speaking skills.`
    };

    // Practice modes
    static MODES = {
        PRONUNCIATION: 'pronunciation',  // Individual sounds, words
        SHADOWING: 'shadowing',          // Listen and repeat
        CONVERSATION: 'conversation',    // AI conversation
        IELTS_SIMULATION: 'ielts'       // IELTS speaking parts
    };

    // Target scores by level
    static SCORE_TARGETS = {
        A1: 3.0, A2: 4.0, B1: 5.0, B2: 6.0, C1: 7.0
    };

    /**
     * Initialize speech recognition
     */
    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onerror = (event) => this.handleError(event);
            this.recognition.onend = () => this.handleEnd();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onerror = (event) => this.handleError(event);
            this.recognition.onend = () => this.handleEnd();
        }

        return !!this.recognition;
    }

    /**
     * Show disclaimer (REQUIRED before starting)
     */
    getDisclaimer() {
        return Speaking.DISCLAIMER;
    }

    /**
     * Start speaking session
     */
    startSession(mode, level, options = {}) {
        this.currentSession = {
            mode,
            level,
            startTime: Date.now(),
            attempts: [],
            scores: [],
            ...options
        };

        // Check if external practice is needed
        const needsExternal = ['B2', 'C1'].includes(level);

        return {
            mode,
            disclaimer: needsExternal ? Speaking.DISCLAIMER : null,
            needsExternalPractice: needsExternal,
            recommendations: needsExternal ? this.getExternalRecommendations() : null
        };
    }

    /**
     * Get external practice recommendations
     */
    getExternalRecommendations() {
        return [
            { name: 'Tandem', type: 'free', description: 'Language exchange with native speakers' },
            { name: 'HelloTalk', type: 'free', description: 'Chat and voice messages with learners' },
            { name: 'italki', type: 'paid', description: 'Professional online tutors' },
            { name: 'Cambly', type: 'paid', description: '24/7 access to native speakers' }
        ];
    }

    /**
     * Start pronunciation drill
     */
    startPronunciationDrill(words) {
        this.currentSession.drillWords = words;
        this.currentSession.currentWordIndex = 0;
        this.currentSession.results = [];

        return {
            word: words[0],
            total: words.length,
            current: 1
        };
    }

    /**
     * Start listening for speech
     */
    startListening(targetText = null) {
        if (!this.recognition) {
            return { success: false, message: 'Speech recognition not available' };
        }

        this.currentSession.targetText = targetText;
        this.isListening = true;

        try {
            this.recognition.start();
            return { success: true, listening: true };
        } catch (e) {
            return { success: false, message: 'Failed to start recognition' };
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Handle speech recognition result
     */
    handleResult(event) {
        let transcript = '';
        let confidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            confidence = event.results[i][0].confidence;
        }

        if (event.results[event.results.length - 1].isFinal) {
            this.processTranscript(transcript, confidence);
        }

        // Emit interim result
        if (this.onInterimResult) {
            this.onInterimResult(transcript);
        }
    }

    /**
     * Process final transcript
     */
    processTranscript(transcript, confidence) {
        const target = this.currentSession.targetText;

        if (confidence < 0.6) {
            // Low confidence - offer retry
            if (this.onLowConfidence) {
                this.onLowConfidence({
                    transcript,
                    confidence,
                    options: ['retry', 'skip', 'self_assess']
                });
            }
            return;
        }

        // Calculate pronunciation score
        const score = this.calculatePronunciationScore(transcript, target);

        // Add to session results
        this.currentSession.attempts.push({
            transcript,
            target,
            confidence,
            score,
            timestamp: Date.now()
        });

        if (this.onResult) {
            this.onResult({
                transcript,
                target,
                score,
                feedback: this.generateFeedback(transcript, target, score)
            });
        }
    }

    /**
     * Calculate pronunciation score
     */
    calculatePronunciationScore(transcript, target) {
        if (!target) return { overall: 0, accuracy: 0, completeness: 0, matchedWords: 0, totalWords: 0 };

        const spoken = transcript.toLowerCase().trim();
        const expected = target.toLowerCase().trim();

        // Word accuracy
        const spokenWords = spoken.split(/\s+/);
        const expectedWords = expected.split(/\s+/);

        let matchedWords = 0;
        expectedWords.forEach((word, i) => {
            if (spokenWords[i] === word) matchedWords++;
        });

        const accuracy = expectedWords.length > 0
            ? (matchedWords / expectedWords.length) * 100
            : 0;

        // Completeness
        const completeness = Math.min(100,
            (spokenWords.length / expectedWords.length) * 100
        );

        return {
            overall: Math.round((accuracy + completeness) / 2),
            accuracy: Math.round(accuracy),
            completeness: Math.round(completeness),
            matchedWords,
            totalWords: expectedWords.length
        };
    }

    /**
     * Generate pronunciation feedback
     */
    generateFeedback(transcript, target, score) {
        const feedback = {
            score: score.overall,
            message: '',
            details: []
        };

        if (score.overall >= 90) {
            feedback.message = 'Excellent pronunciation!';
        } else if (score.overall >= 70) {
            feedback.message = 'Good pronunciation. Minor improvements possible.';
        } else if (score.overall >= 50) {
            feedback.message = 'Understandable, but needs practice.';
        } else {
            feedback.message = 'Keep practicing. Focus on individual sounds.';
        }

        // Find problematic words
        if (target) {
            const spokenWords = transcript.toLowerCase().split(/\s+/);
            const expectedWords = target.toLowerCase().split(/\s+/);

            expectedWords.forEach((word, i) => {
                if (spokenWords[i] !== word) {
                    feedback.details.push({
                        expected: word,
                        heard: spokenWords[i] || '(not heard)',
                        position: i + 1
                    });
                }
            });
        }

        return feedback;
    }

    /**
     * Handle speech recognition error
     */
    handleError(event) {
        this.isListening = false;

        if (this.onError) {
            this.onError({
                type: event.error,
                message: this.getErrorMessage(event.error)
            });
        }
    }

    /**
     * Get error message
     */
    getErrorMessage(errorType) {
        const messages = {
            'no-speech': 'No speech detected. Please try again.',
            'audio-capture': 'Microphone not available.',
            'not-allowed': 'Microphone permission denied.',
            'network': 'Network error. Check connection.',
            'aborted': 'Recognition aborted.',
            'language-not-supported': 'Language not supported.'
        };
        return messages[errorType] || 'Recognition error. Please retry.';
    }

    /**
     * Handle recognition end
     */
    handleEnd() {
        this.isListening = false;

        if (this.onEnd) {
            this.onEnd();
        }
    }

    /**
     * Start AI conversation
     */
    async startConversation(topic, level) {
        this.currentSession.conversationMode = true;
        this.currentSession.topic = topic;
        this.currentSession.history = [];

        // Get initial AI message
        const initialMessage = await AI.generateConversation(
            topic,
            '',
            level
        );

        this.currentSession.history.push({
            role: 'ai',
            text: initialMessage,
            timestamp: Date.now()
        });

        return {
            aiMessage: initialMessage,
            disclaimer: 'This is AI conversation practice. It cannot fully replace real human interaction.'
        };
    }

    /**
     * Continue conversation
     */
    async continueConversation(userMessage) {
        if (!this.currentSession.conversationMode) return null;

        this.currentSession.history.push({
            role: 'user',
            text: userMessage,
            timestamp: Date.now()
        });

        const context = this.currentSession.history
            .map(h => `${h.role}: ${h.text}`)
            .join('\n');

        const aiResponse = await AI.generateConversation(
            this.currentSession.topic,
            userMessage,
            this.currentSession.level
        );

        this.currentSession.history.push({
            role: 'ai',
            text: aiResponse,
            timestamp: Date.now()
        });

        return {
            aiMessage: aiResponse,
            history: this.currentSession.history
        };
    }

    /**
     * End session and get summary
     */
    async endSession() {
        if (!this.currentSession) return null;

        const duration = Date.now() - this.currentSession.startTime;
        const attempts = this.currentSession.attempts;

        // Calculate averages
        const avgScore = attempts.length > 0
            ? attempts.reduce((sum, a) => sum + (a.score?.overall || 0), 0) / attempts.length
            : 0;

        // Log session
        await Database.logSession({
            type: 'speaking',
            mode: this.currentSession.mode,
            level: this.currentSession.level,
            duration,
            attempts: attempts.length,
            avgScore
        });

        // Update profile
        await this.updateSpeakingProfile(avgScore);

        const needsExternal = ['B2', 'C1'].includes(this.currentSession.level);

        return {
            duration,
            totalAttempts: attempts.length,
            avgScore: Math.round(avgScore),
            needsExternalPractice: needsExternal,
            recommendations: needsExternal ? this.getExternalRecommendations() : null,
            feedback: this.getSessionFeedback(avgScore)
        };
    }

    /**
     * Get session feedback
     */
    getSessionFeedback(avgScore) {
        if (avgScore >= 80) {
            return 'Great speaking practice! Keep up the good work.';
        } else if (avgScore >= 60) {
            return 'Good progress. Focus on words you found difficult.';
        } else {
            return 'Keep practicing. Consider slower, more careful pronunciation.';
        }
    }

    /**
     * Update speaking profile
     */
    async updateSpeakingProfile(score) {
        const profile = await Database.getProfile();

        const speaking = profile.levels.speaking;
        speaking.sessionsCount = (speaking.sessionsCount || 0) + 1;

        // Calculate running average
        const prevTotal = (speaking.avgScore || 0) * ((speaking.sessionsCount || 1) - 1);
        speaking.avgScore = (prevTotal + score) / speaking.sessionsCount;

        // Check if external practice needed
        speaking.needsExternalPractice = speaking.level !== 'A1' && speaking.level !== 'A2';

        await Database.saveProfile(profile);
    }

    /**
     * Play text with TTS
     */
    speak(text, rate = 1.0) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = rate;
            speechSynthesis.speak(utterance);
        }
    }

    /**
     * Get pronunciation drills by level
     */
    getPronunciationDrills(level) {
        const drills = {
            A1: {
                sounds: ['th', 'r', 'l', 'w', 'v'],
                words: ['the', 'this', 'think', 'right', 'left', 'water', 'very']
            },
            A2: {
                sounds: ['th', 'r', 'l', 'schwa'],
                words: ['although', 'through', 'really', 'comfortable', 'different']
            },
            B1: {
                minimalPairs: [
                    ['ship', 'sheep'], ['bad', 'bed'], ['cut', 'cat'],
                    ['pull', 'pool'], ['this', 'these']
                ],
                wordStress: ['photograph', 'photographer', 'photographic']
            },
            B2: {
                connectedSpeech: [
                    'What do you think?',
                    'I would have gone.',
                    'Could you tell me?'
                ],
                intonation: [
                    { text: 'You\'re coming?', pattern: 'rising' },
                    { text: 'You\'re coming.', pattern: 'falling' }
                ]
            }
        };

        return drills[level] || drills.A1;
    }
}

export default new Speaking();
