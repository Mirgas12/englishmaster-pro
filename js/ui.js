/**
 * UI Controller - Connects modules to interface
 * EnglishMaster Pro v3.0
 */

import Utils from './utils.js';
import i18n from './i18n.js';
import Grammar from './grammar.js';
import Vocabulary from './vocabulary.js';
import Reading from './reading.js';
import Immersion from './immersion.js';
import PlacementTest from './placementTest.js';
import Database from './database.js';

class UI {
    constructor() {
        this.currentScreen = 'dashboard-screen';
        this.screenHistory = [];
        this.isInitialized = false;
        this.tg = window.Telegram?.WebApp;
        this.profile = null;
    }

    /**
     * Initialize UI controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Initialize database first
            await Database.init();

            // Get Telegram user or use local user
            const userId = this.tg?.initDataUnsafe?.user?.id || 'local_user';
            Database.setUser(userId);

            // Load profile
            this.profile = await Database.getProfile();

            // Initialize modules
            await this.initModules();

            // Setup UI
            this.setupTelegram();
            this.setupNavigation();
            this.setupModuleCards();
            this.setupBackButton();
            this.setupEventListeners();
            this.applySettings();

            // Check if placement test needed
            if (!this.profile.levels?.overall) {
                this.showScreen('placement-screen', false);
            } else {
                await this.loadDashboard();
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('UI initialization error:', error);
            throw error;
        }
    }

    /**
     * Initialize all modules
     */
    async initModules() {
        const initPromises = [];

        // Initialize vocabulary with error handling
        try {
            initPromises.push(Vocabulary.init());
        } catch (e) {
            console.warn('Vocabulary init warning:', e);
        }

        // These modules load data dynamically, no init needed
        // Grammar, Reading, Immersion - load on demand

        await Promise.all(initPromises);
    }

