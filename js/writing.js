/**
 * Writing module with Calibrated AI assessment
 * Multi-layer assessment: LanguageTool + Gemini AI
 */

import Database from './database.js';
import AI from './ai.js';

class Writing {
    constructor() {
        this.currentTask = null;
        this.drafts = [];
    }

    // Task types
    static TASK_TYPES = {
        ESSAY: { name: 'Essay', minWords: 250, maxWords: 300 },
        LETTER_FORMAL: { name: 'Formal Letter', minWords: 150, maxWords: 200 },
        LETTER_INFORMAL: { name: 'Informal Letter', minWords: 150, maxWords: 200 },
        REPORT: { name: 'Report', minWords: 150, maxWords: 200 },
        EMAIL: { name: 'Email', minWords: 100, maxWords: 150 },
        SUMMARY: { name: 'Summary', minWords: 100, maxWords: 150 }
    };

    // Band targets by level
    static BAND_TARGETS = {
        A1: 3.0, A2: 4.0, B1: 5.0, B2: 6.0, C1: 7.0
    };

    /**
     * Start writing task
     */
    startTask(taskType, prompt, level) {
        const taskConfig = Writing.TASK_TYPES[taskType] || Writing.TASK_TYPES.ESSAY;

        this.currentTask = {
            type: taskType,
            config: taskConfig,
            prompt,
            level,
            startTime: Date.now(),
            drafts: []
        };

        return {
            type: taskConfig.name,
            prompt,
            requirements: {
                minWords: taskConfig.minWords,
                maxWords: taskConfig.maxWords
            },
            selfCheck: this.getSelfCheckList(taskType)
        };
    }

    /**
     * Get self-check checklist
     */
    getSelfCheckList(taskType) {
        const common = [
            { id: 'intro', label: 'Introduction with thesis statement', checked: false },
            { id: 'body', label: '2-3 body paragraphs', checked: false },
            { id: 'oneIdea', label: 'Each paragraph = 1 main idea', checked: false },
            { id: 'conclusion', label: 'Conclusion', checked: false },
            { id: 'allParts', label: 'Answered ALL parts of question', checked: false },
            { id: 'examples', label: 'Examples/arguments included', checked: false },
            { id: 'linking', label: 'Linking words used', checked: false },
            { id: 'variety', label: 'Varied sentence structures', checked: false },
            { id: 'spelling', label: 'Checked spelling', checked: false },
            { id: 'wordCount', label: 'Met word count requirement', checked: false }
        ];

        if (taskType === 'LETTER_FORMAL') {
            return [
                { id: 'address', label: 'Proper addressing', checked: false },
                { id: 'formal', label: 'Formal tone', checked: false },
                ...common.slice(0, 6),
                { id: 'closing', label: 'Appropriate closing', checked: false }
            ];
        }

        return common;
    }

    /**
     * Save draft
     */
    saveDraft(text) {
        if (!this.currentTask) return;

        this.currentTask.drafts.push({
            text,
            timestamp: Date.now(),
            wordCount: this.countWords(text)
        });
    }

    /**
     * Submit for assessment
     */
    async submitForAssessment(text) {
        if (!this.currentTask) {
            return { success: false, message: 'No active task' };
        }

        const wordCount = this.countWords(text);

        // Multi-layer assessment
        const assessment = await AI.assessWriting(text, this.currentTask.type);

        // Add additional analysis
        const analysis = this.analyzeText(text);

        // Build result with disclaimer
        const result = {
            ...assessment,
            wordCount,
            analysis,
            meetsRequirements: this.checkRequirements(wordCount),
            disclaimer: {
                show: true,
                message: 'This is an AI assessment, not a human examiner. ' +
                    'Real IELTS scores may differ by ±0.5-1.0 bands.'
            }
        };

        // Log session
        await Database.logSession({
            type: 'writing',
            taskType: this.currentTask.type,
            level: this.currentTask.level,
            wordCount,
            score: result.overall,
            duration: Date.now() - this.currentTask.startTime
        });

        // Update profile
        await this.updateWritingProfile(result.overall);

        return result;
    }

