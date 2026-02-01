/**
 * Vocabulary module with Dual-Mode learning
 * Based on Webb (2005, 2009) research on receptive vs productive learning
 */

import Database from './database.js';
import SM2 from './sm2.js';
import AI from './ai.js';

class Vocabulary {
    constructor() {
        this.cards = [];
        this.starterPacks = {};  // Loaded starter pack data by level
        this.currentSession = {
            mode: null,
            cards: [],
            currentIndex: 0,
            results: []
        };
    }

    // Learning modes
    static MODES = {
        RECEPTIVE: 'receptive',      // EN → RU
        PRODUCTIVE: 'productive',    // RU → EN
        DEFINITION: 'definition',    // Definition → Word
        SENTENCE: 'sentence',        // Fill in blank
        TIMED: 'timed',             // Timed recall
        SPELLING: 'spelling'         // Audio → Write
    };

    // CEFR Levels
    static LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

    /**
     * Initialize vocabulary module
     */
    async init() {
        this.cards = await Database.getVocabulary();
        await this.loadStarterPacks();
    }

    /**
     * Load starter pack vocabulary from JSON files
     */
    async loadStarterPacks() {
        for (const level of Vocabulary.LEVELS) {
            try {
                const response = await fetch(`data/vocabulary/${level.toLowerCase()}_vocabulary.json`);
                if (response.ok) {
                    const data = await response.json();
                    this.starterPacks[level] = data;
                }
            } catch (error) {
                console.warn(`Failed to load vocabulary pack for ${level}:`, error);
            }
        }
    }

    /**
     * Get starter pack for level
     */
    getStarterPack(level) {
        return this.starterPacks[level] || null;
    }

    /**
     * Get categories from starter pack
     */
    getCategories(level) {
        const pack = this.starterPacks[level];
        if (!pack || !pack.categories) return [];
        return pack.categories.map(cat => ({
            name: cat.name,
            name_ru: cat.name_ru,
            wordCount: cat.words.length
        }));
    }

    /**
     * Add starter pack words to user vocabulary
     */
    async addFromStarterPack(level, categoryName = null) {
        const pack = this.starterPacks[level];
        if (!pack) return { success: false, message: 'Pack not found' };

        let wordsToAdd = [];

        if (categoryName) {
            const category = pack.categories.find(c => c.name === categoryName);
            if (category) {
                wordsToAdd = category.words;
            }
        } else {
            // Add all words from all categories
            wordsToAdd = pack.categories.flatMap(c => c.words);
        }

        let added = 0;
        let skipped = 0;

        for (const wordData of wordsToAdd) {
            // Check if already exists
            if (this.cards.find(c => c.word.toLowerCase() === wordData.word.toLowerCase())) {
                skipped++;
                continue;
            }

            const card = this.createCard({
                word: wordData.word,
                translation_ru: wordData.translation,
                phonetic: wordData.phonetic,
                examples: wordData.example ? [wordData.example] : [],
                level: level
            });

            this.cards.push(card);
            await Database.saveVocabularyCard(card);
            added++;
        }

        return {
            success: true,
            added,
            skipped,
            message: `Добавлено ${added} слов${skipped > 0 ? `, пропущено ${skipped} (уже есть)` : ''}`
        };
    }

