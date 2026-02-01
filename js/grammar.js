/**
 * Grammar module with Acquisition-Based learning
 * Based on Krashen's Input Hypothesis and Schmidt's Noticing Hypothesis
 * 7-Phase model: DISCOVER → UNDERSTAND → NOTICE → PRACTICE → PRODUCE → INPUT_FLOOD → REVIEW
 */

import Database from './database.js';
import SM2 from './sm2.js';
import ErrorAnalysis from './errorAnalysis.js';

class Grammar {
    constructor() {
        this.progress = {};
        this.currentTopic = null;
        this.currentPhase = null;
        this.currentTopicData = null;
        this.topicCache = {};
    }

    // Learning phases (Grammar Journey)
    static PHASES = {
        DISCOVER: 'discover',      // Read text, notice pattern
        UNDERSTAND: 'understand',  // Rule explanation
        NOTICE: 'notice',          // Consciousness-raising tasks
        PRACTICE: 'practice',      // Contextual exercises
        PRODUCE: 'produce',        // Write own sentences
        INPUT_FLOOD: 'input_flood', // Multiple texts with pattern
        REVIEW: 'review'           // Spaced repetition
    };

    // Phase order for navigation
    static PHASE_ORDER = ['discover', 'understand', 'notice', 'practice', 'produce', 'input_flood', 'review'];