    /**
     * Analyze text structure
     */
    analyzeText(text) {
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        const words = text.split(/\s+/).filter(w => w.trim());

        // Check for linking words
        const linkingWords = [
            'however', 'therefore', 'moreover', 'furthermore', 'although',
            'because', 'firstly', 'secondly', 'finally', 'in conclusion',
            'for example', 'for instance', 'in addition', 'on the other hand'
        ];
        const usedLinking = linkingWords.filter(lw =>
            text.toLowerCase().includes(lw)
        );

        // Check sentence variety
        const avgSentenceLength = words.length / sentences.length;
        const sentenceLengths = sentences.map(s =>
            s.split(/\s+/).filter(w => w).length
        );
        const sentenceVariety = this.calculateVariety(sentenceLengths);

        return {
            paragraphs: paragraphs.length,
            sentences: sentences.length,
            words: words.length,
            avgSentenceLength: Math.round(avgSentenceLength),
            sentenceVariety,
            linkingWords: usedLinking,
            hasIntro: this.detectIntro(paragraphs[0] || ''),
            hasConclusion: this.detectConclusion(paragraphs[paragraphs.length - 1] || '')
        };
    }

    /**
     * Calculate variety score
     */
    calculateVariety(lengths) {
        if (lengths.length < 2) return 0;

        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
        const stdDev = Math.sqrt(variance);

        // Higher std dev = more variety
        if (stdDev > 8) return 'high';
        if (stdDev > 4) return 'medium';
        return 'low';
    }

    /**
     * Detect introduction
     */
    detectIntro(para) {
        const introPatterns = [
            /this essay/i, /will discuss/i, /will examine/i,
            /in this/i, /the topic of/i, /is a controversial/i
        ];
        return introPatterns.some(p => p.test(para));
    }

    /**
     * Detect conclusion
     */
    detectConclusion(para) {
        const conclusionPatterns = [
            /in conclusion/i, /to conclude/i, /to sum up/i,
            /in summary/i, /overall/i, /finally/i
        ];
        return conclusionPatterns.some(p => p.test(para));
    }

    /**
     * Check if meets requirements
     */
    checkRequirements(wordCount) {
        if (!this.currentTask) return false;
        const { minWords } = this.currentTask.config;
        return wordCount >= minWords * 0.9; // 10% tolerance
    }

    /**
     * Count words
     */
    countWords(text) {
        return text.split(/\s+/).filter(w => w.trim()).length;
    }

    /**
     * Update writing profile
     */
    async updateWritingProfile(score) {
        const profile = await Database.getProfile();

        const writing = profile.levels.writing;
        writing.textsCount = (writing.textsCount || 0) + 1;

        // Calculate running average
        const prevTotal = (writing.avgBand || 0) * ((writing.textsCount || 1) - 1);
        writing.avgBand = (prevTotal + score) / writing.textsCount;

        // Determine level based on average band
        for (const [level, target] of Object.entries(Writing.BAND_TARGETS)) {
            if (writing.avgBand >= target) {
                writing.level = level;
            }
        }

        await Database.saveProfile(profile);
    }

    /**
     * Get writing prompts by level
     */
    getPrompts(level) {
        const prompts = {
            A1: [
                'Describe your daily routine.',
                'Write about your family.',
                'Describe your favorite food.'
            ],
            A2: [
                'Write about your last holiday.',
                'Describe your hometown.',
                'Write a letter to a friend about your weekend.'
            ],
            B1: [
                'Some people think that technology is making us less social. Do you agree?',
                'Describe the advantages and disadvantages of working from home.',
                'Write about an important event in your life.'
            ],
            B2: [
                'Climate change is the biggest challenge facing humanity. To what extent do you agree?',
                'Discuss the impact of social media on young people.',
                'Some believe that education should be free for everyone. Discuss.'
            ],
            C1: [
                'Critically evaluate the role of artificial intelligence in modern society.',
                'To what extent should governments regulate the internet?',
                'Discuss the ethical implications of genetic engineering.'
            ]
        };

        return prompts[level] || prompts.B1;
    }

    /**
     * Render result with band breakdown
     */
    renderResult(assessment) {
        return {
            overall: {
                score: assessment.overall,
                range: assessment.range,
                display: `${assessment.overall} (${assessment.range.low}-${assessment.range.high})`
            },
            criteria: [
                {
                    name: 'Task Achievement',
                    score: assessment.taskAchievement?.score,
                    feedback: assessment.taskAchievement?.feedback
                },
                {
                    name: 'Coherence & Cohesion',
                    score: assessment.coherenceCohesion?.score,
                    feedback: assessment.coherenceCohesion?.feedback
                },
                {
                    name: 'Lexical Resource',
                    score: assessment.lexicalResource?.score,
                    feedback: assessment.lexicalResource?.feedback
                },
                {
                    name: 'Grammatical Range',
                    score: assessment.grammaticalRange?.score,
                    feedback: assessment.grammaticalRange?.feedback
                }
            ],
            strengths: assessment.strengths || [],
            improvements: assessment.improvements || [],
            grammarErrors: assessment.grammarErrors || [],
            disclaimer: assessment.disclaimer
        };
    }
}

export default new Writing();
