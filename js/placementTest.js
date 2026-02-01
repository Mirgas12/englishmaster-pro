/**
 * Placement Test module
 * Adaptive testing to determine initial level
 * Uses question banks from data/placement/*.json
 */

import Database from './database.js';

class PlacementTest {
    constructor() {
        this.testSession = null;
        this.questionBanks = {};
        this.isLoaded = false;
    }

    // Test configuration
    static CONFIG = {
        minQuestions: 50,
        maxQuestions: 70,
        timeLimit: 35, // minutes
        sections: ['grammar', 'vocabulary', 'reading', 'listening_simulation'],
        adaptiveThreshold: 0.7, // Move up if accuracy > 70%
        moveDownThreshold: 0.4, // Move down if accuracy < 40%
        stabilityWindow: 10 // Questions to check for level stability
    };

    // Certificate conversion
    static CERTIFICATE_CONVERSION = {
        IELTS: {
            '9.0': 'C2', '8.5': 'C2', '8.0': 'C1', '7.5': 'C1',
            '7.0': 'B2', '6.5': 'B2', '6.0': 'B2', '5.5': 'B1',
            '5.0': 'B1', '4.5': 'A2', '4.0': 'A2', '3.5': 'A1'
        },
        TOEFL: {
            '120-110': 'C2', '109-100': 'C1', '99-90': 'B2',
            '89-80': 'B2', '79-70': 'B1', '69-60': 'B1',
            '59-50': 'A2', '49-40': 'A2', '39-30': 'A1'
        },
        Cambridge: {
            CPE: 'C2', CAE: 'C1', FCE: 'B2', PET: 'B1', KET: 'A2'
        }
    };

    /**
     * Load all question banks from JSON files
     */
    async loadQuestionBanks() {
        if (this.isLoaded) return;

        const levels = ['a1', 'a2', 'b1', 'b2', 'c1'];

        for (const level of levels) {
            try {
                const response = await fetch(`data/placement/${level}_placement.json`);
                if (response.ok) {
                    const data = await response.json();
                    this.questionBanks[level.toUpperCase()] = this.processQuestionBank(data);
                }
            } catch (e) {
                console.warn(`Failed to load ${level} placement questions:`, e);
            }
        }

        this.isLoaded = true;
    }

    /**
     * Process question bank - flatten sections into array with metadata
     */
    processQuestionBank(data) {
        const questions = [];

        for (const section of data.sections || []) {
            for (const q of section.questions || []) {
                questions.push({
                    ...q,
                    section: section.type,
                    level: data.level
                });
            }
        }

        return {
            level: data.level,
            total: data.total_questions,
            questions,
            bySection: data.sections.reduce((acc, s) => {
                acc[s.type] = s.questions;
                return acc;
            }, {})
        };
    }

    /**
     * Start placement test
     */
    async startTest() {
        await this.loadQuestionBanks();

        this.testSession = {
            startTime: Date.now(),
            currentLevel: 'A2', // Start at A2
            questions: [],
            answers: [],
            sectionScores: {
                grammar: { correct: 0, total: 0, byLevel: {} },
                vocabulary: { correct: 0, total: 0, byLevel: {} },
                reading: { correct: 0, total: 0, byLevel: {} },
                listening_simulation: { correct: 0, total: 0, byLevel: {} }
            },
            usedQuestionIds: new Set(),
            questionCount: 0,
            levelHistory: [],
            finished: false
        };

        // Initialize byLevel for all sections
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        for (const section of Object.keys(this.testSession.sectionScores)) {
            for (const level of levels) {
                this.testSession.sectionScores[section].byLevel[level] = { correct: 0, total: 0 };
            }
        }

        return {
            timeLimit: PlacementTest.CONFIG.timeLimit,
            estimatedQuestions: `${PlacementTest.CONFIG.minQuestions}-${PlacementTest.CONFIG.maxQuestions}`,
            sections: PlacementTest.CONFIG.sections,
            instructions: this.getInstructions()
        };
    }