    // Topics by level with correct file prefixes
    static TOPICS = {
        A1: [
            { id: 'a1_to_be', name: 'Verb To Be', name_ru: 'Глагол To Be' },
            { id: 'a1_present_simple', name: 'Present Simple', name_ru: 'Простое настоящее' },
            { id: 'a1_articles', name: 'Articles a/an/the', name_ru: 'Артикли a/an/the' },
            { id: 'a1_plurals', name: 'Plurals', name_ru: 'Множественное число' },
            { id: 'a1_there_is_are', name: 'There is/are', name_ru: 'There is/are' },
            { id: 'a1_can', name: 'Modal Can', name_ru: 'Модальный глагол Can' },
            { id: 'a1_prepositions_place', name: 'Prepositions of Place', name_ru: 'Предлоги места' },
            { id: 'a1_present_continuous', name: 'Present Continuous', name_ru: 'Настоящее длительное' },
            { id: 'a1_possessives', name: 'Possessives', name_ru: 'Притяжательные' },
            { id: 'a1_imperatives', name: 'Imperatives', name_ru: 'Повелительное наклонение' }
        ],
        A2: [
            { id: 'a2_past_simple_regular', name: 'Past Simple (Regular)', name_ru: 'Прошедшее простое (правильные)' },
            { id: 'a2_past_simple_irregular', name: 'Past Simple (Irregular)', name_ru: 'Прошедшее простое (неправильные)' },
            { id: 'a2_future_will', name: 'Future with Will', name_ru: 'Будущее с Will' },
            { id: 'a2_future_going_to', name: 'Going to', name_ru: 'Конструкция Going to' },
            { id: 'a2_comparatives', name: 'Comparatives', name_ru: 'Сравнительная степень' },
            { id: 'a2_superlatives', name: 'Superlatives', name_ru: 'Превосходная степень' },
            { id: 'a2_countable_uncountable', name: 'Countable/Uncountable', name_ru: 'Исчисляемые/неисчисляемые' },
            { id: 'a2_some_any', name: 'Some/Any/Much/Many', name_ru: 'Some/Any/Much/Many' },
            { id: 'a2_adverbs_frequency', name: 'Adverbs of Frequency', name_ru: 'Наречия частоты' },
            { id: 'a2_have_to', name: 'Have to/Must', name_ru: 'Have to/Must' },
            { id: 'a2_should', name: 'Should/Shouldn\'t', name_ru: 'Should/Shouldn\'t' },
            { id: 'a2_prepositions_time', name: 'Prepositions of Time', name_ru: 'Предлоги времени' },
            { id: 'a2_past_continuous', name: 'Past Continuous', name_ru: 'Прошедшее длительное' },
            { id: 'a2_first_conditional', name: 'First Conditional', name_ru: 'Первый тип условных' },
            { id: 'a2_used_to', name: 'Used to', name_ru: 'Конструкция Used to' }
        ],
        B1: [
            { id: 'b1_present_perfect_experience', name: 'Present Perfect (Experience)', name_ru: 'Present Perfect (опыт)' },
            { id: 'b1_present_perfect_recent', name: 'Present Perfect (Recent)', name_ru: 'Present Perfect (недавнее)' },
            { id: 'b1_present_perfect_unfinished', name: 'Present Perfect (Unfinished)', name_ru: 'Present Perfect (незавершённое)' },
            { id: 'b1_present_perfect_vs_past', name: 'Present Perfect vs Past Simple', name_ru: 'Present Perfect vs Past Simple' },
            { id: 'b1_present_perfect_continuous', name: 'Present Perfect Continuous', name_ru: 'Present Perfect Continuous' },
            { id: 'b1_second_conditional', name: 'Second Conditional', name_ru: 'Второй тип условных' },
            { id: 'b1_passive_present', name: 'Passive Voice (Present)', name_ru: 'Пассивный залог (наст.)' },
            { id: 'b1_passive_past', name: 'Passive Voice (Past)', name_ru: 'Пассивный залог (прош.)' },
            { id: 'b1_relative_defining', name: 'Defining Relative Clauses', name_ru: 'Определительные придаточные' },
            { id: 'b1_relative_non_defining', name: 'Non-defining Relative Clauses', name_ru: 'Неопределительные придаточные' },
            { id: 'b1_reported_speech_statements', name: 'Reported Speech (Statements)', name_ru: 'Косвенная речь (утверждения)' },
            { id: 'b1_reported_speech_questions', name: 'Reported Speech (Questions)', name_ru: 'Косвенная речь (вопросы)' },
            { id: 'b1_gerund_infinitive_basic', name: 'Gerund vs Infinitive', name_ru: 'Герундий vs Инфинитив' },
            { id: 'b1_modals_probability', name: 'Modals of Probability', name_ru: 'Модальные (вероятность)' },
            { id: 'b1_so_such', name: 'So/Such', name_ru: 'So/Such' },
            { id: 'b1_too_enough', name: 'Too/Enough', name_ru: 'Too/Enough' },
            { id: 'b1_question_tags', name: 'Question Tags', name_ru: 'Разделительные вопросы' },
            { id: 'b1_zero_conditional', name: 'Zero Conditional', name_ru: 'Нулевой тип условных' },
            { id: 'b1_phrasal_verbs_basic', name: 'Phrasal Verbs (Basic)', name_ru: 'Фразовые глаголы (базовые)' },
            { id: 'b1_wish_present', name: 'Wish (Present)', name_ru: 'Wish (настоящее)' }
        ],
        B2: [
            { id: 'b2_third_conditional', name: 'Third Conditional', name_ru: 'Третий тип условных' },
            { id: 'b2_mixed_conditionals', name: 'Mixed Conditionals', name_ru: 'Смешанные условные' },
            { id: 'b2_causative', name: 'Causative Have/Get', name_ru: 'Каузативные конструкции' },
            { id: 'b2_future_perfect', name: 'Future Perfect', name_ru: 'Future Perfect' },
            { id: 'b2_wish_past', name: 'Wish (Past)', name_ru: 'Wish (прошедшее)' },
            { id: 'b2_modals_past_deduction', name: 'Modals of Past Deduction', name_ru: 'Модальные (дедукция в прошлом)' },
            { id: 'b2_passive_advanced', name: 'Passive (Advanced)', name_ru: 'Пассивный залог (продвинутый)' },
            { id: 'b2_participle_clauses', name: 'Participle Clauses', name_ru: 'Причастные обороты' },
            { id: 'b2_inversion', name: 'Inversion (Basic)', name_ru: 'Инверсия (базовая)' },
            { id: 'b2_cleft_sentences', name: 'Cleft Sentences', name_ru: 'Расщеплённые предложения' },
            { id: 'b2_used_to_be_used_to', name: 'Used to vs Be Used to', name_ru: 'Used to vs Be Used to' },
            { id: 'b2_articles_advanced', name: 'Articles (Advanced)', name_ru: 'Артикли (продвинутый)' },
            { id: 'b2_comparisons_advanced', name: 'Comparisons (Advanced)', name_ru: 'Сравнения (продвинутые)' },
            { id: 'b2_discourse_markers', name: 'Discourse Markers', name_ru: 'Дискурсивные маркеры' },
            { id: 'b2_subjunctive', name: 'Subjunctive', name_ru: 'Сослагательное наклонение' },
            { id: 'b2_noun_clauses', name: 'Noun Clauses', name_ru: 'Существительные придаточные' },
            { id: 'b2_gerund_infinitive_advanced', name: 'Gerund/Infinitive (Advanced)', name_ru: 'Герундий/Инфинитив (продв.)' },
            { id: 'b2_reported_speech_advanced', name: 'Reported Speech (Advanced)', name_ru: 'Косвенная речь (продв.)' },
            { id: 'b2_emphasis_structures', name: 'Emphasis Structures', name_ru: 'Структуры усиления' },
            { id: 'b2_linking_words_advanced', name: 'Linking Words (Advanced)', name_ru: 'Связующие слова (продв.)' }
        ],
        C1: [
            { id: 'c1_inversion_advanced', name: 'Inversion (Advanced)', name_ru: 'Инверсия (продвинутая)' },
            { id: 'c1_subjunctive_advanced', name: 'Subjunctive (Advanced)', name_ru: 'Сослагательное (продв.)' },
            { id: 'c1_ellipsis_substitution', name: 'Ellipsis & Substitution', name_ru: 'Эллипсис и замещение' },
            { id: 'c1_nominalization', name: 'Nominalization', name_ru: 'Номинализация' },
            { id: 'c1_hedging_language', name: 'Hedging Language', name_ru: 'Язык смягчения' },
            { id: 'c1_complex_passives', name: 'Complex Passives', name_ru: 'Сложный пассив' },
            { id: 'c1_cleft_advanced', name: 'Cleft (Advanced)', name_ru: 'Расщепление (продв.)' },
            { id: 'c1_advanced_modality', name: 'Advanced Modality', name_ru: 'Продвинутая модальность' },
            { id: 'c1_cohesion_coherence', name: 'Cohesion & Coherence', name_ru: 'Когезия и связность' },
            { id: 'c1_mixed_conditionals_advanced', name: 'Mixed Conditionals (Advanced)', name_ru: 'Смешанные условные (продв.)' }
        ]
    };