    /**
     * Get words for flashcard session from a specific category
     */
    getWordsForSession(level, categoryName = null, limit = 20) {
        const pack = this.starterPacks[level];
        if (!pack) return [];

        let words = [];

        if (categoryName) {
            const category = pack.categories.find(c => c.name === categoryName);
            if (category) {
                words = category.words;
            }
        } else {
            words = pack.categories.flatMap(c => c.words);
        }

        // Shuffle and limit
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit).map(w => ({
            word: w.word,
            translation: w.translation,
            phonetic: w.phonetic,
            example: w.example,
            level: level
        }));
    }

    /**
     * Create new vocabulary card
     */
    createCard(wordData) {
        return {
            word: wordData.word,
            transcription: wordData.phonetic || '',
            translation: wordData.translation_ru || '',
            definition: wordData.definition || '',
            examples: wordData.examples || [],
            collocations: wordData.collocations || [],
            level: wordData.level || 'B1',
            frequency: wordData.frequency || 5000,
            audio: wordData.audio || '',

            // SM-2 data for each mode
            receptive: SM2.createCard(wordData.word + '_receptive'),
            productive: SM2.createCard(wordData.word + '_productive'),

            // Spelling tracking
            spelling: {
                accuracy: 0,
                attempts: [],
                lastScore: null
            },

            // Pronunciation tracking
            pronunciation: {
                lastScore: null,
                problematicSounds: []
            },

            addedAt: Date.now()
        };
    }

    /**
     * Add word to vocabulary
     */
    async addWord(word) {
        // Check if already exists
        if (this.cards.find(c => c.word.toLowerCase() === word.toLowerCase())) {
            return { success: false, message: 'Word already in vocabulary' };
        }

        // Get word info from AI/Dictionary
        const wordInfo = await AI.getWordInfo(word);
        if (!wordInfo) {
            return { success: false, message: 'Word not found' };
        }

        const card = this.createCard(wordInfo);
        this.cards.push(card);
        await Database.saveVocabularyCard(card);

        return { success: true, card };
    }

    /**
     * Start learning session
     */
    startSession(mode, limit = 20) {
        const dueCards = this.getDueCards(mode);
        const newCards = this.getNewCards(limit - Math.min(dueCards.length, limit));

        this.currentSession = {
            mode,
            cards: [...dueCards.slice(0, limit), ...newCards].slice(0, limit),
            currentIndex: 0,
            results: [],
            startTime: Date.now()
        };

        // Shuffle cards
        this.shuffleArray(this.currentSession.cards);

        return this.currentSession;
    }

    /**
     * Get cards due for review
     */
    getDueCards(mode) {
        const now = Date.now();
        const modeKey = mode === Vocabulary.MODES.RECEPTIVE ? 'receptive' : 'productive';

        return this.cards
            .filter(card => card[modeKey].nextReview <= now)
            .sort((a, b) => a[modeKey].nextReview - b[modeKey].nextReview);
    }

    /**
     * Get new cards
     */
    getNewCards(limit) {
        return this.cards
            .filter(card => card.receptive.status === 'new')
            .slice(0, limit);
    }

    /**
     * Get current card in session
     */
    getCurrentCard() {
        if (!this.currentSession.cards.length) return null;
        return this.currentSession.cards[this.currentSession.currentIndex];
    }

    /**
     * Render card based on mode
     */
    renderCard(card, mode, showAnswer = false) {
        switch (mode) {
            case Vocabulary.MODES.RECEPTIVE:
                return this.renderReceptiveCard(card, showAnswer);
            case Vocabulary.MODES.PRODUCTIVE:
                return this.renderProductiveCard(card, showAnswer);
            case Vocabulary.MODES.DEFINITION:
                return this.renderDefinitionCard(card, showAnswer);
            case Vocabulary.MODES.SENTENCE:
                return this.renderSentenceCard(card, showAnswer);
            case Vocabulary.MODES.TIMED:
                return this.renderTimedCard(card, showAnswer);
            case Vocabulary.MODES.SPELLING:
                return this.renderSpellingCard(card, showAnswer);
            default:
                return this.renderReceptiveCard(card, showAnswer);
        }
    }

    /**
     * Receptive mode: EN → RU
     */
    renderReceptiveCard(card, showAnswer) {
        return {
            front: {
                word: card.word,
                transcription: card.transcription,
                audio: card.audio,
                prompt: 'What does this word mean?'
            },
            back: showAnswer ? {
                translation: card.translation,
                definition: card.definition,
                examples: card.examples.slice(0, 2)
            } : null
        };
    }

    /**
     * Productive mode: RU → EN
     */
    renderProductiveCard(card, showAnswer) {
        return {
            front: {
                translation: card.translation,
                prompt: 'How do you say this in English?'
            },
            back: showAnswer ? {
                word: card.word,
                transcription: card.transcription,
                audio: card.audio,
                examples: card.examples.slice(0, 2)
            } : null
        };
    }

    /**
     * Definition mode: EN definition → Word
     */
    renderDefinitionCard(card, showAnswer) {
        const hint = card.word[0] + '_'.repeat(card.word.length - 2) + card.word[card.word.length - 1];

        return {
            front: {
                definition: card.definition,
                hint: hint,
                prompt: 'What word is this?'
            },
            back: showAnswer ? {
                word: card.word,
                transcription: card.transcription
            } : null
        };
    }

    /**
     * Sentence completion mode
     */
    renderSentenceCard(card, showAnswer) {
        const example = card.examples[0] || `Use the word "${card.word}" in a sentence.`;
        const blankedSentence = example.replace(
            new RegExp(card.word, 'gi'),
            '_'.repeat(card.word.length)
        );

        return {
            front: {
                sentence: blankedSentence,
                translation: card.translation,
                prompt: 'Fill in the blank'
            },
            back: showAnswer ? {
                word: card.word,
                fullSentence: example
            } : null,
            inputRequired: true
        };
    }

    /**
     * Timed recall mode
     */
    renderTimedCard(card, showAnswer) {
        return {
            front: {
                translation: card.translation,
                timeLimit: 5, // seconds
                prompt: 'Quick! Type the English word'
            },
            back: showAnswer ? {
                word: card.word,
                transcription: card.transcription
            } : null,
            inputRequired: true,
            timed: true
        };
    }

    /**
     * Spelling mode
     */
    renderSpellingCard(card, showAnswer) {
        return {
            front: {
                audio: card.audio,
                transcription: card.transcription,
                prompt: 'Listen and type the word'
            },
            back: showAnswer ? {
                word: card.word,
                translation: card.translation
            } : null,
            inputRequired: true,
            audioRequired: true
        };
    }

    /**
     * Process answer
     */
    async processAnswer(quality, userInput = null) {
        const card = this.getCurrentCard();
        if (!card) return null;

        const mode = this.currentSession.mode;
        const modeKey = mode === Vocabulary.MODES.RECEPTIVE ? 'receptive' : 'productive';

        // Update SM-2 data
        card[modeKey] = SM2.processAnswer(card[modeKey], quality);

        // Track spelling if input provided
        if (userInput && (mode === Vocabulary.MODES.SPELLING || mode === Vocabulary.MODES.SENTENCE)) {
            const isCorrect = this.checkSpelling(userInput, card.word);
            card.spelling.attempts.push(isCorrect);
            card.spelling.attempts = card.spelling.attempts.slice(-10); // Keep last 10
            card.spelling.accuracy = card.spelling.attempts.filter(Boolean).length / card.spelling.attempts.length;
        }

        // Save card
        await Database.saveVocabularyCard(card);

        // Track result
        this.currentSession.results.push({
            word: card.word,
            quality,
            mode,
            timestamp: Date.now()
        });

        // Move to next card
        this.currentSession.currentIndex++;

        return {
            finished: this.currentSession.currentIndex >= this.currentSession.cards.length,
            progress: this.currentSession.currentIndex / this.currentSession.cards.length,
            nextCard: this.getCurrentCard()
        };
    }

    /**
     * Check spelling with fuzzy matching
     */
    checkSpelling(input, correct) {
        const normalizedInput = input.toLowerCase().trim();
        const normalizedCorrect = correct.toLowerCase().trim();

        return normalizedInput === normalizedCorrect;
    }

    /**
     * Get session summary
     */
    getSessionSummary() {
        const results = this.currentSession.results;
        const duration = Date.now() - this.currentSession.startTime;

        const correct = results.filter(r => r.quality >= 2).length;
        const total = results.length;

        return {
            mode: this.currentSession.mode,
            total,
            correct,
            accuracy: total > 0 ? correct / total : 0,
            duration,
            averageTime: total > 0 ? duration / total : 0,
            reviewed: results.map(r => r.word)
        };
    }

    /**
     * Get vocabulary statistics
     */
    getStats() {
        const stats = {
            total: this.cards.length,
            receptive: {
                new: 0,
                learning: 0,
                review: 0,
                learned: 0
            },
            productive: {
                new: 0,
                learning: 0,
                review: 0,
                learned: 0
            },
            fullyLearned: 0,
            avgSpellingAccuracy: 0
        };

        let spellingSum = 0;
        let spellingCount = 0;

        for (const card of this.cards) {
            stats.receptive[card.receptive.status]++;
            stats.productive[card.productive.status]++;

            if (this.isWordFullyLearned(card)) {
                stats.fullyLearned++;
            }

            if (card.spelling.attempts.length > 0) {
                spellingSum += card.spelling.accuracy;
                spellingCount++;
            }
        }

        stats.avgSpellingAccuracy = spellingCount > 0 ? spellingSum / spellingCount : 0;

        return stats;
    }

    /**
     * Check if word is fully learned
     */
    isWordFullyLearned(card) {
        return (
            card.receptive.interval >= 21 &&
            card.productive.interval >= 14 &&
            card.spelling.accuracy >= 0.80
        );
    }

    /**
     * Get receptive-productive gap
     */
    getGap() {
        const stats = this.getStats();
        const receptiveLearned = stats.receptive.learned + stats.receptive.review;
        const productiveLearned = stats.productive.learned + stats.productive.review;

        return {
            receptive: receptiveLearned,
            productive: productiveLearned,
            gap: receptiveLearned - productiveLearned,
            recommendation: receptiveLearned > productiveLearned * 1.5
                ? 'Add more productive (RU→EN) practice to activate passive vocabulary!'
                : 'Good balance between receptive and productive learning.'
        };
    }

    /**
     * Get due count for today
     */
    getDueCounts() {
        const now = Date.now();
        const endOfDay = new Date().setHours(23, 59, 59, 999);

        return {
            receptive: this.cards.filter(c => c.receptive.nextReview <= endOfDay).length,
            productive: this.cards.filter(c => c.productive.nextReview <= endOfDay).length,
            overdue: {
                receptive: this.cards.filter(c => c.receptive.nextReview < now).length,
                productive: this.cards.filter(c => c.productive.nextReview < now).length
            }
        };
    }

    /**
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Play word audio using Web Speech API
     */
    playAudio(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }
}

export default new Vocabulary();
