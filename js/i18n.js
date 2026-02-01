/**
 * Internationalization module
 * Supports English and Russian
 */

const translations = {
    en: {
        // Navigation
        nav: {
            home: 'Home',
            study: 'Study',
            progress: 'Progress',
            profile: 'Profile'
        },

        // Dashboard
        dashboard: {
            title: 'EnglishMaster Pro',
            greeting: 'Hello, {name}!',
            dayStreak: 'Day Streak',
            hoursStudied: 'Hours Studied',
            todayTasks: "Today's Tasks",
            allCaughtUp: 'All caught up! Great job!',
            vocabulary: 'Vocabulary',
            words: 'words',
            receptive: 'Receptive',
            productive: 'Productive',
            modules: 'Modules'
        },

        // Modules
        modules: {
            vocabulary: 'Vocabulary',
            grammar: 'Grammar',
            reading: 'Reading',
            listening: 'Listening',
            writing: 'Writing',
            speaking: 'Speaking',
            immersion: 'Immersion',
            ielts: 'IELTS',
            watchLearn: 'Watch & Learn',
            testPrep: 'Test Prep'
        },

        // Vocabulary
        vocab: {
            chooseMode: 'Choose Practice Mode',
            receptiveMode: 'EN → RU (Receptive)',
            productiveMode: 'RU → EN (Productive)',
            spellingMode: 'Spelling Practice',
            timedMode: 'Timed Recall',
            showAnswer: 'Show Answer',
            again: 'Again',
            hard: 'Hard',
            good: 'Good',
            easy: 'Easy',
            whatMeans: 'What does this word mean?',
            howSay: 'How do you say this in English?',
            words: 'words',
            addFromPack: 'Add from Starter Pack',
            categories: 'Categories'
        },

        // Grammar
        grammar: {
            topics: 'Grammar Topics',
            lessonTitle: 'Lesson',
            discover: 'Discover',
            understand: 'Understand',
            notice: 'Notice',
            practice: 'Practice',
            produce: 'Produce',
            inputFlood: 'Input Flood',
            review: 'Review',
            continue: 'Continue',
            complete: 'Complete Phase',
            readTexts: 'Read {count} texts'
        },

        // Reading
        reading: {
            title: 'Reading Practice',
            textTitle: 'Text Title',
            questions: 'Comprehension Questions',
            checkAnswers: 'Check Answers',
            wordCount: 'Word count',
            level: 'Level',
            topic: 'Topic'
        },

        // Listening
        listening: {
            title: 'Listening Practice',
            chooseType: 'Choose Practice Type',
            dictation: 'Dictation Practice',
            comprehension: 'Listening Comprehension',
            transcription: 'Transcription Challenge'
        },

        // Immersion
        immersion: {
            title: 'Immersion Quizzes',
            quizTitle: 'Quiz Title',
            questions: 'Questions',
            checkAnswers: 'Check Answers',
            showTranscript: 'Show Transcript',
            transcript: 'Transcript',
            play: 'Play',
            pause: 'Pause',
            replay: 'Replay'
        },

        // Writing
        writing: {
            title: 'Writing Task',
            prompt: 'Task prompt will appear here',
            placeholder: 'Write your essay here...',
            wordCount: '{count} words (minimum 250)',
            submit: 'Submit for Assessment',
            selfCheck: 'Self-Check',
            intro: 'Introduction with thesis',
            body: '2-3 body paragraphs',
            examples: 'Examples included',
            conclusion: 'Conclusion'
        },

        // Speaking
        speaking: {
            title: 'Speaking Practice',
            disclaimer: 'Speaking practice in this app provides 60-70% of the effect of live conversation. For B2+ level, you need practice with real people:',
            practiceMode: 'Practice Mode',
            pronunciation: 'Pronunciation Drills',
            shadowing: 'Shadowing',
            conversation: 'AI Conversation'
        },

        // IELTS
        ielts: {
            title: 'IELTS Preparation',
            description: 'Practice for the IELTS exam with targeted exercises.',
            listening: 'Listening',
            reading: 'Reading',
            writing: 'Writing',
            speaking: 'Speaking',
            questions: '40 questions',
            academicGeneral: 'Academic/General',
            task12: 'Task 1 & 2',
            parts: '3 Parts',
            practiceTests: 'Practice Tests',
            fullTest: 'Full Practice Test (2h 45min)',
            sectionTest: 'Section Test (30-60min)'
        },

        // Progress
        progress: {
            title: 'Your Progress',
            currentLevel: 'Current Level',
            dayStreak: 'Day Streak',
            totalHours: 'Total Hours',
            wordsLearned: 'Words Learned',
            skillBreakdown: 'Skill Breakdown',
            weeklyActivity: 'Weekly Activity'
        },

        // Profile
        profile: {
            title: 'Profile',
            level: 'Level: {level}',
            joined: 'Joined: {date}',
            settings: 'Settings',
            dailyGoal: 'Daily Goal',
            notifications: 'Notifications',
            soundEffects: 'Sound Effects',
            darkMode: 'Dark Mode',
            language: 'Interface Language',
            account: 'Account',
            retakePlacement: 'Retake Placement Test',
            exportProgress: 'Export Progress',
            resetProgress: 'Reset All Progress',
            exportSuccess: 'Progress exported successfully!',
            resetConfirm: 'Are you sure you want to reset all progress? This cannot be undone.'
        },

        // Study Hub
        study: {
            title: 'Study Session',
            chooseToday: 'Choose what to practice today:',
            due: 'due',
            continue: 'Continue',
            newTexts: 'New Texts',
            practice: 'Practice',
            newTask: 'New Task',
            aiChat: 'AI Chat',
            quickActions: 'Quick Actions',
            smartSession: 'Smart Session (AI Picks)',
            reviewDue: 'Review Due Cards'
        },

        // Placement Test
        placement: {
            welcome: 'Welcome to EnglishMaster Pro!',
            description: "Let's determine your English level with a quick test.",
            startTest: 'Start Placement Test',
            duration: 'Takes about 25-35 minutes',
            question: 'Question',
            of: 'of',
            finish: 'Finish Test',
            results: 'Test Results',
            yourLevel: 'Your Level',
            sectionResults: 'Section Results',
            recommendation: 'Recommendation',
            startLearning: 'Start Learning'
        },

        // Common
        common: {
            loading: 'Loading...',
            error: 'An error occurred',
            retry: 'Retry',
            cancel: 'Cancel',
            save: 'Save',
            saved: 'Saved!',
            close: 'Close',
            next: 'Next',
            previous: 'Previous',
            submit: 'Submit',
            correct: 'Correct!',
            incorrect: 'Incorrect',
            comingSoon: 'Coming soon!',
            minutes: 'min',
            hours: 'h',
            offline: 'You are offline',
            online: 'Connection restored'
        },

        // Days
        days: {
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat',
            sun: 'Sun'
        }
    },

    ru: {
        // Navigation
        nav: {
            home: 'Главная',
            study: 'Учиться',
            progress: 'Прогресс',
            profile: 'Профиль'
        },

        // Dashboard
        dashboard: {
            title: 'EnglishMaster Pro',
            greeting: 'Привет, {name}!',
            dayStreak: 'Дней подряд',
            hoursStudied: 'Часов изучения',
            todayTasks: 'Задачи на сегодня',
            allCaughtUp: 'Всё сделано! Отлично!',
            vocabulary: 'Словарный запас',
            words: 'слов',
            receptive: 'Пассивный',
            productive: 'Активный',
            modules: 'Модули'
        },

        // Modules
        modules: {
            vocabulary: 'Лексика',
            grammar: 'Грамматика',
            reading: 'Чтение',
            listening: 'Аудирование',
            writing: 'Письмо',
            speaking: 'Говорение',
            immersion: 'Погружение',
            ielts: 'IELTS',
            watchLearn: 'Смотри и учись',
            testPrep: 'Подготовка к тесту'
        },

        // Vocabulary
        vocab: {
            chooseMode: 'Выберите режим практики',
            receptiveMode: 'EN → RU (Пассивный)',
            productiveMode: 'RU → EN (Активный)',
            spellingMode: 'Правописание',
            timedMode: 'Быстрый вспоминание',
            showAnswer: 'Показать ответ',
            again: 'Снова',
            hard: 'Сложно',
            good: 'Хорошо',
            easy: 'Легко',
            whatMeans: 'Что означает это слово?',
            howSay: 'Как это сказать по-английски?',
            words: 'слов',
            addFromPack: 'Добавить из стартового набора',
            categories: 'Категории'
        },

        // Grammar
        grammar: {
            topics: 'Темы грамматики',
            lessonTitle: 'Урок',
            discover: 'Открытие',
            understand: 'Понимание',
            notice: 'Осознание',
            practice: 'Практика',
            produce: 'Производство',
            inputFlood: 'Погружение',
            review: 'Повторение',
            continue: 'Продолжить',
            complete: 'Завершить этап',
            readTexts: 'Прочитать {count} текстов'
        },

        // Reading
        reading: {
            title: 'Практика чтения',
            textTitle: 'Название текста',
            questions: 'Вопросы на понимание',
            checkAnswers: 'Проверить ответы',
            wordCount: 'Слов',
            level: 'Уровень',
            topic: 'Тема'
        },

        // Listening
        listening: {
            title: 'Практика аудирования',
            chooseType: 'Выберите тип практики',
            dictation: 'Диктант',
            comprehension: 'Понимание на слух',
            transcription: 'Транскрипция'
        },

        // Immersion
        immersion: {
            title: 'Квизы погружения',
            quizTitle: 'Название квиза',
            questions: 'Вопросы',
            checkAnswers: 'Проверить ответы',
            showTranscript: 'Показать транскрипт',
            transcript: 'Транскрипт',
            play: 'Воспроизвести',
            pause: 'Пауза',
            replay: 'Повторить'
        },

        // Writing
        writing: {
            title: 'Письменное задание',
            prompt: 'Здесь появится задание',
            placeholder: 'Напишите своё эссе здесь...',
            wordCount: '{count} слов (минимум 250)',
            submit: 'Отправить на оценку',
            selfCheck: 'Самопроверка',
            intro: 'Введение с тезисом',
            body: '2-3 основных абзаца',
            examples: 'Примеры включены',
            conclusion: 'Заключение'
        },

        // Speaking
        speaking: {
            title: 'Практика говорения',
            disclaimer: 'Практика говорения в этом приложении даёт 60-70% эффекта живого разговора. Для уровня B2+ нужна практика с реальными людьми:',
            practiceMode: 'Режим практики',
            pronunciation: 'Упражнения на произношение',
            shadowing: 'Шэдоуинг',
            conversation: 'Разговор с ИИ'
        },

        // IELTS
        ielts: {
            title: 'Подготовка к IELTS',
            description: 'Практикуйтесь для экзамена IELTS с целевыми упражнениями.',
            listening: 'Аудирование',
            reading: 'Чтение',
            writing: 'Письмо',
            speaking: 'Говорение',
            questions: '40 вопросов',
            academicGeneral: 'Academic/General',
            task12: 'Task 1 и 2',
            parts: '3 части',
            practiceTests: 'Пробные тесты',
            fullTest: 'Полный тест (2ч 45мин)',
            sectionTest: 'Тест по секции (30-60мин)'
        },

        // Progress
        progress: {
            title: 'Ваш прогресс',
            currentLevel: 'Текущий уровень',
            dayStreak: 'Дней подряд',
            totalHours: 'Всего часов',
            wordsLearned: 'Выучено слов',
            skillBreakdown: 'Навыки по категориям',
            weeklyActivity: 'Активность за неделю'
        },

        // Profile
        profile: {
            title: 'Профиль',
            level: 'Уровень: {level}',
            joined: 'Присоединился: {date}',
            settings: 'Настройки',
            dailyGoal: 'Ежедневная цель',
            notifications: 'Уведомления',
            soundEffects: 'Звуковые эффекты',
            darkMode: 'Тёмная тема',
            language: 'Язык интерфейса',
            account: 'Аккаунт',
            retakePlacement: 'Пересдать тест уровня',
            exportProgress: 'Экспортировать прогресс',
            resetProgress: 'Сбросить весь прогресс',
            exportSuccess: 'Прогресс успешно экспортирован!',
            resetConfirm: 'Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить.'
        },

        // Study Hub
        study: {
            title: 'Сессия обучения',
            chooseToday: 'Выберите, что практиковать сегодня:',
            due: 'к повторению',
            continue: 'Продолжить',
            newTexts: 'Новые тексты',
            practice: 'Практика',
            newTask: 'Новое задание',
            aiChat: 'Чат с ИИ',
            quickActions: 'Быстрые действия',
            smartSession: 'Умная сессия (ИИ выбирает)',
            reviewDue: 'Повторить карточки'
        },

        // Placement Test
        placement: {
            welcome: 'Добро пожаловать в EnglishMaster Pro!',
            description: 'Давайте определим ваш уровень английского с помощью быстрого теста.',
            startTest: 'Начать тест',
            duration: 'Займёт около 25-35 минут',
            question: 'Вопрос',
            of: 'из',
            finish: 'Завершить тест',
            results: 'Результаты теста',
            yourLevel: 'Ваш уровень',
            sectionResults: 'Результаты по секциям',
            recommendation: 'Рекомендация',
            startLearning: 'Начать обучение'
        },

        // Common
        common: {
            loading: 'Загрузка...',
            error: 'Произошла ошибка',
            retry: 'Повторить',
            cancel: 'Отмена',
            save: 'Сохранить',
            saved: 'Сохранено!',
            close: 'Закрыть',
            next: 'Далее',
            previous: 'Назад',
            submit: 'Отправить',
            correct: 'Правильно!',
            incorrect: 'Неправильно',
            comingSoon: 'Скоро будет!',
            minutes: 'мин',
            hours: 'ч',
            offline: 'Нет подключения к интернету',
            online: 'Подключение восстановлено'
        },

        // Days
        days: {
            mon: 'Пн',
            tue: 'Вт',
            wed: 'Ср',
            thu: 'Чт',
            fri: 'Пт',
            sat: 'Сб',
            sun: 'Вс'
        }
    }
};