    /**
     * Initialize grammar module
     */
    async init() {
        this.progress = await Database.getGrammarProgress();
    }

    /**
     * Get topics for level
     */
    getTopicsForLevel(level) {
        const topics = Grammar.TOPICS[level] || [];
        return topics.map(topic => ({
            ...topic,
            progress: this.getTopicProgress(topic.id),
            status: this.getTopicStatus(topic.id)
        }));
    }

    /**
     * Get topic status (new, in_progress, completed)
     */
    getTopicStatus(topicId) {
        const progress = this.progress[topicId];
        if (!progress || !progress.startedAt) return 'new';
        if (progress.completedAt) return 'completed';
        return 'in_progress';
    }

    /**
     * Get topic progress
     */
    getTopicProgress(topicId) {
        return this.progress[topicId] || {
            phases: {
                discover: false,
                understand: false,
                notice: false,
                practice: { completed: false, score: 0, attempts: 0 },
                produce: { completed: false, submissions: [] },
                input_flood: 0, // Count of texts read
                review: { cards: [], accuracy: 0, lastReview: null }
            },
            testScore: null,
            acquired: false,
            startedAt: null,
            completedAt: null
        };
    }

    /**
     * Start grammar journey for topic
     */
    async startTopic(topicId, level) {
        this.currentTopic = topicId;

        // Load topic data
        const topicData = await this.loadTopicData(topicId, level);
        if (!topicData) {
            return { success: false, message: 'Topic not found' };
        }

        this.currentTopicData = topicData;

        // Initialize progress if new
        if (!this.progress[topicId]) {
            this.progress[topicId] = this.getTopicProgress(topicId);
            this.progress[topicId].startedAt = Date.now();
            await Database.saveGrammarProgress(this.progress);
        }

        // Determine current phase
        const progress = this.progress[topicId];
        this.currentPhase = this.determineCurrentPhase(progress);

        return {
            success: true,
            topic: topicData,
            progress: progress,
            currentPhase: this.currentPhase,
            phaseContent: this.getPhaseContent(this.currentPhase)
        };
    }