    /**
     * Get test instructions
     */
    getInstructions() {
        return {
            en: `Welcome to the Placement Test!

• This test will determine your English level (A1-C1)
• It takes approximately 25-35 minutes
• The test adapts to your level
• Answer as many questions as you can
• Don't worry if questions get harder - that's normal!

Good luck!`,
            ru: `Добро пожаловать на тест определения уровня!

• Этот тест определит ваш уровень английского (A1-C1)
• Тест займёт примерно 25-35 минут
• Тест адаптируется под ваш уровень
• Отвечайте на все вопросы, которые можете
• Не волнуйтесь, если вопросы станут сложнее - это нормально!

Удачи!`
        };
    }

    /**
     * Get next question
     */
    async getNextQuestion() {
        if (!this.testSession) return null;

        const { currentLevel, questionCount, usedQuestionIds } = this.testSession;

        // Check if test should end
        if (questionCount >= PlacementTest.CONFIG.maxQuestions || this.shouldEndTest()) {
            return { finished: true };
        }

        // Determine section (rotate through sections)
        const sections = PlacementTest.CONFIG.sections;
        const sectionIndex = questionCount % sections.length;
        const section = sections[sectionIndex];

        // Get question for current level and section
        const question = this.selectQuestion(section, currentLevel, usedQuestionIds);

        if (!question) {
            // Try adjacent levels if no question available
            const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
            const currentIdx = levels.indexOf(currentLevel);

            for (let offset = 1; offset <= 2; offset++) {
                for (const dir of [1, -1]) {
                    const tryLevel = levels[currentIdx + offset * dir];
                    if (tryLevel) {
                        const altQuestion = this.selectQuestion(section, tryLevel, usedQuestionIds);
                        if (altQuestion) {
                            return this.formatQuestion(altQuestion, section, questionCount);
                        }
                    }
                }
            }

            // No more questions available for this section, skip to next
            return this.getNextQuestion();
        }

        return this.formatQuestion(question, section, questionCount);
    }

    /**
     * Select a random unused question for section and level
     */
    selectQuestion(section, level, usedIds) {
        const bank = this.questionBanks[level];
        if (!bank || !bank.bySection[section]) return null;

        const available = bank.bySection[section].filter(q => {
            const qId = `${level}_${section}_${q.id}`;
            return !usedIds.has(qId);
        });

        if (available.length === 0) return null;

        const randomIdx = Math.floor(Math.random() * available.length);
        const question = { ...available[randomIdx], level, section };

        return question;
    }

    /**
     * Format question for display
     */
    formatQuestion(question, section, questionCount) {
        const qId = `${question.level}_${section}_${question.id}`;
        this.testSession.usedQuestionIds.add(qId);

        this.testSession.questions.push({
            ...question,
            qId,
            index: questionCount
        });

        this.testSession.questionCount++;

        // Format based on question type
        let formatted = {
            id: qId,
            section,
            level: question.level,
            questionNumber: questionCount + 1,
            progress: (questionCount + 1) / PlacementTest.CONFIG.minQuestions
        };

        if (section === 'reading') {
            formatted = {
                ...formatted,
                type: 'reading',
                text: question.text,
                question: question.question,
                options: question.options,
                questionType: question.type
            };
        } else if (section === 'listening_simulation') {
            formatted = {
                ...formatted,
                type: 'listening',
                scenario: question.scenario,
                question: question.question,
                options: question.options
            };
        } else if (question.sentence) {
            // Grammar fill-in-blank
            formatted = {
                ...formatted,
                type: 'fill_blank',
                sentence: question.sentence || question.question,
                options: question.options
            };
        } else {
            // Vocabulary meaning
            formatted = {
                ...formatted,
                type: 'vocabulary',
                question: question.question,
                options: question.options
            };
        }

        return formatted;
    }

