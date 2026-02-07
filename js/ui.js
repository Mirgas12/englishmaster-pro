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
        // Initialize vocabulary with error handling
        try {
            await Vocabulary.init();
        } catch (e) {
            console.warn('Vocabulary init warning:', e);
            // Continue without vocabulary - non-critical
        }

        // These modules load data dynamically, no init needed
        // Grammar, Reading, Immersion - load on demand
    }

    /**
     * Apply user settings
     */
    applySettings() {
        // Ensure settings object exists
        if (!this.profile.settings) {
            this.profile.settings = {
                darkMode: false,
                language: 'ru',
                dailyGoalMinutes: 30,
                notifications: true,
                soundEffects: true
            };
        }

        const settings = this.profile.settings;

        // Dark mode
        this.applyDarkMode(settings.darkMode || false);
        const darkModeToggle = document.getElementById('setting-dark-mode');
        if (darkModeToggle) darkModeToggle.checked = settings.darkMode || false;

        // Language
        const lang = settings.language || 'ru';
        i18n.setLocale(lang);
        const langSelect = document.getElementById('setting-language');
        if (langSelect) langSelect.value = lang;

        // Daily goal
        const goalSelect = document.getElementById('setting-daily-goal');
        if (goalSelect) goalSelect.value = settings.dailyGoalMinutes || 30;

        // Update all UI text with current language
        this.updateUIText();
    }

    /**
     * Apply dark mode with proper color overrides
     */
    applyDarkMode(isDark) {
        const root = document.documentElement;

        if (isDark) {
            root.classList.add('dark-mode');
            // Force dark colors via inline styles to override Telegram theme
            root.style.setProperty('--tg-theme-bg-color', '#1a1a1a', 'important');
            root.style.setProperty('--tg-theme-text-color', '#ffffff', 'important');
            root.style.setProperty('--tg-theme-hint-color', '#888888', 'important');
            root.style.setProperty('--tg-theme-secondary-bg-color', '#2d2d2d', 'important');
            root.style.setProperty('--tg-theme-button-color', '#5ebbff', 'important');
            document.body.style.backgroundColor = '#1a1a1a';
            document.body.style.color = '#ffffff';
        } else {
            root.classList.remove('dark-mode');
            // Restore Telegram theme or defaults
            if (this.tg?.themeParams) {
                const tp = this.tg.themeParams;
                root.style.setProperty('--tg-theme-bg-color', tp.bg_color || '#ffffff');
                root.style.setProperty('--tg-theme-text-color', tp.text_color || '#000000');
                root.style.setProperty('--tg-theme-hint-color', tp.hint_color || '#999999');
                root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color || '#f0f0f0');
                root.style.setProperty('--tg-theme-button-color', tp.button_color || '#2481cc');
            } else {
                root.style.setProperty('--tg-theme-bg-color', '#ffffff');
                root.style.setProperty('--tg-theme-text-color', '#000000');
                root.style.setProperty('--tg-theme-hint-color', '#999999');
                root.style.setProperty('--tg-theme-secondary-bg-color', '#f0f0f0');
                root.style.setProperty('--tg-theme-button-color', '#2481cc');
            }
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
        }
    }

    /**
     * Update all UI text based on current language
     */
    updateUIText() {
        const isRu = i18n.getLocale() === 'ru';

        // Update navigation
        const navItems = {
            'dashboard': i18n.t('nav.home'),
            'study': i18n.t('nav.study'),
            'progress': i18n.t('nav.progress'),
            'profile': i18n.t('nav.profile')
        };

        document.querySelectorAll('.nav-item').forEach(item => {
            const nav = item.dataset.nav;
            if (navItems[nav]) {
                const span = item.querySelector('span:not(.nav-icon)');
                if (span) span.textContent = navItems[nav];
            }
        });

        // Update profile labels
        const profileLevel = document.getElementById('profile-level');
        if (profileLevel) {
            profileLevel.textContent = i18n.t('profile.level', { level: this.profile?.levels?.overall || 'A1' });
        }

        // Update module names on dashboard
        const moduleNames = {
            'vocabulary': i18n.t('modules.vocabulary'),
            'grammar': i18n.t('modules.grammar'),
            'reading': i18n.t('modules.reading'),
            'listening': i18n.t('modules.listening'),
            'writing': i18n.t('modules.writing'),
            'speaking': i18n.t('modules.speaking'),
            'immersion': i18n.t('modules.immersion'),
            'ielts': i18n.t('modules.ielts')
        };

        document.querySelectorAll('.module-card[data-module]').forEach(card => {
            const module = card.dataset.module;
            if (moduleNames[module]) {
                const nameEl = card.querySelector('.module-name');
                if (nameEl) nameEl.textContent = moduleNames[module];
            }
        });

        // Update vocabulary screen
        const vocabScreen = document.getElementById('vocabulary-screen');
        if (vocabScreen) {
            const title = vocabScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('vocab.chooseMode');

            const modes = vocabScreen.querySelectorAll('[data-mode]');
            modes.forEach(btn => {
                const mode = btn.dataset.mode;
                if (mode === 'receptive') btn.textContent = i18n.t('vocab.receptiveMode');
                if (mode === 'productive') btn.textContent = i18n.t('vocab.productiveMode');
                if (mode === 'spelling') btn.textContent = i18n.t('vocab.spellingMode');
                if (mode === 'timed') btn.textContent = i18n.t('vocab.timedMode');
            });
        }

        // Update speaking screen
        const speakingScreen = document.getElementById('speaking-screen');
        if (speakingScreen) {
            const titles = speakingScreen.querySelectorAll('.card-title');
            if (titles[1]) titles[1].textContent = isRu ? 'Режим практики' : 'Practice Mode';

            const modes = speakingScreen.querySelectorAll('[data-speaking-mode]');
            modes.forEach(btn => {
                const mode = btn.dataset.speakingMode;
                if (mode === 'pronunciation') btn.textContent = i18n.t('speaking.pronunciation');
                if (mode === 'shadowing') btn.textContent = i18n.t('speaking.shadowing');
                if (mode === 'conversation') btn.textContent = i18n.t('speaking.conversation');
            });
        }

        // Update listening screen
        const listeningScreen = document.getElementById('listening-screen');
        if (listeningScreen) {
            const titles = listeningScreen.querySelectorAll('.card-title');
            if (titles[0]) titles[0].textContent = i18n.t('listening.title');
            if (titles[1]) titles[1].textContent = i18n.t('listening.chooseType');

            const modes = listeningScreen.querySelectorAll('[data-listening-mode]');
            modes.forEach(btn => {
                const mode = btn.dataset.listeningMode;
                if (mode === 'dictation') btn.textContent = i18n.t('listening.dictation');
                if (mode === 'comprehension') btn.textContent = i18n.t('listening.comprehension');
                if (mode === 'transcription') btn.textContent = i18n.t('listening.transcription');
            });
        }

        // Update writing screen
        const writingScreen = document.getElementById('writing-screen');
        if (writingScreen) {
            const title = writingScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('writing.title');
            const submitBtn = document.getElementById('submit-writing');
            if (submitBtn) submitBtn.textContent = i18n.t('writing.submit');
        }

        // Update IELTS screen
        const ieltsScreen = document.getElementById('ielts-screen');
        if (ieltsScreen) {
            const title = ieltsScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('ielts.title');
            const fullTestBtn = document.getElementById('ielts-full-test');
            if (fullTestBtn) fullTestBtn.textContent = i18n.t('ielts.fullTest');
            const sectionTestBtn = document.getElementById('ielts-section-test');
            if (sectionTestBtn) sectionTestBtn.textContent = i18n.t('ielts.sectionTest');
        }

        // Update grammar screen
        const grammarScreen = document.getElementById('grammar-screen');
        if (grammarScreen) {
            const title = grammarScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('grammar.topics');
        }

        // Update reading screen
        const readingScreen = document.getElementById('reading-screen');
        if (readingScreen) {
            const title = readingScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('reading.title');
        }

        // Update vocabulary section labels
        const vocabTitle = document.querySelector('.vocab-section .card-title');
        if (vocabTitle) vocabTitle.textContent = i18n.t('dashboard.vocabulary');

        // Update Study Hub
        const studyScreen = document.getElementById('study-screen');
        if (studyScreen) {
            const quickActionsTitle = studyScreen.querySelector('.card-title');
            if (quickActionsTitle && quickActionsTitle.textContent.includes('Quick')) {
                quickActionsTitle.textContent = i18n.t('study.quickActions');
            }
            const smartBtn = document.getElementById('start-smart-session');
            if (smartBtn) smartBtn.textContent = i18n.t('study.smartSession');
            const reviewBtn = document.getElementById('start-review-session');
            if (reviewBtn) reviewBtn.textContent = i18n.t('study.reviewDue');
        }

        // Update progress screen
        const progressScreen = document.getElementById('progress-screen');
        if (progressScreen) {
            const title = progressScreen.querySelector('.card-title');
            if (title) title.textContent = i18n.t('progress.title');
        }

        // Update profile screen
        const profileScreen = document.getElementById('profile-screen');
        if (profileScreen) {
            const settingsTitle = profileScreen.querySelector('.card-title');
            if (settingsTitle) settingsTitle.textContent = i18n.t('profile.settings');
        }

        // Update i18n-marked elements
        i18n.updateUI();
    }

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        // User info from Telegram
        const tgUser = this.tg?.initDataUnsafe?.user;
        const userName = tgUser?.first_name || 'User';
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

        // Update profile screen info
        this.updateProfileScreen();
    }

    /**
     * Update profile screen with user data
     */
    updateProfileScreen() {
        const tgUser = this.tg?.initDataUnsafe?.user;

        // Profile name
        const profileName = document.getElementById('profile-name');
        if (profileName) {
            if (tgUser) {
                const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
                profileName.textContent = fullName || tgUser.username || 'User';
            } else {
                profileName.textContent = 'User';
            }
        }

        // Avatar
        const avatar = document.getElementById('profile-avatar');
        if (avatar) {
            const initial = (tgUser?.first_name || 'U')[0].toUpperCase();
            avatar.textContent = initial;
        }

        // Level
        const profileLevel = document.getElementById('profile-level');
        if (profileLevel) {
            const level = this.profile.levels?.overall || 'A1';
            profileLevel.textContent = i18n.t('profile.level', { level });
        }

        // Joined date
        const profileJoined = document.getElementById('profile-joined');
        if (profileJoined) {
            const createdAt = this.profile.createdAt || Date.now();
            const date = new Date(createdAt);
            const locale = i18n.getLocale();
            const monthNames = locale === 'ru'
                ? ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
                : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const dateStr = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            profileJoined.textContent = i18n.t('profile.joined', { date: dateStr });
        }
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

        // Notify Telegram that app is ready
        this.tg.ready();

        // Expand to fullscreen immediately
        this.tg.expand();

        // Request fullscreen mode (for newer Telegram versions)
        if (this.tg.requestFullscreen) {
            this.tg.requestFullscreen();
        }

        // Disable vertical swipes to prevent accidental closing
        if (this.tg.disableVerticalSwipes) {
            this.tg.disableVerticalSwipes();
        }

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

        // Load user profile from Telegram
        this.loadTelegramUser();
    }

    /**
     * Load Telegram user data into profile
     */
    loadTelegramUser() {
        if (!this.tg?.initDataUnsafe?.user) return;

        const user = this.tg.initDataUnsafe.user;

        // Update profile name display
        const profileName = document.getElementById('profile-name');
        if (profileName) {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
            profileName.textContent = fullName || user.username || 'User';
        }

        // Update avatar with first letter
        const avatar = document.getElementById('profile-avatar');
        if (avatar) {
            const initial = (user.first_name || user.username || 'U')[0].toUpperCase();
            avatar.textContent = initial;
        }

        // Update greeting on dashboard
        const greeting = document.getElementById('user-greeting');
        if (greeting) {
            const name = user.first_name || user.username || 'User';
            greeting.textContent = i18n.t('dashboard.greeting', { name });
        }
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

        // Settings changes - Language
        document.getElementById('setting-language')?.addEventListener('change', async (e) => {
            // Ensure settings object exists
            if (!this.profile.settings) {
                this.profile.settings = {};
            }
            this.profile.settings.language = e.target.value;
            i18n.setLocale(e.target.value);
            await Database.saveProfile(this.profile);
            // Update all UI text
            this.updateUIText();
            this.showToast(i18n.t('common.saved'));
        });

        // Dark mode toggle
        document.getElementById('setting-dark-mode')?.addEventListener('change', async (e) => {
            // Ensure settings object exists
            if (!this.profile.settings) {
                this.profile.settings = {};
            }
            const isDark = e.target.checked;
            this.applyDarkMode(isDark);
            this.profile.settings.darkMode = isDark;
            await Database.saveProfile(this.profile);
            this.showToast(i18n.t('common.saved'));
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

        // Speaking mode buttons
        document.querySelectorAll('[data-speaking-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.speakingMode;
                this.startSpeakingSession(mode);
            });
        });

        // Listening mode buttons
        document.querySelectorAll('[data-listening-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.listeningMode;
                this.startListeningSession(mode);
            });
        });

        // IELTS buttons
        document.getElementById('ielts-full-test')?.addEventListener('click', () => {
            this.startIELTSTest('full');
        });

        document.getElementById('ielts-section-test')?.addEventListener('click', () => {
            this.startIELTSTest('section');
        });

        // IELTS section cards
        document.querySelectorAll('[data-ielts]').forEach(card => {
            card.addEventListener('click', () => {
                const section = card.dataset.ielts;
                this.openIELTSSection(section);
            });
        });

        // Quick Actions buttons
        document.getElementById('start-smart-session')?.addEventListener('click', () => {
            this.startSmartSession();
        });

        document.getElementById('start-review-session')?.addEventListener('click', () => {
            this.startReviewSession();
        });

        // Submit writing button
        document.getElementById('submit-writing')?.addEventListener('click', () => {
            this.submitWritingTask();
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
                // Immersion section is not implemented per TZ - show placeholder
                this.showImmersionPlaceholder();
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
     * Show Immersion section with AI-generated recommendations
     */
    showImmersionPlaceholder() {
        const container = document.getElementById('immersion-list');
        if (!container) return;

        const isRu = i18n.getLocale() === 'ru';
        const level = this.profile.levels?.overall || 'A1';

        container.innerHTML = `
            <div class="card">
                <p class="text-hint mb-md">
                    ${isRu
                        ? `Рекомендации фильмов и сериалов для уровня <strong>${level}</strong>. Смотрите с английскими субтитрами для лучшего результата!`
                        : `Movie and TV show recommendations for level <strong>${level}</strong>. Watch with English subtitles for best results!`
                    }
                </p>
                <button class="btn btn-primary btn-block" id="generate-recommendations">
                    ${isRu ? '🎬 Получить рекомендации' : '🎬 Get Recommendations'}
                </button>
            </div>
            <div id="recommendations-list" class="mt-md"></div>
        `;

        // Add event listener for generate button
        document.getElementById('generate-recommendations')?.addEventListener('click', () => {
            this.generateImmersionRecommendations(level);
        });

        // Auto-load recommendations on first visit
        this.generateImmersionRecommendations(level);
    }

    /**
     * Generate movie/series recommendations using AI
     */
    async generateImmersionRecommendations(level) {
        const container = document.getElementById('recommendations-list');
        const button = document.getElementById('generate-recommendations');
        if (!container) return;

        const isRu = i18n.getLocale() === 'ru';

        // Show loading
        button.disabled = true;
        button.innerHTML = isRu ? '⏳ Загрузка...' : '⏳ Loading...';

        container.innerHTML = `
            <div class="card text-center">
                <div class="spinner" style="margin: 20px auto;"></div>
                <p class="text-hint">${isRu ? 'Генерируем рекомендации...' : 'Generating recommendations...'}</p>
            </div>
        `;

        try {
            // Import AI module dynamically
            const AI = (await import('./ai.js')).default;

            const prompt = `Generate 5 movie/TV series recommendations for learning English at ${level} level.
For each recommendation provide:
1. Title (original English)
2. Type (movie/series/cartoon/documentary)
3. Year
4. Why it's good for this level (1 sentence)
5. Key vocabulary topics learner will encounter

Format as JSON array:
[{"title": "...", "type": "...", "year": "...", "reason": "...", "vocabulary": ["topic1", "topic2"]}]

Level guidelines:
- A1: Simple children's content, slow speech (Peppa Pig, Bluey, Finding Nemo)
- A2: Simple sitcoms, animated movies (Extra English, Simpsons, Toy Story)
- B1: Popular sitcoms, mainstream movies (Friends, Big Bang Theory, Forrest Gump)
- B2: Drama series, complex plots (The Office, Stranger Things, Black Mirror)
- C1: Fast-paced dialogue, sophisticated content (Sherlock, House of Cards, Succession)

Return ONLY the JSON array, no other text.`;

            const response = await AI.generateText(prompt);

            // Parse JSON from response
            let recommendations;
            try {
                // Try to extract JSON from response
                const jsonMatch = response.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found');
                }
            } catch (e) {
                // Fallback recommendations if AI fails
                recommendations = this.getFallbackRecommendations(level);
            }

            this.renderImmersionRecommendations(container, recommendations, level, isRu);

        } catch (error) {
            console.error('Failed to generate recommendations:', error);
            // Use fallback
            const recommendations = this.getFallbackRecommendations(level);
            this.renderImmersionRecommendations(container, recommendations, level, isRu);
        }

        // Reset button
        button.disabled = false;
        button.innerHTML = isRu ? '🔄 Ещё рекомендации' : '🔄 More Recommendations';
    }

    /**
     * Fallback recommendations if AI is unavailable
     */
    getFallbackRecommendations(level) {
        const recommendations = {
            'A1': [
                { title: 'Peppa Pig', type: 'cartoon', year: '2004-', reason: 'Simple vocabulary, slow clear speech, everyday situations', vocabulary: ['family', 'animals', 'daily routines'] },
                { title: 'Bluey', type: 'cartoon', year: '2018-', reason: 'Natural family conversations, Australian English', vocabulary: ['games', 'emotions', 'family'] },
                { title: 'Finding Nemo', type: 'movie', year: '2003', reason: 'Clear speech, emotional story, simple plot', vocabulary: ['ocean', 'animals', 'adventure'] },
                { title: 'Paddington', type: 'movie', year: '2014', reason: 'British English, polite expressions, humor', vocabulary: ['home', 'manners', 'London'] },
                { title: 'Super Simple Songs', type: 'series', year: '2005-', reason: 'Educational songs, repetitive vocabulary', vocabulary: ['numbers', 'colors', 'body parts'] }
            ],
            'A2': [
                { title: 'Extra English', type: 'series', year: '2002', reason: 'Made for learners, clear speech, subtitles', vocabulary: ['daily life', 'relationships', 'work'] },
                { title: 'The Simpsons', type: 'series', year: '1989-', reason: 'American culture, humor, varied vocabulary', vocabulary: ['family', 'school', 'work'] },
                { title: 'Toy Story', type: 'movie', year: '1995', reason: 'Clear dialogue, friendship themes', vocabulary: ['toys', 'emotions', 'adventure'] },
                { title: 'Shrek', type: 'movie', year: '2001', reason: 'Humor, fairy tale vocabulary, memorable quotes', vocabulary: ['fairy tales', 'humor', 'friendship'] },
                { title: 'Young Sheldon', type: 'series', year: '2017-', reason: 'Clear speech, family situations, humor', vocabulary: ['school', 'science', 'family'] }
            ],
            'B1': [
                { title: 'Friends', type: 'series', year: '1994-2004', reason: 'Natural conversations, American slang, humor', vocabulary: ['relationships', 'work', 'daily life'] },
                { title: 'How I Met Your Mother', type: 'series', year: '2005-2014', reason: 'Modern vocabulary, dating culture', vocabulary: ['dating', 'friendship', 'New York'] },
                { title: 'The Big Bang Theory', type: 'series', year: '2007-2019', reason: 'Geek culture, science terms, humor', vocabulary: ['science', 'technology', 'relationships'] },
                { title: 'Modern Family', type: 'series', year: '2009-2020', reason: 'Family dynamics, diverse characters', vocabulary: ['family', 'parenting', 'American culture'] },
                { title: 'Forrest Gump', type: 'movie', year: '1994', reason: 'American history, clear narration', vocabulary: ['history', 'emotions', 'life lessons'] }
            ],
            'B2': [
                { title: 'The Office (US)', type: 'series', year: '2005-2013', reason: 'Workplace humor, subtle comedy, mockumentary style', vocabulary: ['business', 'office life', 'relationships'] },
                { title: 'Stranger Things', type: 'series', year: '2016-', reason: 'Suspense, 80s culture, varied dialogue', vocabulary: ['supernatural', 'friendship', 'science'] },
                { title: 'Black Mirror', type: 'series', year: '2011-', reason: 'Technology themes, British English, complex plots', vocabulary: ['technology', 'society', 'ethics'] },
                { title: 'The Crown', type: 'series', year: '2016-', reason: 'British English, formal speech, history', vocabulary: ['royalty', 'politics', 'history'] },
                { title: 'Breaking Bad', type: 'series', year: '2008-2013', reason: 'Intense dialogue, character development', vocabulary: ['crime', 'chemistry', 'morality'] }
            ],
            'C1': [
                { title: 'Sherlock', type: 'series', year: '2010-2017', reason: 'Fast dialogue, complex vocabulary, British English', vocabulary: ['detective', 'deduction', 'London'] },
                { title: 'House of Cards', type: 'series', year: '2013-2018', reason: 'Political vocabulary, sophisticated dialogue', vocabulary: ['politics', 'power', 'manipulation'] },
                { title: 'Peaky Blinders', type: 'series', year: '2013-2022', reason: 'British accents, historical slang', vocabulary: ['crime', 'history', 'business'] },
                { title: 'True Detective', type: 'series', year: '2014-', reason: 'Complex narratives, philosophical themes', vocabulary: ['crime', 'philosophy', 'psychology'] },
                { title: 'Succession', type: 'series', year: '2018-2023', reason: 'Business jargon, fast-paced dialogue', vocabulary: ['business', 'family', 'media'] }
            ]
        };

        return recommendations[level] || recommendations['B1'];
    }

    /**
     * Render recommendations list
     */
    renderImmersionRecommendations(container, recommendations, level, isRu) {
        const typeEmojis = {
            'movie': '🎬',
            'series': '📺',
            'cartoon': '🎨',
            'documentary': '📚'
        };

        const typeLabels = {
            'movie': isRu ? 'Фильм' : 'Movie',
            'series': isRu ? 'Сериал' : 'Series',
            'cartoon': isRu ? 'Мультфильм' : 'Cartoon',
            'documentary': isRu ? 'Документальный' : 'Documentary'
        };

        let html = '';

        for (const item of recommendations) {
            const emoji = typeEmojis[item.type] || '🎬';
            const typeLabel = typeLabels[item.type] || item.type;
            const vocabTags = item.vocabulary?.map(v => `<span class="vocab-tag">${v}</span>`).join('') || '';

            html += `
                <div class="card recommendation-card" style="margin-bottom: 12px;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="font-size: 32px;">${emoji}</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 4px 0;">${item.title}</h4>
                            <p class="text-hint" style="font-size: 12px; margin: 0 0 8px 0;">
                                ${typeLabel} • ${item.year}
                            </p>
                            <p style="font-size: 14px; margin: 0 0 8px 0;">${item.reason}</p>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${vocabTags}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(item.title + ' watch online')}', '_blank')">
                            ${isRu ? '🔍 Найти' : '🔍 Find'}
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="UI.markAsWatched('${item.title.replace(/'/g, "\\'")}')">
                            ${isRu ? '✅ Посмотрел' : '✅ Watched'}
                        </button>
                    </div>
                </div>
            `;
        }

        // Add tips
        html += `
            <div class="card" style="background: var(--warning-light); margin-top: 16px;">
                <h4 style="margin: 0 0 8px 0;">💡 ${isRu ? 'Советы для просмотра' : 'Watching Tips'}</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>${isRu ? 'Смотрите с английскими субтитрами' : 'Watch with English subtitles'}</li>
                    <li>${isRu ? 'Записывайте новые слова и фразы' : 'Write down new words and phrases'}</li>
                    <li>${isRu ? 'Пересматривайте сложные сцены' : 'Rewatch difficult scenes'}</li>
                    <li>${isRu ? 'Попробуйте повторять за героями' : 'Try shadowing the characters'}</li>
                </ul>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Mark content as watched
     */
    async markAsWatched(title) {
        const isRu = i18n.getLocale() === 'ru';

        // Save to profile
        if (!this.profile.immersion) {
            this.profile.immersion = { watched: [], totalMinutes: 0 };
        }

        if (!this.profile.immersion.watched.includes(title)) {
            this.profile.immersion.watched.push(title);
            await Database.saveProfile(this.profile);
        }

        this.showToast(isRu ? `"${title}" добавлен в просмотренные!` : `"${title}" marked as watched!`);
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

    // ==================== SPEAKING ====================

    /**
     * Start speaking session
     */
    startSpeakingSession(mode) {
        this.showToast(i18n.t('common.comingSoon') + ' - ' + mode);
        // TODO: Implement full speaking functionality with Speech Recognition API
    }

    // ==================== LISTENING ====================

    /**
     * Start listening session
     */
    startListeningSession(mode) {
        this.showToast(i18n.t('common.comingSoon') + ' - ' + mode);
        // TODO: Implement full listening functionality with audio playback
    }

    // ==================== IELTS ====================

    /**
     * Start IELTS test
     */
    startIELTSTest(type) {
        if (type === 'full') {
            this.showToast('Полный тест IELTS - в разработке');
        } else {
            this.showToast('Выберите секцию для теста');
        }
    }

    /**
     * Open IELTS section
     */
    openIELTSSection(section) {
        this.showToast(`IELTS ${section} - в разработке`);
        // TODO: Implement IELTS section practice
    }

    // ==================== QUICK ACTIONS ====================

    /**
     * Start smart session (AI picks)
     */
    async startSmartSession() {
        // Check what needs practice most
        const dueCounts = Vocabulary.getDueCounts();

        if (dueCounts.overdue.receptive > 0 || dueCounts.overdue.productive > 0) {
            // Start vocabulary review
            this.openModule('vocabulary');
            this.showToast('Начинаем повторение слов!');
        } else {
            // Suggest grammar or reading
            this.openModule('grammar');
            this.showToast('Изучаем грамматику!');
        }
    }

    /**
     * Start review session for due cards
     */
    async startReviewSession() {
        const dueCounts = Vocabulary.getDueCounts();
        const total = dueCounts.overdue.receptive + dueCounts.overdue.productive;

        if (total === 0) {
            this.showToast('Нет карточек для повторения!');
            return;
        }

        this.openModule('vocabulary');
        this.startVocabularySession('receptive');
    }

    // ==================== WRITING ====================

    /**
     * Submit writing task for assessment
     */
    async submitWritingTask() {
        const input = document.getElementById('writing-input');
        const text = input?.value || '';

        if (text.trim().split(/\s+/).length < 50) {
            this.showToast('Напишите минимум 50 слов');
            return;
        }

        this.showToast('Отправка на проверку... (в разработке)');
        // TODO: Implement AI assessment with Gemini API
    }
}

const ui = new UI();
export default ui;