    /**
     * Determine current phase based on progress
     */
    determineCurrentPhase(progress) {
        if (!progress.phases.discover) return Grammar.PHASES.DISCOVER;
        if (!progress.phases.understand) return Grammar.PHASES.UNDERSTAND;
        if (!progress.phases.notice) return Grammar.PHASES.NOTICE;
        if (!progress.phases.practice?.completed) return Grammar.PHASES.PRACTICE;
        if (!progress.phases.produce?.completed) return Grammar.PHASES.PRODUCE;
        if (progress.phases.input_flood < 5) return Grammar.PHASES.INPUT_FLOOD;
        return Grammar.PHASES.REVIEW;
    }

    /**
     * Get phase content from current topic data
     */
    getPhaseContent(phase) {
        if (!this.currentTopicData || !this.currentTopicData.phases) return null;
        return this.currentTopicData.phases[phase] || null;
    }

    /**
     * Navigate to specific phase
     */
    goToPhase(phase) {
        if (!Grammar.PHASE_ORDER.includes(phase)) return null;

        this.currentPhase = phase;
        return {
            phase,
            content: this.getPhaseContent(phase),
            progress: this.progress[this.currentTopic]
        };
    }

    /**
     * Load topic data from JSON files
     */
    async loadTopicData(topicId, level) {
        // Check cache first
        if (this.topicCache[topicId]) {
            return this.topicCache[topicId];
        }

        try {
            // Use correct path: data/grammar/A1/a1_present_simple.json
            const response = await fetch(`data/grammar/${level}/${topicId}.json`);
            if (response.ok) {
                const data = await response.json();
                this.topicCache[topicId] = data;
                return data;
            }
        } catch (e) {
            console.warn(`Loading topic data failed for ${topicId}:`, e);
        }

        // Return default structure if file not found
        return this.getDefaultTopicData(topicId, level);
    }