    /**
     * Submit answer
     */
    submitAnswer(answerIndex) {
        if (!this.testSession) return null;

        const currentQuestion = this.testSession.questions[
            this.testSession.questions.length - 1
        ];

        const isCorrect = answerIndex === currentQuestion.correct;

        this.testSession.answers.push({
            questionIndex: currentQuestion.index,
            qId: currentQuestion.qId,
            answer: answerIndex,
            correct: isCorrect,
            level: currentQuestion.level,
            section: currentQuestion.section
        });

        // Track section score
        const sectionScores = this.testSession.sectionScores[currentQuestion.section];
        sectionScores.total++;
        if (isCorrect) sectionScores.correct++;

        sectionScores.byLevel[currentQuestion.level].total++;
        if (isCorrect) sectionScores.byLevel[currentQuestion.level].correct++;

        // Track level history
        this.testSession.levelHistory.push({
            level: currentQuestion.level,
            correct: isCorrect
        });

        // Adapt level based on performance
        this.adaptLevel();

        return {
            correct: isCorrect,
            correctAnswer: currentQuestion.correct,
            correctOption: currentQuestion.options[currentQuestion.correct]
        };
    }

    /**
     * Adapt level based on recent performance
     */
    adaptLevel() {
        const recentAnswers = this.testSession.answers.slice(-5);
        if (recentAnswers.length < 5) return;

        // Only consider answers at current level
        const currentLevelAnswers = recentAnswers.filter(
            a => a.level === this.testSession.currentLevel
        );

        if (currentLevelAnswers.length < 3) return;

        const recentAccuracy = currentLevelAnswers.filter(a => a.correct).length / currentLevelAnswers.length;
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const currentIndex = levels.indexOf(this.testSession.currentLevel);

        if (recentAccuracy >= PlacementTest.CONFIG.adaptiveThreshold) {
            // Move up
            if (currentIndex < levels.length - 1) {
                this.testSession.currentLevel = levels[currentIndex + 1];
            }
        } else if (recentAccuracy < PlacementTest.CONFIG.moveDownThreshold) {
            // Move down
            if (currentIndex > 0) {
                this.testSession.currentLevel = levels[currentIndex - 1];
            }
        }
    }

    /**
     * Check if test should end
     */
    shouldEndTest() {
        const { questionCount, levelHistory } = this.testSession;

        if (questionCount < PlacementTest.CONFIG.minQuestions) {
            return false;
        }

        // End if level has stabilized (same level for last N questions)
        const recentLevels = levelHistory.slice(-PlacementTest.CONFIG.stabilityWindow);
        if (recentLevels.length < PlacementTest.CONFIG.stabilityWindow) {
            return false;
        }

        const levels = recentLevels.map(h => h.level);
        const uniqueLevels = [...new Set(levels)];

        return uniqueLevels.length === 1;
    }

    /**
     * Finish test and calculate results
     */
    async finishTest() {
        if (!this.testSession) return null;

        this.testSession.finished = true;
        this.testSession.endTime = Date.now();

        // Calculate section results
        const results = {};
        for (const [section, scores] of Object.entries(this.testSession.sectionScores)) {
            const accuracy = scores.total > 0 ? scores.correct / scores.total : 0;
            const level = this.determineSectionLevel(scores.byLevel);

            results[section] = {
                correct: scores.correct,
                total: scores.total,
                accuracy,
                level,
                byLevel: scores.byLevel
            };
        }

        // Calculate overall level
        const overallLevel = this.calculateOverallLevel(results);

        // Map section names to profile keys
        const sectionToProfile = {
            'grammar': 'grammar',
            'vocabulary': 'vocabulary',
            'reading': 'reading',
            'listening_simulation': 'listening'
        };

        // Save to profile
        const profile = await Database.getProfile();
        profile.levels.overall = overallLevel;

        for (const [section, key] of Object.entries(sectionToProfile)) {
            if (results[section]) {
                profile.levels[key] = profile.levels[key] || {};
                profile.levels[key].level = results[section].level || overallLevel;
            }
        }

        profile.lastPlacementTest = Date.now();
        profile.placementTestResults = {
            overallLevel,
            sectionResults: results,
            questionsAnswered: this.testSession.questionCount,
            duration: this.testSession.endTime - this.testSession.startTime,
            date: Date.now()
        };

        await Database.saveProfile(profile);

        return {
            overallLevel,
            sectionResults: results,
            duration: this.testSession.endTime - this.testSession.startTime,
            questionsAnswered: this.testSession.questionCount,
            recommendation: this.getRecommendation(overallLevel, results)
        };
    }

