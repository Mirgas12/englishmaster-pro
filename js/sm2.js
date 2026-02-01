/**
 * SM-2 Spaced Repetition Algorithm
 * Based on Ebbinghaus 1885, Bahrick 1993
 */

const SM2 = {
    // Learning phase steps (in minutes)
    learningSteps: [1, 10],

    // Intervals after graduating from learning
    graduatingInterval: 1, // days
    easyInterval: 4,       // days

    // Ease factor bounds
    minEaseFactor: 1.3,
    maxEaseFactor: 3.0,
    defaultEaseFactor: 2.5,

    // Quality ratings
    AGAIN: 0,
    HARD: 1,
    GOOD: 2,
    EASY: 3,

    /**
     * Create a new card
     */
    createCard(wordId) {
        return {
            wordId,
            status: 'new', // new, learning, review, learned
            easeFactor: this.defaultEaseFactor,
            interval: 0,
            repetitions: 0,
            lapses: 0,
            learningStep: 0,
            nextReview: Date.now(),
            lastReview: null
        };
    },

    /**
     * Process user answer
     * @param {Object} card - Card object
     * @param {number} quality - 0=Again, 1=Hard, 2=Good, 3=Easy
     * @returns {Object} Updated card
     */
    processAnswer(card, quality) {
        card.lastReview = Date.now();

        if (card.status === 'new' || card.status === 'learning') {
            return this.processLearning(card, quality);
        } else {
            return this.processReview(card, quality);
        }
    },

    /**
     * Process learning phase card
     */
    processLearning(card, quality) {
        if (quality === this.AGAIN) {
            // Reset to first step
            card.learningStep = 0;
            card.nextReview = Date.now() + this.learningSteps[0] * 60 * 1000;
        } else if (quality === this.HARD) {
            // Stay at current step
            const stepMinutes = this.learningSteps[card.learningStep] || this.learningSteps[0];
            card.nextReview = Date.now() + stepMinutes * 60 * 1000;
        } else if (quality === this.GOOD) {
            // Advance to next step
            card.learningStep++;
            if (card.learningStep >= this.learningSteps.length) {
                // Graduate to review
                card.status = 'review';
                card.interval = this.graduatingInterval;
                card.nextReview = Date.now() + this.graduatingInterval * 24 * 60 * 60 * 1000;
            } else {
                card.nextReview = Date.now() + this.learningSteps[card.learningStep] * 60 * 1000;
            }
        } else if (quality === this.EASY) {
            // Graduate immediately with easy interval
            card.status = 'review';
            card.interval = this.easyInterval;
            card.easeFactor += 0.15;
            card.nextReview = Date.now() + this.easyInterval * 24 * 60 * 60 * 1000;
        }

        if (card.status !== 'new') {
            card.status = card.status === 'review' ? 'review' : 'learning';
        }

        return card;
    },

    /**
     * Process review phase card
     */
    processReview(card, quality) {
        if (quality === this.AGAIN) {
            // Lapse - back to learning
            card.lapses++;
            card.status = 'learning';
            card.learningStep = 0;
            card.easeFactor = Math.max(card.easeFactor - 0.2, this.minEaseFactor);
            card.nextReview = Date.now() + this.learningSteps[0] * 60 * 1000;
        } else {
            // Successful review
            card.repetitions++;

            // Update ease factor using SM-2 formula
            const q = quality + 2; // Convert to 2-5 scale
            card.easeFactor += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
            card.easeFactor = Math.max(this.minEaseFactor, Math.min(this.maxEaseFactor, card.easeFactor));

            // Calculate new interval
            if (quality === this.HARD) {
                card.interval = Math.round(card.interval * 1.2);
            } else if (quality === this.GOOD) {
                card.interval = Math.round(card.interval * card.easeFactor);
            } else if (quality === this.EASY) {
                card.interval = Math.round(card.interval * card.easeFactor * 1.3);
            }

            card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;

            // Check if learned
            if (card.interval >= 21) {
                card.status = 'learned';
            }
        }

        return card;
    },

    /**
     * Get cards due for review
     */
    getDueCards(cards, limit = 20) {
        const now = Date.now();
        return cards
            .filter(card => card.nextReview <= now)
            .sort((a, b) => a.nextReview - b.nextReview)
            .slice(0, limit);
    },

    /**
     * Get new cards to introduce
     */
    getNewCards(cards, limit = 10) {
        return cards
            .filter(card => card.status === 'new')
            .slice(0, limit);
    },

    /**
     * Calculate review forecast
     */
    getForecast(cards, days = 7) {
        const forecast = {};
        const now = Date.now();

        for (let i = 0; i < days; i++) {
            const dayStart = now + i * 24 * 60 * 60 * 1000;
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;

            forecast[i] = cards.filter(card =>
                card.nextReview >= dayStart && card.nextReview < dayEnd
            ).length;
        }

        return forecast;
    }
};

export default SM2;