    /**
     * Get default topic data
     */
    getDefaultTopicData(topicId, level) {
        const topicInfo = this.findTopicInfo(topicId, level);
        const topicName = topicInfo?.name || topicId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return {
            id: topicId,
            level: level,
            title: topicName,
            title_ru: topicInfo?.name_ru || topicName,
            phases: {
                discover: {
                    type: 'text_with_highlights',
                    instruction: `Read the text and notice the highlighted ${topicName} structures.`,
                    instruction_ru: `Прочитайте текст и обратите внимание на выделенные структуры ${topicName}.`,
                    content: {
                        text: `This is a sample text demonstrating ${topicName}. Notice the patterns.`,
                        question: 'What patterns did you notice?',
                        question_ru: 'Какие закономерности вы заметили?'
                    }
                },
                understand: {
                    theory: {
                        title: `${topicName} - Form and Use`,
                        title_ru: `${topicName} - Форма и использование`,
                        points: [
                            {
                                rule: 'Rule explanation',
                                rule_ru: 'Объяснение правила',
                                example: 'Example sentence',
                                marker: 'key'
                            }
                        ]
                    }
                },
                notice: {
                    type: 'consciousness_raising',
                    instruction: `Find ALL ${topicName} examples in the text.`,
                    instruction_ru: `Найдите ВСЕ примеры ${topicName} в тексте.`,
                    tasks: []
                },
                practice: {
                    exercises: [],
                    total_exercises: 0,
                    pass_threshold: 0.7
                },
                produce: {
                    type: 'free_writing',
                    instruction: `Write 5 sentences using ${topicName}.`,
                    instruction_ru: `Напишите 5 предложений, используя ${topicName}.`,
                    prompts: []
                },
                input_flood: {
                    description: `Read 5 texts containing ${topicName}.`,
                    texts: []
                },
                review: {
                    grammar_cards: []
                }
            }
        };
    }

    /**
     * Find topic info by ID
     */
    findTopicInfo(topicId, level) {
        const topics = Grammar.TOPICS[level] || [];
        return topics.find(t => t.id === topicId);
    }

    /**
     * Complete phase
     */
    async completePhase(phase, data = {}) {
        if (!this.currentTopic) return { success: false };

        const progress = this.progress[this.currentTopic];

        switch (phase) {
            case Grammar.PHASES.DISCOVER:
            case Grammar.PHASES.UNDERSTAND:
            case Grammar.PHASES.NOTICE:
                progress.phases[phase] = true;
                break;

            case Grammar.PHASES.PRACTICE:
                progress.phases.practice = {
                    completed: data.score >= 0.7,
                    score: data.score || 0,
                    attempts: (progress.phases.practice?.attempts || 0) + 1
                };
                break;

            case Grammar.PHASES.PRODUCE:
                progress.phases.produce = {
                    completed: true,
                    submissions: [...(progress.phases.produce?.submissions || []), {
                        text: data.text,
                        feedback: data.feedback,
                        timestamp: Date.now()
                    }]
                };
                break;

            case Grammar.PHASES.INPUT_FLOOD:
                progress.phases.input_flood = (progress.phases.input_flood || 0) + 1;
                break;

            case Grammar.PHASES.REVIEW:
                progress.phases.review = {
                    ...progress.phases.review,
                    accuracy: data.accuracy || progress.phases.review?.accuracy || 0,
                    lastReview: Date.now()
                };
                break;
        }

        // Check if topic is completed
        if (this.isTopicCompleted(progress)) {
            progress.completedAt = Date.now();
            progress.acquired = progress.phases.review?.accuracy >= 0.8;
        }

        await Database.saveGrammarProgress(this.progress);

        // Move to next phase
        this.currentPhase = this.determineCurrentPhase(progress);

        return {
            success: true,
            progress,
            nextPhase: this.currentPhase,
            completed: progress.completedAt !== null,
            phaseContent: this.getPhaseContent(this.currentPhase)
        };
    }

    /**
     * Check if topic is completed
     */
    isTopicCompleted(progress) {
        return (
            progress.phases.discover &&
            progress.phases.understand &&
            progress.phases.notice &&
            progress.phases.practice?.completed &&
            progress.phases.produce?.completed &&
            progress.phases.input_flood >= 5
        );
    }