    /**
     * Determine level from section scores by level
     */
    determineSectionLevel(byLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        let determinedLevel = 'A1';

        for (const level of levels) {
            const data = byLevel[level];
            if (data && data.total >= 2) {
                const accuracy = data.correct / data.total;
                if (accuracy >= 0.6) {
                    determinedLevel = level;
                }
            }
        }

        return determinedLevel;
    }

    /**
     * Calculate overall level from section results
     */
    calculateOverallLevel(results) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const sectionLevels = Object.values(results)
            .map(r => r.level)
            .filter(Boolean);

        if (sectionLevels.length === 0) return 'A1';

        // Find the most common level, weighted towards lower
        const levelCounts = {};
        for (const level of sectionLevels) {
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        }

        // If there's a tie, prefer the lower level
        let maxCount = 0;
        let resultLevel = 'A1';

        for (const level of levels) {
            if ((levelCounts[level] || 0) > maxCount) {
                maxCount = levelCounts[level];
                resultLevel = level;
            }
        }

        // Also consider: if lowest section is 2+ levels below average, use it
        const minLevel = sectionLevels.reduce((min, l) =>
            levels.indexOf(l) < levels.indexOf(min) ? l : min
        );

        const minIdx = levels.indexOf(minLevel);
        const resultIdx = levels.indexOf(resultLevel);

        if (resultIdx - minIdx >= 2) {
            // There's a significant weak area, lower the result
            return levels[Math.max(0, resultIdx - 1)];
        }