    /**
     * Apply user settings
     */
    applySettings() {
        const settings = this.profile?.settings || {};

        // Dark mode
        if (settings.darkMode) {
            document.documentElement.classList.add('dark-mode');
            const darkModeToggle = document.getElementById('setting-dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
        }

        // Language
        if (settings.language) {
            i18n.setLocale(settings.language);
            const langSelect = document.getElementById('setting-language');
            if (langSelect) langSelect.value = settings.language;
        }

        // Daily goal
        if (settings.dailyGoalMinutes) {
            const goalSelect = document.getElementById('setting-daily-goal');
            if (goalSelect) goalSelect.value = settings.dailyGoalMinutes;
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        // User info
        const userName = this.tg?.initDataUnsafe?.user?.first_name || 'User';
        const greeting = document.getElementById('user-greeting');
        if (greeting) greeting.textContent = i18n.t('dashboard.greeting', { name: userName });

        const levelBadge = document.getElementById('user-level');
        if (levelBadge) {
            levelBadge.textContent = this.profile.levels?.overall || 'A1';
            levelBadge.className = `level-badge ${this.profile.levels?.overall || 'A1'}`;
        }

        // Stats
        const streak = await Database.getStreak();
        const streakEl = document.getElementById('streak-count');
        if (streakEl) streakEl.textContent = streak;

        const totalMinutes = this.profile.totalStudyMinutes || 0;
        const hoursEl = document.getElementById('total-hours');
        if (hoursEl) hoursEl.textContent = Math.floor(totalMinutes / 60);

        // Vocabulary stats
        const vocabStats = Vocabulary.getStats();
        const vocabCountEl = document.getElementById('vocab-count');
        if (vocabCountEl) vocabCountEl.textContent = `${vocabStats.total} ${i18n.t('vocab.words')}`;

        // Module levels
        this.updateModuleLevels();
    }

    /**
     * Update module level displays
     */
    updateModuleLevels() {
        const levels = this.profile?.levels || {};

        document.getElementById('vocab-level')?.textContent &&
            (document.getElementById('vocab-level').textContent = levels.vocabulary?.level || 'A1');
        document.getElementById('grammar-level')?.textContent &&
            (document.getElementById('grammar-level').textContent = levels.grammar?.level || 'A1');
        document.getElementById('reading-level')?.textContent &&
            (document.getElementById('reading-level').textContent = levels.reading?.level || 'A1');
        document.getElementById('listening-level')?.textContent &&
            (document.getElementById('listening-level').textContent = levels.listening?.level || 'A1');
        document.getElementById('writing-level')?.textContent &&
            (document.getElementById('writing-level').textContent = levels.writing?.level || 'A1');
        document.getElementById('speaking-level')?.textContent &&
            (document.getElementById('speaking-level').textContent = levels.speaking?.level || 'A1');
    }

    /**
     * Setup Telegram WebApp integration
     */
    setupTelegram() {
        if (!this.tg) return;

        this.tg.ready();
        this.tg.expand();

        // Apply Telegram theme
        const root = document.documentElement;
        if (this.tg.themeParams) {
            const tp = this.tg.themeParams;
            if (tp.bg_color) root.style.setProperty('--tg-theme-bg-color', tp.bg_color);
            if (tp.text_color) root.style.setProperty('--tg-theme-text-color', tp.text_color);
            if (tp.hint_color) root.style.setProperty('--tg-theme-hint-color', tp.hint_color);
            if (tp.button_color) root.style.setProperty('--tg-theme-button-color', tp.button_color);
            if (tp.button_text_color) root.style.setProperty('--tg-theme-button-text-color', tp.button_text_color);
            if (tp.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
        }

        // Setup back button handler
        this.tg.BackButton.onClick(() => this.goBack());
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const nav = item.dataset.nav;

                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                const screenMap = {
                    'dashboard': 'dashboard-screen',
                    'study': 'study-screen',
                    'progress': 'progress-screen',
                    'profile': 'profile-screen'
                };

                if (screenMap[nav]) {
                    this.showScreen(screenMap[nav], false);
                }
            });
        });
    }

    /**
     * Setup module card clicks
     */
    setupModuleCards() {
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', () => {
                const module = card.dataset.module;
                const study = card.dataset.study;
                const ielts = card.dataset.ielts;

                if (module) {
                    this.openModule(module);
                } else if (study) {
                    this.openModule(study);
                } else if (ielts) {
                    this.showToast(i18n.t('common.comingSoon'));
                }
            });
        });
    }

    /**
     * Setup back button
     */
    setupBackButton() {
        // Handle browser/Telegram back button
        window.addEventListener('popstate', (e) => {
            if (e.state?.screen) {
                this.showScreen(e.state.screen, false);
            } else {
                this.goBack();
            }
        });
    }

    /**
     * Setup additional event listeners
     */
    setupEventListeners() {
        // Grammar level selector
        const grammarLevelSelect = document.getElementById('grammar-level-select');
        if (grammarLevelSelect) {
            grammarLevelSelect.addEventListener('change', (e) => {
                this.loadGrammarTopics(e.target.value);
            });
        }

        // Reading level selector
        const readingLevelSelect = document.getElementById('reading-level-select');
        if (readingLevelSelect) {
            readingLevelSelect.addEventListener('change', (e) => {
                this.loadReadingTexts(e.target.value);
            });
        }

        // Immersion level selector
        const immersionLevelSelect = document.getElementById('immersion-level-select');
        if (immersionLevelSelect) {
            immersionLevelSelect.addEventListener('change', (e) => {
                this.loadImmersionQuizzes(e.target.value);
            });
        }

        // Placement test start
        const startPlacementBtn = document.getElementById('start-placement');
        if (startPlacementBtn) {
            startPlacementBtn.addEventListener('click', () => {
                this.startPlacementTest();
            });
        }

        // Phase tabs
        document.querySelectorAll('.tab[data-phase]').forEach(tab => {
            tab.addEventListener('click', () => {
                const phase = tab.dataset.phase;
                this.switchGrammarPhase(phase);
            });
        });

        // Vocabulary mode buttons
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.startVocabularySession(btn.dataset.mode);
            });
        });

        // Show answer button
        const showAnswerBtn = document.getElementById('show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.addEventListener('click', () => this.showVocabAnswer());
        }

        // Answer buttons
        document.querySelectorAll('.answer-btn[data-quality]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.submitVocabAnswer(parseInt(btn.dataset.quality));
            });
        });

        // Reading check answers
        const checkReadingBtn = document.getElementById('check-reading-answers');
        if (checkReadingBtn) {
            checkReadingBtn.addEventListener('click', () => this.checkReadingAnswers());
        }

        // Immersion controls
        const showTranscriptBtn = document.getElementById('show-transcript');
        if (showTranscriptBtn) {
            showTranscriptBtn.addEventListener('click', () => this.toggleTranscript());
        }

        const checkImmersionBtn = document.getElementById('check-immersion-answers');
        if (checkImmersionBtn) {
            checkImmersionBtn.addEventListener('click', () => this.checkImmersionAnswers());
        }

        // Media player controls
        document.getElementById('media-play')?.addEventListener('click', () => this.playMedia());
        document.getElementById('media-pause')?.addEventListener('click', () => this.pauseMedia());
        document.getElementById('media-replay')?.addEventListener('click', () => this.replayMedia());

        // Settings changes
        document.getElementById('setting-language')?.addEventListener('change', async (e) => {
            i18n.setLocale(e.target.value);
            this.profile.settings.language = e.target.value;
            await Database.saveProfile(this.profile);
            this.refreshCurrentScreen();
        });

        // Dark mode toggle
        document.getElementById('setting-dark-mode')?.addEventListener('change', async (e) => {
            const isDark = e.target.checked;
            document.documentElement.classList.toggle('dark-mode', isDark);
            this.profile.settings.darkMode = isDark;
            await Database.saveProfile(this.profile);
        });

        // Daily goal change
        document.getElementById('setting-daily-goal')?.addEventListener('change', async (e) => {
            this.profile.dailyGoalMinutes = parseInt(e.target.value);
            await Database.saveProfile(this.profile);
            this.showToast(i18n.t('common.saved'));
        });

        // Retake placement test
        document.getElementById('retake-placement')?.addEventListener('click', () => {
            this.showScreen('placement-screen');
        });

        // Export progress
        document.getElementById('export-progress')?.addEventListener('click', async () => {
            const data = await Database.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `englishmaster-progress-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast(i18n.t('profile.exportSuccess'));
        });

        // Reset progress
        document.getElementById('reset-progress')?.addEventListener('click', async () => {
            if (confirm(i18n.t('profile.resetConfirm'))) {
                await Database.clearAllData();
                location.reload();
            }
        });

        // Writing word count
        const writingInput = document.getElementById('writing-input');
        if (writingInput) {
            writingInput.addEventListener('input', (e) => {
                const words = e.target.value.trim().split(/\s+/).filter(w => w).length;
                const countEl = document.getElementById('word-count');
                if (countEl) countEl.textContent = words;
            });
        }

        // Checklist items
        document.querySelectorAll('.checkbox').forEach(cb => {
            cb.addEventListener('click', () => {
                cb.classList.toggle('checked');
                cb.textContent = cb.classList.contains('checked') ? '✓' : '';
            });
        });
    }

    /**
     * Show screen with history management
     */
    showScreen(screenId, addToHistory = true) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

        // Show target screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }

        // Update history
        if (addToHistory && this.currentScreen !== screenId) {
            this.screenHistory.push(this.currentScreen);
            history.pushState({ screen: screenId }, '', `#${screenId}`);
        }

        this.currentScreen = screenId;

        // Update Telegram back button
        if (this.tg) {
            if (this.screenHistory.length > 0) {
                this.tg.BackButton.show();
            } else {
                this.tg.BackButton.hide();
            }
        }

        // Update bottom nav active state
        this.updateNavState(screenId);
    }

    /**
     * Go back to previous screen
     */
    goBack() {
        if (this.screenHistory.length > 0) {
            const previousScreen = this.screenHistory.pop();
            this.showScreen(previousScreen, false);
        }
    }

    /**
     * Update navigation active state
     */
    updateNavState(screenId) {
        const screenToNav = {
            'dashboard-screen': 'dashboard',
            'study-screen': 'study',
            'progress-screen': 'progress',
            'profile-screen': 'profile'
        };

        const navKey = screenToNav[screenId];
        if (navKey) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.nav === navKey);
            });
        }
    }

    /**
     * Open module screen
     */
    openModule(moduleName) {
        const screenMap = {
            'vocabulary': 'vocabulary-screen',
            'grammar': 'grammar-screen',
            'reading': 'reading-screen',
            'listening': 'listening-screen',
            'writing': 'writing-screen',
            'speaking': 'speaking-screen',
            'immersion': 'immersion-screen',
            'ielts': 'ielts-screen'
        };

        const screenId = screenMap[moduleName];
        if (screenId) {
            this.showScreen(screenId);
            this.initModuleScreen(moduleName);
        }
    }

    /**
     * Initialize module screen content
     */
    async initModuleScreen(moduleName) {
        switch (moduleName) {
            case 'grammar':
                const grammarLevel = document.getElementById('grammar-level-select')?.value || 'A1';
                await this.loadGrammarTopics(grammarLevel);
                break;

            case 'reading':
                const readingLevel = document.getElementById('reading-level-select')?.value || 'A1';
                await this.loadReadingTexts(readingLevel);
                break;

            case 'immersion':
                const immersionLevel = document.getElementById('immersion-level-select')?.value || 'A1';
                await this.loadImmersionQuizzes(immersionLevel);
                break;

            case 'vocabulary':
                await Vocabulary.init();
                this.updateVocabStats();
                break;
        }
    }

    // ==================== GRAMMAR ====================

    /**
     * Load grammar topics for level
     */
    async loadGrammarTopics(level) {
        await Grammar.init();
        const topics = Grammar.getTopicsForLevel(level);
        const container = document.getElementById('grammar-topics-list');

        if (!container) return;

        container.innerHTML = '';

        const topicList = Utils.createElement('div', { className: 'topic-list' });

        for (const topic of topics) {
            const statusIcon = {
                'completed': '✓',
                'in_progress': '◐',
                'new': '○'
            };

            const statusClass = {
                'completed': 'completed',
                'in_progress': 'in-progress',
                'new': 'locked'
            };

            const topicItem = Utils.createElement('div', {
                className: 'topic-item',
                dataset: { topicId: topic.id, level: level },
                onClick: () => this.openGrammarTopic(topic.id, level)
            }, [
                Utils.createElement('div', { className: 'topic-info' }, [
                    Utils.createElement('div', { className: 'topic-title', textContent: i18n.getLocale() === 'ru' ? topic.name_ru : topic.name }),
                    Utils.createElement('div', { className: 'topic-subtitle', textContent: level })
                ]),
                Utils.createElement('div', {
                    className: `topic-status ${statusClass[topic.status]}`,
                    textContent: statusIcon[topic.status]
                })
            ]);

            topicList.appendChild(topicItem);
        }

        container.appendChild(topicList);
    }

    /**
     * Open grammar topic
     */
    async openGrammarTopic(topicId, level) {
        const result = await Grammar.startTopic(topicId, level);

        if (!result.success) {
            this.showToast(result.message);
            return;
        }

        // Update lesson screen
        const titleEl = document.getElementById('lesson-title');
        if (titleEl) {
            titleEl.textContent = i18n.getLocale() === 'ru'
                ? result.topic.title_ru || result.topic.title
                : result.topic.title;
        }

        // Update progress bar
        this.updateGrammarProgress(result.progress);

        // Update phase tabs
        this.updatePhaseTabs(result.currentPhase);

        // Load phase content
        this.loadPhaseContent(result.currentPhase, result.phaseContent);

        this.showScreen('grammar-lesson-screen');
    }

    /**
     * Update grammar progress bar
     */
    updateGrammarProgress(progress) {
        const phases = ['discover', 'understand', 'notice', 'practice', 'produce', 'input_flood', 'review'];
        let completed = 0;

        for (const phase of phases) {
            if (phase === 'practice' || phase === 'produce') {
                if (progress.phases[phase]?.completed) completed++;
            } else if (phase === 'input_flood') {
                completed += Math.min(progress.phases[phase] / 5, 1);
            } else if (progress.phases[phase]) {
                completed++;
            }
        }

        const progressPercent = (completed / phases.length) * 100;
        const progressBar = document.getElementById('lesson-progress');
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
    }

    /**
     * Update phase tabs active state
     */
    updatePhaseTabs(currentPhase) {
        document.querySelectorAll('.tab[data-phase]').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.phase === currentPhase);
        });
    }

    /**
     * Switch grammar phase
     */
    switchGrammarPhase(phase) {
        const result = Grammar.goToPhase(phase);
        if (result) {
            this.updatePhaseTabs(phase);
            this.loadPhaseContent(phase, result.content);
        }
    }

    /**
     * Load phase content
     */
    loadPhaseContent(phase, content) {
        const container = document.getElementById('lesson-content');
        if (!container) return;

        container.innerHTML = '';

        if (!content) {
            container.innerHTML = `<div class="card"><p class="text-hint">${i18n.t('common.loading')}</p></div>`;
            return;
        }

        const locale = i18n.getLocale();

        switch (phase) {
            case 'discover':
                this.renderDiscoverPhase(container, content, locale);
                break;
            case 'understand':
                this.renderUnderstandPhase(container, content, locale);
                break;
            case 'notice':
                this.renderNoticePhase(container, content, locale);
                break;
            case 'practice':
                this.renderPracticePhase(container, content, locale);
                break;
            case 'produce':
                this.renderProducePhase(container, content, locale);
                break;
            case 'input_flood':
                this.renderInputFloodPhase(container, content, locale);
                break;
            case 'review':
                this.renderReviewPhase(container, content, locale);
                break;
        }
    }

    /**
     * Render Discover phase
     */
    renderDiscoverPhase(container, content, locale) {
        const instruction = locale === 'ru' ? content.instruction_ru : content.instruction;

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('p', { className: 'text-hint mb-md', textContent: instruction }),
            Utils.createElement('div', {
                className: 'reading-text mb-md'
            })
        ]);

        // Render text with highlights (XSS-safe)
        const textContainer = card.querySelector('.reading-text');
        if (content.content?.text) {
            // Safely render text with highlight markers
            const safeHtml = this.renderTextWithHighlights(content.content.text);
            textContainer.innerHTML = safeHtml;
        }

        const question = locale === 'ru' ? content.content?.question_ru : content.content?.question;
        if (question) {
            card.appendChild(Utils.createElement('p', { className: 'text-hint mt-md', textContent: question }));
        }

        // Complete button
        const completeBtn = Utils.createElement('button', {
            className: 'btn btn-primary btn-block mt-md',
            textContent: i18n.t('grammar.complete'),
            onClick: () => this.completeGrammarPhase('discover')
        });

        card.appendChild(completeBtn);
        container.appendChild(card);
    }

    /**
     * Render Understand phase
     */
    renderUnderstandPhase(container, content, locale) {
        const theory = content.theory;
        if (!theory) return;

        const title = locale === 'ru' ? theory.title_ru : theory.title;

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('h3', { className: 'card-title mb-md', textContent: title })
        ]);

        // Render points
        if (theory.points) {
            for (const point of theory.points) {
                const rule = locale === 'ru' ? point.rule_ru : point.rule;
                const pointEl = Utils.createElement('div', { className: 'mb-md' }, [
                    Utils.createElement('p', { textContent: `• ${rule}` }),
                    Utils.createElement('p', { className: 'text-hint', textContent: point.example })
                ]);
                card.appendChild(pointEl);
            }
        }

        // Comparison table
        if (theory.comparison_table) {
            const table = Utils.createElement('table', { className: 'mt-md', style: 'width: 100%; border-collapse: collapse;' });

            for (const row of theory.comparison_table) {
                const tr = Utils.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 8px; border: 1px solid var(--tg-theme-secondary-bg-color);">${Utils.escapeHtml(row.subject)}</td>
                    <td style="padding: 8px; border: 1px solid var(--tg-theme-secondary-bg-color);">${Utils.escapeHtml(row.positive)}</td>
                    <td style="padding: 8px; border: 1px solid var(--tg-theme-secondary-bg-color);">${Utils.escapeHtml(row.negative)}</td>
                    <td style="padding: 8px; border: 1px solid var(--tg-theme-secondary-bg-color);">${Utils.escapeHtml(row.question)}</td>
                `;
                table.appendChild(tr);
            }
            card.appendChild(table);
        }

        const completeBtn = Utils.createElement('button', {
            className: 'btn btn-primary btn-block mt-md',
            textContent: i18n.t('grammar.complete'),
            onClick: () => this.completeGrammarPhase('understand')
        });

        card.appendChild(completeBtn);
        container.appendChild(card);
    }

    /**
     * Render Notice phase
     */
    renderNoticePhase(container, content, locale) {
        const instruction = locale === 'ru' ? content.instruction_ru : content.instruction;

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('p', { className: 'text-hint mb-md', textContent: instruction })
        ]);

        if (content.tasks && content.tasks.length > 0) {
            const task = content.tasks[0];
            card.appendChild(Utils.createElement('div', {
                className: 'reading-text mb-md',
                textContent: task.text
            }));
        }

        const completeBtn = Utils.createElement('button', {
            className: 'btn btn-primary btn-block mt-md',
            textContent: i18n.t('grammar.complete'),
            onClick: () => this.completeGrammarPhase('notice')
        });

        card.appendChild(completeBtn);
        container.appendChild(card);
    }

    /**
     * Render Practice phase
     */
    renderPracticePhase(container, content, locale) {
        const session = Grammar.getPracticeSession();
        if (!session || session.exercises.length === 0) {
            container.innerHTML = `<div class="card"><p class="text-hint">No exercises available</p></div>`;
            return;
        }

        this.practiceSession = {
            exercises: session.exercises,
            currentIndex: 0,
            correct: 0,
            total: session.total,
            passThreshold: session.passThreshold
        };

        this.renderPracticeExercise(container);
    }

    /**
     * Render single practice exercise
     */
    renderPracticeExercise(container) {
        container.innerHTML = '';
        const { exercises, currentIndex, correct, total } = this.practiceSession;

        if (currentIndex >= total) {
            // Show results
            const score = correct / total;
            const passed = score >= this.practiceSession.passThreshold;

            const resultCard = Utils.createElement('div', { className: 'card text-center' }, [
                Utils.createElement('h3', { className: 'card-title mb-md', textContent: passed ? '🎉 Excellent!' : 'Keep Practicing' }),
                Utils.createElement('p', { className: 'mb-md', textContent: `Score: ${correct}/${total} (${Math.round(score * 100)}%)` }),
                Utils.createElement('button', {
                    className: 'btn btn-primary btn-block',
                    textContent: i18n.t('common.next'),
                    onClick: () => this.completeGrammarPhase('practice', { score })
                })
            ]);

            container.appendChild(resultCard);
            return;
        }

        const exercise = exercises[currentIndex];

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('p', { className: 'text-hint mb-sm', textContent: `${currentIndex + 1} / ${total}` }),
            Utils.createElement('div', { className: 'progress mb-md' }, [
                Utils.createElement('div', {
                    className: 'progress-bar',
                    style: `width: ${(currentIndex / total) * 100}%`
                })
            ])
        ]);

        // Render based on exercise type
        if (exercise.type === 'fill_gap_context' || exercise.type === 'fill_gap') {
            card.appendChild(Utils.createElement('p', { className: 'mb-md', textContent: exercise.sentence }));
            const input = Utils.createElement('input', {
                type: 'text',
                className: 'input',
                placeholder: 'Type your answer...',
                id: 'practice-input'
            });
            card.appendChild(input);
        } else if (exercise.type === 'choose_correct' || exercise.type === 'multiple_choice') {
            card.appendChild(Utils.createElement('p', { className: 'mb-md', textContent: exercise.sentence }));

            const optionsList = Utils.createElement('div', { className: 'options-list' });
            exercise.options.forEach((option, idx) => {
                const optionItem = Utils.createElement('div', {
                    className: 'option-item',
                    dataset: { index: idx },
                    onClick: (e) => this.selectOption(e.currentTarget)
                }, [
                    Utils.createElement('div', { className: 'option-radio' }),
                    Utils.createElement('span', { textContent: option })
                ]);
                optionsList.appendChild(optionItem);
            });
            card.appendChild(optionsList);
        } else if (exercise.type === 'error_correction') {
            card.appendChild(Utils.createElement('p', { className: 'mb-sm', textContent: 'Find and correct the error:' }));
            card.appendChild(Utils.createElement('p', { className: 'mb-md', textContent: exercise.incorrect }));
            const input = Utils.createElement('input', {
                type: 'text',
                className: 'input',
                placeholder: 'Type the correct sentence...',
                id: 'practice-input'
            });
            card.appendChild(input);
        }

        const submitBtn = Utils.createElement('button', {
            className: 'btn btn-primary btn-block mt-md',
            textContent: i18n.t('common.submit'),
            onClick: () => this.submitPracticeAnswer()
        });

        card.appendChild(submitBtn);
        container.appendChild(card);
    }

    /**
     * Select option in practice
     */
    selectOption(element) {
        document.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
    }

    /**
     * Submit practice answer
     */
    async submitPracticeAnswer() {
        const { exercises, currentIndex } = this.practiceSession;
        const exercise = exercises[currentIndex];
        let userAnswer;

        if (exercise.type === 'fill_gap_context' || exercise.type === 'fill_gap' || exercise.type === 'error_correction') {
            const input = document.getElementById('practice-input');
            userAnswer = input?.value || '';
        } else {
            const selected = document.querySelector('.option-item.selected');
            userAnswer = selected ? parseInt(selected.dataset.index) : -1;
        }

        const result = await Grammar.submitPracticeAnswer(currentIndex, userAnswer);

        if (result.correct) {
            this.practiceSession.correct++;
            this.showToast(i18n.t('common.correct'));
        } else {
            this.showToast(result.feedback);
        }

        this.practiceSession.currentIndex++;
        setTimeout(() => {
            this.renderPracticeExercise(document.getElementById('lesson-content'));
        }, 1000);
    }

    /**
     * Render Produce phase
     */
    renderProducePhase(container, content, locale) {
        const instruction = locale === 'ru' ? content.instruction_ru : content.instruction;

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('p', { className: 'text-hint mb-md', textContent: instruction }),
            Utils.createElement('textarea', {
                className: 'input textarea',
                placeholder: 'Write your sentences here...',
                id: 'produce-input',
                rows: '8'
            }),
            Utils.createElement('button', {
                className: 'btn btn-primary btn-block mt-md',
                textContent: i18n.t('common.submit'),
                onClick: () => this.submitProducePhase()
            })
        ]);

        if (content.example) {
            card.insertBefore(
                Utils.createElement('div', { className: 'mb-md' }, [
                    Utils.createElement('p', { className: 'text-hint', textContent: 'Example:' }),
                    Utils.createElement('p', { className: 'text-hint', textContent: content.example })
                ]),
                card.querySelector('textarea')
            );
        }

        container.appendChild(card);
    }

    /**
     * Submit produce phase
     */
    submitProducePhase() {
        const input = document.getElementById('produce-input');
        const text = input?.value || '';

        if (text.trim().length < 20) {
            this.showToast('Please write more');
            return;
        }

        this.completeGrammarPhase('produce', { text, feedback: 'Good effort!' });
    }

    /**
     * Render Input Flood phase
     */
    renderInputFloodPhase(container, content, locale) {
        const texts = Grammar.getInputFloodTexts();
        const progress = Grammar.getCurrentState().progress;
        const readCount = progress?.phases?.input_flood || 0;

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('p', { className: 'text-hint mb-md', textContent: i18n.t('grammar.readTexts', { count: 5 }) }),
            Utils.createElement('p', { className: 'mb-md', textContent: `Progress: ${readCount}/5` }),
            Utils.createElement('div', { className: 'progress mb-md' }, [
                Utils.createElement('div', {
                    className: 'progress-bar',
                    style: `width: ${(readCount / 5) * 100}%`
                })
            ])
        ]);

        if (texts.length > 0) {
            const currentText = texts[Math.min(readCount, texts.length - 1)];
            card.appendChild(Utils.createElement('h4', { className: 'mb-sm', textContent: currentText.title }));
            card.appendChild(Utils.createElement('div', { className: 'reading-text mb-md', textContent: currentText.content }));
        }

        if (readCount < 5) {
            card.appendChild(Utils.createElement('button', {
                className: 'btn btn-primary btn-block',
                textContent: 'Mark as Read',
                onClick: () => this.completeGrammarPhase('input_flood')
            }));
        } else {
            card.appendChild(Utils.createElement('button', {
                className: 'btn btn-primary btn-block',
                textContent: i18n.t('common.next'),
                onClick: () => this.switchGrammarPhase('review')
            }));
        }

        container.appendChild(card);
    }

    /**
     * Render Review phase
     */
    renderReviewPhase(container, content, locale) {
        const cards = Grammar.getReviewCards();

        const card = Utils.createElement('div', { className: 'card text-center' }, [
            Utils.createElement('h3', { className: 'card-title mb-md', textContent: '🎉 Topic Completed!' }),
            Utils.createElement('p', { className: 'mb-md', textContent: 'You have completed all phases of this grammar topic.' }),
            Utils.createElement('button', {
                className: 'btn btn-primary btn-block',
                textContent: 'Back to Topics',
                onClick: () => this.showScreen('grammar-screen')
            })
        ]);

        container.appendChild(card);
    }

    /**
     * Complete grammar phase
     */
    async completeGrammarPhase(phase, data = {}) {
        const result = await Grammar.completePhase(phase, data);

        if (result.success) {
            if (result.completed) {
                this.showToast('Topic completed!');
            }

            this.updateGrammarProgress(result.progress);
            this.updatePhaseTabs(result.nextPhase);
            this.loadPhaseContent(result.nextPhase, result.phaseContent);
        }
    }

    // ==================== VOCABULARY ====================

    /**
     * Start vocabulary session
     */
    async startVocabularySession(mode) {
        const modeMap = {
            'receptive': Vocabulary.MODES.RECEPTIVE,
            'productive': Vocabulary.MODES.PRODUCTIVE,
            'spelling': Vocabulary.MODES.SPELLING,
            'timed': Vocabulary.MODES.TIMED
        };

        const session = Vocabulary.startSession(modeMap[mode] || Vocabulary.MODES.RECEPTIVE);

        if (session.cards.length === 0) {
            this.showToast('No cards to review');
            return;
        }

        document.getElementById('flashcard-area')?.classList.remove('hidden');
        this.renderVocabCard();
    }

    /**
     * Render current vocabulary card
     */
    renderVocabCard() {
        const card = Vocabulary.getCurrentCard();
        if (!card) {
            this.showVocabSessionSummary();
            return;
        }

        const mode = Vocabulary.currentSession.mode;
        const rendered = Vocabulary.renderCard(card, mode, false);

        const flashcard = document.getElementById('flashcard');
        flashcard?.classList.remove('flipped');

        const frontWord = document.getElementById('card-front-word');
        const frontTranscription = document.getElementById('card-front-transcription');
        const frontPrompt = document.getElementById('card-front-prompt');

        if (mode === Vocabulary.MODES.RECEPTIVE) {
            if (frontWord) frontWord.textContent = rendered.front.word;
            if (frontTranscription) frontTranscription.textContent = rendered.front.transcription;
            if (frontPrompt) frontPrompt.textContent = rendered.front.prompt;
        } else {
            if (frontWord) frontWord.textContent = rendered.front.translation;
            if (frontTranscription) frontTranscription.textContent = '';
            if (frontPrompt) frontPrompt.textContent = rendered.front.prompt;
        }

        document.getElementById('show-answer-btn')?.classList.remove('hidden');
        document.getElementById('answer-buttons')?.classList.add('hidden');

        this.updateVocabProgress();
    }

    /**
     * Show vocabulary answer
     */
    showVocabAnswer() {
        const card = Vocabulary.getCurrentCard();
        const mode = Vocabulary.currentSession.mode;
        const rendered = Vocabulary.renderCard(card, mode, true);

        const flashcard = document.getElementById('flashcard');
        flashcard?.classList.add('flipped');

        const backWord = document.getElementById('card-back-word');
        const backTranslation = document.getElementById('card-back-translation');

        if (mode === Vocabulary.MODES.RECEPTIVE) {
            if (backWord) backWord.textContent = rendered.back.translation;
            if (backTranslation) backTranslation.textContent = rendered.back.definition || '';
        } else {
            if (backWord) backWord.textContent = rendered.back.word;
            if (backTranslation) backTranslation.textContent = rendered.back.transcription || '';
        }

        document.getElementById('show-answer-btn')?.classList.add('hidden');
        document.getElementById('answer-buttons')?.classList.remove('hidden');
    }

    /**
     * Submit vocabulary answer
     */
    async submitVocabAnswer(quality) {
        const result = await Vocabulary.processAnswer(quality);

        if (result.finished) {
            this.showVocabSessionSummary();
        } else {
            this.renderVocabCard();
        }
    }

    /**
     * Update vocabulary progress display
     */
    updateVocabProgress() {
        const session = Vocabulary.currentSession;
        if (!session) return;

        const progress = session.currentIndex / session.cards.length;
        const progressBar = document.getElementById('session-progress');
        if (progressBar) progressBar.style.width = `${progress * 100}%`;

        const counter = document.getElementById('session-counter');
        if (counter) counter.textContent = `${session.currentIndex} / ${session.cards.length}`;
    }

    /**
     * Show vocabulary session summary
     */
    showVocabSessionSummary() {
        const summary = Vocabulary.getSessionSummary();

        document.getElementById('flashcard-area')?.classList.add('hidden');

        this.showToast(`Session complete! ${summary.correct}/${summary.total} correct (${Math.round(summary.accuracy * 100)}%)`);
    }

    /**
     * Update vocabulary stats display
     */
    updateVocabStats() {
        const stats = Vocabulary.getStats();

        const vocabCount = document.getElementById('vocab-count');
        if (vocabCount) vocabCount.textContent = `${stats.total} ${i18n.t('dashboard.words')}`;

        const receptiveCount = document.getElementById('receptive-count');
        if (receptiveCount) receptiveCount.textContent = stats.receptive.learned;

        const productiveCount = document.getElementById('productive-count');
        if (productiveCount) productiveCount.textContent = stats.productive.learned;
    }

    // ==================== READING ====================

    /**
     * Load reading texts for level
     */
    async loadReadingTexts(level) {
        const container = document.getElementById('reading-list');
        if (!container) return;

        container.innerHTML = `<div class="card"><p class="text-hint">${i18n.t('common.loading')}</p></div>`;

        try {
            // Load reading texts from data files
            const texts = [];
            for (let i = 1; i <= 20; i++) {
                const id = `${level.toLowerCase()}_reading_${i.toString().padStart(2, '0')}`;
                try {
                    const response = await fetch(`data/reading/${level}/${id}.json`);
                    if (response.ok) {
                        texts.push(await response.json());
                    }
                } catch (e) {
                    // Skip missing files
                }
            }

            this.renderReadingList(container, texts, level);
        } catch (e) {
            container.innerHTML = `<div class="card"><p class="text-hint">Error loading texts</p></div>`;
        }
    }

    /**
     * Render reading texts list
     */
    renderReadingList(container, texts, level) {
        container.innerHTML = '';

        if (texts.length === 0) {
            container.innerHTML = `<div class="card"><p class="text-hint">No texts available for this level</p></div>`;
            return;
        }

        const list = Utils.createElement('div', { className: 'topic-list' });

        for (const text of texts) {
            const item = Utils.createElement('div', {
                className: 'topic-item',
                onClick: () => this.openReadingText(text, level)
            }, [
                Utils.createElement('div', { className: 'topic-info' }, [
                    Utils.createElement('div', {
                        className: 'topic-title',
                        textContent: i18n.getLocale() === 'ru' ? text.title_ru || text.title : text.title
                    }),
                    Utils.createElement('div', {
                        className: 'topic-subtitle',
                        textContent: `${text.word_count} words • ${text.topic || level}`
                    })
                ]),
                Utils.createElement('div', { className: 'topic-status new', textContent: '○' })
            ]);
            list.appendChild(item);
        }

        container.appendChild(list);
    }

    /**
     * Open reading text
     */
    async openReadingText(text, level) {
        this.currentReadingText = text;
        this.readingAnswers = {};

        const titleEl = document.getElementById('reading-title');
        if (titleEl) titleEl.textContent = i18n.getLocale() === 'ru' ? text.title_ru || text.title : text.title;

        const infoEl = document.getElementById('reading-info');
        if (infoEl) infoEl.textContent = `${level} • ${text.word_count} words • ${text.topic || ''}`;

        const contentEl = document.getElementById('reading-content');
        if (contentEl) contentEl.textContent = text.text;

        // Render questions
        this.renderReadingQuestions(text.questions);

        this.showScreen('reading-text-screen');
    }

    /**
     * Render reading questions
     */
    renderReadingQuestions(questions) {
        const container = document.getElementById('reading-questions');
        if (!container) return;

        container.innerHTML = '';

        questions.forEach((q, idx) => {
            const questionEl = Utils.createElement('div', { className: 'question-item' }, [
                Utils.createElement('p', { className: 'question-text', textContent: `${idx + 1}. ${q.question}` })
            ]);

            if (q.type === 'multiple_choice') {
                const optionsList = Utils.createElement('div', { className: 'options-list' });
                q.options.forEach((opt, optIdx) => {
                    const optionItem = Utils.createElement('div', {
                        className: 'option-item',
                        dataset: { question: idx, option: optIdx },
                        onClick: (e) => this.selectReadingOption(e.currentTarget, idx)
                    }, [
                        Utils.createElement('div', { className: 'option-radio' }),
                        Utils.createElement('span', { textContent: opt })
                    ]);
                    optionsList.appendChild(optionItem);
                });
                questionEl.appendChild(optionsList);
            } else if (q.type === 'true_false') {
                const optionsList = Utils.createElement('div', { className: 'options-list' });
                ['True', 'False'].forEach((opt, optIdx) => {
                    const optionItem = Utils.createElement('div', {
                        className: 'option-item',
                        dataset: { question: idx, option: optIdx === 0 },
                        onClick: (e) => this.selectReadingOption(e.currentTarget, idx)
                    }, [
                        Utils.createElement('div', { className: 'option-radio' }),
                        Utils.createElement('span', { textContent: opt })
                    ]);
                    optionsList.appendChild(optionItem);
                });
                questionEl.appendChild(optionsList);
            } else if (q.type === 'fill_gap') {
                questionEl.appendChild(Utils.createElement('input', {
                    type: 'text',
                    className: 'input mt-sm',
                    placeholder: 'Type your answer...',
                    dataset: { question: idx },
                    onInput: (e) => {
                        this.readingAnswers[idx] = e.target.value;
                    }
                }));
            }

            container.appendChild(questionEl);
        });
    }

    /**
     * Select reading option
     */
    selectReadingOption(element, questionIdx) {
        const questionItems = document.querySelectorAll(`.option-item[data-question="${questionIdx}"]`);
        questionItems.forEach(item => item.classList.remove('selected'));
        element.classList.add('selected');

        const optionValue = element.dataset.option;
        this.readingAnswers[questionIdx] = optionValue === 'true' || optionValue === 'false'
            ? optionValue === 'true'
            : parseInt(optionValue);
    }

    /**
     * Check reading answers
     */
    checkReadingAnswers() {
        if (!this.currentReadingText) return;

        const questions = this.currentReadingText.questions;
        let correct = 0;

        questions.forEach((q, idx) => {
            const userAnswer = this.readingAnswers[idx];
            const correctAnswer = q.type === 'fill_gap' ? q.answer : q.correct;

            let isCorrect = false;
            if (q.type === 'fill_gap') {
                isCorrect = userAnswer?.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
            } else {
                isCorrect = userAnswer === correctAnswer;
            }

            if (isCorrect) correct++;

            // Highlight correct/incorrect
            const questionItems = document.querySelectorAll(`.option-item[data-question="${idx}"]`);
            questionItems.forEach(item => {
                const optVal = item.dataset.option;
                const isThis = optVal === 'true' || optVal === 'false'
                    ? (optVal === 'true') === correctAnswer
                    : parseInt(optVal) === correctAnswer;

                if (isThis) {
                    item.classList.add('correct');
                } else if (item.classList.contains('selected')) {
                    item.classList.add('incorrect');
                }
            });
        });

        this.showToast(`Score: ${correct}/${questions.length} (${Math.round(correct / questions.length * 100)}%)`);
    }

    // ==================== IMMERSION ====================

    /**
     * Load immersion quizzes for level
     */
    async loadImmersionQuizzes(level) {
        const container = document.getElementById('immersion-list');
        if (!container) return;

        container.innerHTML = `<div class="card"><p class="text-hint">${i18n.t('common.loading')}</p></div>`;

        try {
            const quizzes = [];
            for (let i = 1; i <= 15; i++) {
                const id = `${level.toLowerCase()}_immersion_${i.toString().padStart(2, '0')}`;
                try {
                    const response = await fetch(`data/immersion/${level}/${id}.json`);
                    if (response.ok) {
                        quizzes.push(await response.json());
                    }
                } catch (e) {
                    // Skip missing files
                }
            }

            this.renderImmersionList(container, quizzes, level);
        } catch (e) {
            container.innerHTML = `<div class="card"><p class="text-hint">Error loading quizzes</p></div>`;
        }
    }

    /**
     * Render immersion quizzes list
     */
    renderImmersionList(container, quizzes, level) {
        container.innerHTML = '';

        if (quizzes.length === 0) {
            container.innerHTML = `<div class="card"><p class="text-hint">No quizzes available for this level</p></div>`;
            return;
        }

        const list = Utils.createElement('div', { className: 'topic-list' });

        for (const quiz of quizzes) {
            const item = Utils.createElement('div', {
                className: 'topic-item',
                onClick: () => this.openImmersionQuiz(quiz, level)
            }, [
                Utils.createElement('div', { className: 'topic-info' }, [
                    Utils.createElement('div', {
                        className: 'topic-title',
                        textContent: i18n.getLocale() === 'ru' ? quiz.title_ru || quiz.title : quiz.title
                    }),
                    Utils.createElement('div', {
                        className: 'topic-subtitle',
                        textContent: `${quiz.duration_seconds}s • ${quiz.media_type}`
                    })
                ]),
                Utils.createElement('div', { className: 'topic-status new', textContent: '○' })
            ]);
            list.appendChild(item);
        }

        container.appendChild(list);
    }

    /**
     * Open immersion quiz
     */
    openImmersionQuiz(quiz, level) {
        this.currentImmersionQuiz = quiz;
        this.immersionAnswers = {};

        const titleEl = document.getElementById('immersion-title');
        if (titleEl) titleEl.textContent = i18n.getLocale() === 'ru' ? quiz.title_ru || quiz.title : quiz.title;

        const infoEl = document.getElementById('immersion-info');
        if (infoEl) infoEl.textContent = `${level} • ${quiz.duration_seconds}s • ${quiz.media_type}`;

        const transcriptEl = document.getElementById('immersion-transcript');
        if (transcriptEl) transcriptEl.textContent = quiz.transcript;

        const transcriptCard = document.getElementById('immersion-transcript-card');
        if (transcriptCard) transcriptCard.style.display = 'none';

        this.renderImmersionQuestions(quiz.questions);

        this.showScreen('immersion-quiz-screen');
    }

    /**
     * Render immersion questions
     */
    renderImmersionQuestions(questions) {
        const container = document.getElementById('immersion-questions');
        if (!container) return;

        container.innerHTML = '';

        questions.forEach((q, idx) => {
            const questionEl = Utils.createElement('div', { className: 'question-item' }, [
                Utils.createElement('p', { className: 'question-text', textContent: `${idx + 1}. ${q.question}` })
            ]);

            if (q.type === 'multiple_choice') {
                const optionsList = Utils.createElement('div', { className: 'options-list' });
                q.options.forEach((opt, optIdx) => {
                    const optionItem = Utils.createElement('div', {
                        className: 'option-item',
                        dataset: { question: idx, option: optIdx },
                        onClick: (e) => this.selectImmersionOption(e.currentTarget, idx)
                    }, [
                        Utils.createElement('div', { className: 'option-radio' }),
                        Utils.createElement('span', { textContent: opt })
                    ]);
                    optionsList.appendChild(optionItem);
                });
                questionEl.appendChild(optionsList);
            } else if (q.type === 'true_false') {
                const optionsList = Utils.createElement('div', { className: 'options-list' });
                ['True', 'False'].forEach((opt, optIdx) => {
                    const optionItem = Utils.createElement('div', {
                        className: 'option-item',
                        dataset: { question: idx, option: optIdx === 0 },
                        onClick: (e) => this.selectImmersionOption(e.currentTarget, idx)
                    }, [
                        Utils.createElement('div', { className: 'option-radio' }),
                        Utils.createElement('span', { textContent: opt })
                    ]);
                    optionsList.appendChild(optionItem);
                });
                questionEl.appendChild(optionsList);
            } else if (q.type === 'fill_gap') {
                questionEl.appendChild(Utils.createElement('input', {
                    type: 'text',
                    className: 'input mt-sm',
                    placeholder: 'Type your answer...',
                    dataset: { question: idx },
                    onInput: (e) => {
                        this.immersionAnswers[idx] = e.target.value;
                    }
                }));
            }

            container.appendChild(questionEl);
        });
    }

    /**
     * Select immersion option
     */
    selectImmersionOption(element, questionIdx) {
        const questionItems = document.querySelectorAll(`#immersion-questions .option-item[data-question="${questionIdx}"]`);
        questionItems.forEach(item => item.classList.remove('selected'));
        element.classList.add('selected');

        const optionValue = element.dataset.option;
        this.immersionAnswers[questionIdx] = optionValue === 'true' || optionValue === 'false'
            ? optionValue === 'true'
            : parseInt(optionValue);
    }

    /**
     * Check immersion answers
     */
    checkImmersionAnswers() {
        if (!this.currentImmersionQuiz) return;

        const questions = this.currentImmersionQuiz.questions;
        let correct = 0;

        questions.forEach((q, idx) => {
            const userAnswer = this.immersionAnswers[idx];
            const correctAnswer = q.type === 'fill_gap' ? q.answer : q.correct;

            let isCorrect = false;
            if (q.type === 'fill_gap') {
                isCorrect = userAnswer?.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
            } else {
                isCorrect = userAnswer === correctAnswer;
            }

            if (isCorrect) correct++;

            const questionItems = document.querySelectorAll(`#immersion-questions .option-item[data-question="${idx}"]`);
            questionItems.forEach(item => {
                const optVal = item.dataset.option;
                const isThis = optVal === 'true' || optVal === 'false'
                    ? (optVal === 'true') === correctAnswer
                    : parseInt(optVal) === correctAnswer;

                if (isThis) {
                    item.classList.add('correct');
                } else if (item.classList.contains('selected')) {
                    item.classList.add('incorrect');
                }
            });
        });

        this.showToast(`Score: ${correct}/${questions.length} (${Math.round(correct / questions.length * 100)}%)`);
    }

    /**
     * Toggle transcript visibility
     */
    toggleTranscript() {
        const card = document.getElementById('immersion-transcript-card');
        if (card) {
            card.style.display = card.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Play media (TTS)
     */
    playMedia() {
        if (!this.currentImmersionQuiz?.transcript) return;

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(this.currentImmersionQuiz.transcript);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }

    /**
     * Pause media
     */
    pauseMedia() {
        if ('speechSynthesis' in window) {
            speechSynthesis.pause();
        }
    }

    /**
     * Replay media
     */
    replayMedia() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            this.playMedia();
        }
    }

    // ==================== PLACEMENT TEST ====================

    /**
     * Start placement test
     */
    async startPlacementTest() {
        const testInfo = await PlacementTest.startTest();

        this.placementTestState = {
            started: true,
            timeLimit: testInfo.timeLimit * 60 * 1000,
            startTime: Date.now()
        };

        await this.showNextPlacementQuestion();
    }

    /**
     * Show next placement question
     */
    async showNextPlacementQuestion() {
        const questionData = await PlacementTest.getNextQuestion();

        if (questionData.finished) {
            this.finishPlacementTest();
            return;
        }

        this.renderPlacementQuestion(questionData);
    }

    /**
     * Render placement question
     */
    renderPlacementQuestion(data) {
        const container = document.getElementById('placement-screen');
        if (!container) return;

        container.innerHTML = '';

        const card = Utils.createElement('div', { className: 'card' }, [
            Utils.createElement('div', { className: 'flex justify-between mb-md' }, [
                Utils.createElement('span', { textContent: `${i18n.t('placement.question')} ${data.questionNumber}` }),
                Utils.createElement('span', { className: 'text-hint', textContent: data.level })
            ]),
            Utils.createElement('div', { className: 'progress mb-md' }, [
                Utils.createElement('div', {
                    className: 'progress-bar',
                    style: `width: ${Math.min(data.progress * 100, 100)}%`
                })
            ])
        ]);

        // Question content based on type
        if (data.type === 'reading') {
            card.appendChild(Utils.createElement('div', {
                className: 'reading-text mb-md',
                style: 'font-size: 14px; max-height: 150px; overflow-y: auto;',
                textContent: data.text
            }));
        } else if (data.type === 'listening' && data.scenario) {
            card.appendChild(Utils.createElement('div', {
                className: 'reading-text mb-md',
                style: 'font-style: italic;',
                textContent: data.scenario
            }));
        }

        card.appendChild(Utils.createElement('p', {
            className: 'mb-md',
            textContent: data.question || data.sentence
        }));

        // Options
        const optionsList = Utils.createElement('div', { className: 'options-list' });
        data.options.forEach((opt, idx) => {
            const optionItem = Utils.createElement('div', {
                className: 'option-item',
                dataset: { option: idx },
                onClick: (e) => {
                    document.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
                    e.currentTarget.classList.add('selected');
                }
            }, [
                Utils.createElement('div', { className: 'option-radio' }),
                Utils.createElement('span', { textContent: opt })
            ]);
            optionsList.appendChild(optionItem);
        });
        card.appendChild(optionsList);

        card.appendChild(Utils.createElement('button', {
            className: 'btn btn-primary btn-block mt-md',
            textContent: i18n.t('common.next'),
            onClick: () => this.submitPlacementAnswer()
        }));

        container.appendChild(card);
        container.classList.remove('hidden');
    }

    /**
     * Submit placement answer
     */
    async submitPlacementAnswer() {
        const selected = document.querySelector('.option-item.selected');
        if (!selected) {
            this.showToast('Please select an answer');
            return;
        }

        const answerIndex = parseInt(selected.dataset.option);
        const result = PlacementTest.submitAnswer(answerIndex);

        // Brief feedback
        if (result.correct) {
            selected.classList.add('correct');
        } else {
            selected.classList.add('incorrect');
        }

        await Utils.sleep(500);
        await this.showNextPlacementQuestion();
    }

    /**
     * Finish placement test
     */
    async finishPlacementTest() {
        const results = await PlacementTest.finishTest();

        const container = document.getElementById('placement-screen');
        if (!container) return;

        const locale = i18n.getLocale();
        const recommendation = results.recommendation;

        container.innerHTML = '';

        const card = Utils.createElement('div', { className: 'card text-center' }, [
            Utils.createElement('h2', { className: 'card-title mb-md', textContent: i18n.t('placement.results') }),
            Utils.createElement('div', {
                className: `level-badge ${results.overallLevel} mb-md`,
                style: 'width: 80px; height: 80px; font-size: 24px; margin: 0 auto;',
                textContent: results.overallLevel
            }),
            Utils.createElement('p', { className: 'mb-md', textContent: `${i18n.t('placement.yourLevel')}: ${results.overallLevel}` }),
            Utils.createElement('p', {
                className: 'text-hint mb-md',
                textContent: recommendation.general[locale][results.overallLevel]
            })
        ]);

        if (recommendation.weakArea) {
            card.appendChild(Utils.createElement('p', {
                className: 'text-hint mb-md',
                style: 'color: var(--warning);',
                textContent: recommendation.weakArea.suggestion[locale]
            }));
        }

        card.appendChild(Utils.createElement('button', {
            className: 'btn btn-primary btn-block',
            textContent: i18n.t('placement.startLearning'),
            onClick: () => {
                this.screenHistory = [];
                this.showScreen('dashboard-screen', false);
                window.location.reload();
            }
        }));

        container.appendChild(card);
    }

    // ==================== UTILITIES ====================

    /**
     * Safely render text with <highlight> tags converted to <mark>
     * Escapes all other HTML to prevent XSS
     */
    renderTextWithHighlights(text) {
        if (!text) return '';

        // Split by highlight tags
        const parts = text.split(/(<highlight>|<\/highlight>)/);
        let result = '';
        let inHighlight = false;

        for (const part of parts) {
            if (part === '<highlight>') {
                result += '<mark>';
                inHighlight = true;
            } else if (part === '</highlight>') {
                result += '</mark>';
                inHighlight = false;
            } else {
                // Escape HTML in text parts
                result += Utils.escapeHtml(part);
            }
        }

        return result;
    }

    /**
     * Show toast notification
     */
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), duration);
        }

        // Telegram haptic feedback
        if (this.tg?.HapticFeedback) {
            this.tg.HapticFeedback.notificationOccurred('success');
        }
    }

    /**
     * Refresh current screen
     */
    refreshCurrentScreen() {
        const screenToModule = {
            'grammar-screen': 'grammar',
            'reading-screen': 'reading',
            'immersion-screen': 'immersion',
            'vocabulary-screen': 'vocabulary'
        };

        const module = screenToModule[this.currentScreen];
        if (module) {
            this.initModuleScreen(module);
        }
    }
}

const ui = new UI();
export default ui;