    /**
     * Submit practice exercise answer
     * Tracks errors through ErrorAnalysis for targeted practice
     */
    async submitPracticeAnswer(exerciseIndex, userAnswer) {
        if (!this.currentTopicData?.phases?.practice?.exercises) {
            return { correct: false, feedback: 'No exercise data' };
        }

        const exercise = this.currentTopicData.phases.practice.exercises[exerciseIndex];
        if (!exercise) {
            return { correct: false, feedback: 'Exercise not found' };
        }

        let isCorrect = false;
        let correctAnswer = '';

        switch (exercise.type) {
            case 'fill_gap_context':
            case 'fill_gap':
                isCorrect = userAnswer.toLowerCase().trim() === exercise.answer?.toLowerCase().trim();
                correctAnswer = exercise.answer;
                break;

            case 'choose_correct':
            case 'multiple_choice':
                isCorrect = userAnswer === exercise.correct;
                correctAnswer = exercise.options?.[exercise.correct];
                break;

            case 'error_correction':
                isCorrect = userAnswer.toLowerCase().trim() === exercise.correct?.toLowerCase().trim();
                correctAnswer = exercise.correct;
                break;
        }

        // Track error through ErrorAnalysis if incorrect
        if (!isCorrect && this.currentTopic) {
            try {
                await ErrorAnalysis.trackGrammarError(this.currentTopic, {
                    exerciseType: exercise.type,
                    userAnswer,
                    correctAnswer,
                    sentence: exercise.sentence || exercise.question || '',
                    topicId: this.currentTopic
                });
            } catch (e) {
                console.warn('Failed to track grammar error:', e);
            }
        }

        return {
            correct: isCorrect,
            correctAnswer,
            explanation: exercise.explanation || '',
            feedback: isCorrect ? 'Correct!' : `The correct answer is: ${correctAnswer}`
        };
    }

    /**
     * Get practice session for current topic
     */
    getPracticeSession() {
        if (!this.currentTopicData?.phases?.practice) return null;

        const practice = this.currentTopicData.phases.practice;
        const allExercises = [];

        // Flatten all exercise types
        if (practice.exercises) {
            for (const exercise of practice.exercises) {
                if (exercise.sentences) {
                    // Fill gap with multiple sentences
                    exercise.sentences.forEach((s, i) => {
                        allExercises.push({
                            ...s,
                            type: exercise.type,
                            index: allExercises.length
                        });
                    });
                } else if (exercise.questions) {
                    // Multiple choice questions
                    exercise.questions.forEach((q, i) => {
                        allExercises.push({
                            ...q,
                            type: exercise.type,
                            index: allExercises.length
                        });
                    });
                } else {
                    allExercises.push({
                        ...exercise,
                        index: allExercises.length
                    });
                }
            }
        }

        return {
            exercises: allExercises,
            total: allExercises.length,
            passThreshold: practice.pass_threshold || 0.7
        };
    }

    /**
     * Get input flood texts for current topic
     */
    getInputFloodTexts() {
        if (!this.currentTopicData?.phases?.input_flood?.texts) return [];
        return this.currentTopicData.phases.input_flood.texts;
    }

    /**
     * Get review cards for current topic
     */
    getReviewCards() {
        if (!this.currentTopicData?.phases?.review?.grammar_cards) return [];
        return this.currentTopicData.phases.review.grammar_cards;
    }

    /**
     * Create grammar card for review (SM-2)
     */
    createGrammarCard(topic, type, content) {
        return {
            topicId: topic,
            type,
            ...content,
            sm2: SM2.createCard(`grammar_${topic}_${Date.now()}`)
        };
    }

    /**
     * Get overall grammar stats
     */
    getStats() {
        const stats = {
            topicsStarted: 0,
            topicsCompleted: 0,
            acquisitionRate: 0,
            byLevel: {},
            totalTopics: 0
        };

        let totalAcquisition = 0;
        let topicsWithAcquisition = 0;

        // Count total topics
        for (const level of Object.keys(Grammar.TOPICS)) {
            stats.totalTopics += Grammar.TOPICS[level].length;
        }

        for (const [topicId, progress] of Object.entries(this.progress)) {
            if (progress.startedAt) stats.topicsStarted++;
            if (progress.completedAt) stats.topicsCompleted++;

            if (progress.phases.review?.accuracy) {
                totalAcquisition += progress.phases.review.accuracy;
                topicsWithAcquisition++;
            }
        }

        stats.acquisitionRate = topicsWithAcquisition > 0
            ? totalAcquisition / topicsWithAcquisition
            : 0;

        // Count by level
        for (const [level, topics] of Object.entries(Grammar.TOPICS)) {
            const topicIds = topics.map(t => t.id);
            stats.byLevel[level] = {
                total: topics.length,
                started: topicIds.filter(id => this.progress[id]?.startedAt).length,
                completed: topicIds.filter(id => this.progress[id]?.completedAt).length,
                percentage: topicIds.length > 0
                    ? (topicIds.filter(id => this.progress[id]?.completedAt).length / topicIds.length) * 100
                    : 0
            };
        }

        return stats;
    }