        return resultLevel;
    }

    /**
     * Get recommendation based on level and section results
     */
    getRecommendation(level, results) {
        const recommendations = {
            en: {
                A1: 'Focus on basic vocabulary and simple grammar structures. Start with everyday words and Present Simple.',
                A2: 'Build your vocabulary and practice everyday conversations. Work on Past Simple and common phrases.',
                B1: 'Work on more complex grammar and start reading longer texts. Focus on Present Perfect and conditionals.',
                B2: 'Focus on fluency and start engaging with authentic content. Master advanced grammar structures.',
                C1: 'Refine your accuracy and work on advanced structures like inversion and subjunctive.'
            },
            ru: {
                A1: 'Сосредоточьтесь на базовой лексике и простых грамматических структурах. Начните с повседневных слов и Present Simple.',
                A2: 'Расширяйте словарный запас и практикуйте повседневные разговоры. Работайте над Past Simple и распространёнными фразами.',
                B1: 'Изучайте более сложную грамматику и читайте длинные тексты. Фокус на Present Perfect и условных предложениях.',
                B2: 'Развивайте беглость речи и работайте с аутентичным контентом. Освойте продвинутые грамматические структуры.',
                C1: 'Совершенствуйте точность и работайте над продвинутыми структурами: инверсия, сослагательное наклонение.'
            }
        };

        // Find weakest section
        let weakestSection = null;
        let lowestAccuracy = 1;

        for (const [section, data] of Object.entries(results)) {
            if (data.total >= 3 && data.accuracy < lowestAccuracy) {
                lowestAccuracy = data.accuracy;
                weakestSection = section;
            }
        }

        const sectionNames = {
            grammar: { en: 'grammar', ru: 'грамматику' },
            vocabulary: { en: 'vocabulary', ru: 'лексику' },
            reading: { en: 'reading', ru: 'чтение' },
            listening_simulation: { en: 'listening', ru: 'аудирование' }
        };

        return {
            general: recommendations,
            level,
            weakArea: weakestSection ? {
                section: weakestSection,
                name: sectionNames[weakestSection],
                accuracy: lowestAccuracy,
                suggestion: {
                    en: `Pay extra attention to ${sectionNames[weakestSection]?.en}. Your accuracy was ${Math.round(lowestAccuracy * 100)}%.`,
                    ru: `Уделите особое внимание: ${sectionNames[weakestSection]?.ru}. Ваша точность: ${Math.round(lowestAccuracy * 100)}%.`
                }
            } : null
        };
    }

    /**
     * Process certificate upload
     */
    async processCertificate(certificateType, score, date) {
        const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
        const certDate = new Date(date).getTime();

        if (certDate < twoYearsAgo) {
            return {
                success: false,
                message: {
                    en: 'Certificate is older than 2 years. We recommend taking the placement test.',
                    ru: 'Сертификат старше 2 лет. Рекомендуем пройти тест определения уровня.'
                },
                suggestTest: true
            };
        }

        const conversion = PlacementTest.CERTIFICATE_CONVERSION[certificateType];
        if (!conversion) {
            return {
                success: false,
                message: {
                    en: 'Unknown certificate type',
                    ru: 'Неизвестный тип сертификата'
                }
            };
        }

        let cefrLevel;

        if (certificateType === 'IELTS') {
            cefrLevel = conversion[score.toString()];
        } else if (certificateType === 'Cambridge') {
            cefrLevel = conversion[score];
        } else {
            const scoreNum = parseFloat(score);
            for (const [range, level] of Object.entries(conversion)) {
                const [max, min] = range.split('-').map(Number);
                if (scoreNum <= max && scoreNum >= min) {
                    cefrLevel = level;
                    break;
                }
            }
        }

        if (!cefrLevel) {
            return {
                success: false,
                message: {
                    en: 'Could not convert score to CEFR level',
                    ru: 'Не удалось конвертировать балл в уровень CEFR'
                }
            };
        }

        const profile = await Database.getProfile();
        profile.levels.overall = cefrLevel;
        profile.levels.vocabulary.level = cefrLevel;
        profile.levels.grammar.level = cefrLevel;
        profile.levels.reading.level = cefrLevel;
        profile.levels.listening.level = cefrLevel;
        profile.levels.writing.level = cefrLevel;
        profile.levels.speaking.level = cefrLevel;
        profile.certificateUsed = { type: certificateType, score, date };
        profile.lastPlacementTest = Date.now();
        await Database.saveProfile(profile);

        return {
            success: true,
            level: cefrLevel,
            message: {
                en: `Your level is ${cefrLevel} based on your ${certificateType} score.`,
                ru: `Ваш уровень: ${cefrLevel} (на основе ${certificateType}).`
            }
        };
    }

    /**
     * Check if reassessment is needed
     */
    async checkReassessmentNeeded() {
        const profile = await Database.getProfile();

        const monthsSinceTest = profile.lastPlacementTest
            ? (Date.now() - profile.lastPlacementTest) / (30 * 24 * 60 * 60 * 1000)
            : Infinity;

        if (monthsSinceTest >= 3) {
            return {
                needed: true,
                reason: 'periodic',
                message: {
                    en: "It's been 3 months since your last assessment. Would you like to retake the test?",
                    ru: 'Прошло 3 месяца с последней оценки. Хотите пройти тест заново?'
                }
            };
        }

        const daysSinceActivity = profile.lastStudyDate
            ? (Date.now() - profile.lastStudyDate) / (24 * 60 * 60 * 1000)
            : 0;

        if (daysSinceActivity >= 14) {
            return {
                needed: true,
                reason: 'returning_user',
                message: {
                    en: "Welcome back! It's been a while. Would you like to check your level?",
                    ru: 'С возвращением! Давно не виделись. Хотите проверить свой уровень?'
                }
            };
        }

        return { needed: false };
    }

    /**
     * Get current test progress
     */
    getProgress() {
        if (!this.testSession) return null;

        return {
            questionsAnswered: this.testSession.questionCount,
            currentLevel: this.testSession.currentLevel,
            timeElapsed: Date.now() - this.testSession.startTime,
            sectionProgress: Object.entries(this.testSession.sectionScores).map(([section, data]) => ({
                section,
                answered: data.total,
                accuracy: data.total > 0 ? data.correct / data.total : 0
            }))
        };
    }
}

export default new PlacementTest();