class I18n {
    constructor() {
        this.currentLocale = 'ru';
        this.fallbackLocale = 'en';
    }

    /**
     * Set current locale
     */
    setLocale(locale) {
        if (translations[locale]) {
            this.currentLocale = locale;
            document.documentElement.lang = locale;
            this.updateUI();
        }
    }

    /**
     * Get current locale
     */
    getLocale() {
        return this.currentLocale;
    }

    /**
     * Get translation by key path
     * @param {string} key - Dot-separated key path (e.g., 'dashboard.title')
     * @param {object} params - Parameters for interpolation
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = translations[this.currentLocale];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }

        // Fallback to English
        if (value === undefined) {
            value = translations[this.fallbackLocale];
            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    value = key; // Return key if not found
                    break;
                }
            }
        }

        // Interpolate parameters
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            for (const [param, val] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), val);
            }
        }

        return value;
    }

    /**
     * Get translations object for a section
     */
    getSection(section) {
        return translations[this.currentLocale]?.[section] || translations[this.fallbackLocale]?.[section] || {};
    }

    /**
     * Update all UI elements with data-i18n attribute
     */
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const params = element.dataset.i18nParams ? JSON.parse(element.dataset.i18nParams) : {};
            element.textContent = this.t(key, params);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            element.placeholder = this.t(element.dataset.i18nPlaceholder);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            element.title = this.t(element.dataset.i18nTitle);
        });
    }

    /**
     * Get available locales
     */
    getAvailableLocales() {
        return Object.keys(translations);
    }

    /**
     * Check if locale is available
     */
    isLocaleAvailable(locale) {
        return !!translations[locale];
    }
}

const i18n = new I18n();

export default i18n;
export { translations };