    /**
     * Get recommended next topic
     */
    getNextTopic(userLevel) {
        const levelTopics = Grammar.TOPICS[userLevel] || [];

        // Find first incomplete topic
        for (const topic of levelTopics) {
            const progress = this.progress[topic.id];
            if (!progress || !progress.completedAt) {
                return topic;
            }
        }

        // All completed at this level, try next level
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const currentIdx = levels.indexOf(userLevel);

        if (currentIdx < levels.length - 1) {
            const nextLevel = levels[currentIdx + 1];
            const nextLevelTopics = Grammar.TOPICS[nextLevel] || [];
            if (nextLevelTopics.length > 0) {
                return { ...nextLevelTopics[0], suggestedLevel: nextLevel };
            }
        }

        return null;
    }

    /**
     * Check level requirements
     */
    checkLevelRequirements(level) {
        const topics = Grammar.TOPICS[level] || [];
        const topicIds = topics.map(t => t.id);
        const completed = topicIds.filter(id => this.progress[id]?.completedAt).length;

        const requirements = {
            A1: { topics: 8, testAvg: 0.70, inputFlood: 3 },
            A2: { topics: 12, testAvg: 0.70, inputFlood: 5 },
            B1: { topics: 16, testAvg: 0.75, inputFlood: 5 },
            B2: { topics: 16, testAvg: 0.75, inputFlood: 5 },
            C1: { topics: 8, testAvg: 0.80, inputFlood: 5 }
        };

        const req = requirements[level] || requirements.A1;

        // Calculate average test score and input flood progress
        let totalScore = 0;
        let scoredTopics = 0;
        let totalInputFlood = 0;
        let inputFloodTopics = 0;

        for (const id of topicIds) {
            if (this.progress[id]?.phases?.practice?.score) {
                totalScore += this.progress[id].phases.practice.score;
                scoredTopics++;
            }
            // Track input flood progress
            const inputFloodCount = this.progress[id]?.phases?.input_flood || 0;
            if (inputFloodCount > 0) {
                totalInputFlood += inputFloodCount;
                inputFloodTopics++;
            }
        }

        const avgScore = scoredTopics > 0 ? totalScore / scoredTopics : 0;
        const avgInputFlood = inputFloodTopics > 0 ? totalInputFlood / inputFloodTopics : 0;

        // Check if input flood requirement is met (average texts read per topic)
        const inputFloodMet = avgInputFlood >= req.inputFlood;

        return {
            topicsCompleted: completed,
            topicsRequired: req.topics,
            topicsMet: completed >= req.topics,
            testAvg: avgScore,
            testAvgRequired: req.testAvg,
            testMet: avgScore >= req.testAvg,
            avgInputFlood: avgInputFlood,
            inputFloodRequired: req.inputFlood,
            inputFloodMet: inputFloodMet,
            allRequirementsMet: completed >= req.topics && avgScore >= req.testAvg && inputFloodMet
        };
    }

    /**
     * Get current topic and phase
     */
    getCurrentState() {
        return {
            topic: this.currentTopic,
            topicData: this.currentTopicData,
            phase: this.currentPhase,
            progress: this.currentTopic ? this.progress[this.currentTopic] : null
        };
    }
}

export default new Grammar();
