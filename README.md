# EnglishMaster Pro v3.0

Telegram Mini App для изучения английского языка от A1 до C1.

## Быстрый старт

### 1. Клонирование и настройка

```bash
git clone <your-repo-url>
cd englishmaster-pro
```

### 2. Настройка API ключей

Скопируйте файл примера конфигурации:

```bash
cp js/config.local.js.example js/config.local.js
```

Заполните `js/config.local.js` своими ключами (см. раздел "Получение API ключей" ниже).

### 3. Запуск локально

Используйте любой локальный сервер:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve

# VS Code - Live Server extension
```

Откройте `http://localhost:8080` в браузере.

---

## Получение БЕСПЛАТНЫХ API ключей

### 1. Telegram Bot Token (БЕСПЛАТНО)

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Получите токен вида `123456:ABC-DEF...`

### 2. Firebase (БЕСПЛАТНО - Spark Plan)

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект
3. Включите **Firestore Database** (Cloud Firestore)
4. Включите **Storage** (если нужно хранить аудио)
5. Перейдите в **Project Settings** → **General** → **Your apps**
6. Нажмите **Web app** (</>)
7. Скопируйте конфигурацию

**Бесплатные лимиты Firebase Spark:**
- Firestore: 50K reads/day, 20K writes/day
- Storage: 5GB
- Этого достаточно для тысяч пользователей!

### 3. Google Gemini API (БЕСПЛАТНО)

1. Перейдите на [Google AI Studio](https://aistudio.google.com/)
2. Войдите с Google аккаунтом
3. Нажмите "Get API Key"
4. Создайте ключ

**Бесплатные лимиты:**
- 60 запросов в минуту
- 1 миллион токенов в месяц
- Идеально для проверки эссе и генерации контента!

### 4. LanguageTool (БЕСПЛАТНО)

**API работает без регистрации!**

Просто используйте эндпоинт:
```
https://api.languagetool.org/v2/check
```

**Лимиты бесплатной версии:**
- 20 запросов в минуту
- Достаточно для проверки грамматики

### 5. Free Dictionary API (БЕСПЛАТНО)

**Не требует API ключа!**

```
https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

---

## Альтернативные бесплатные нейросети

Если лимитов Gemini не хватает:

### OpenRouter (бесплатные модели)
- [openrouter.ai](https://openrouter.ai/)
- Бесплатные модели: Llama, Mistral, и др.

### Hugging Face Inference API
- [huggingface.co](https://huggingface.co/)
- Бесплатный tier для inference

### Groq (быстрый и бесплатный)
- [groq.com](https://groq.com/)
- Llama 3, Mixtral бесплатно

---

## Скрытие ключей на GitHub

### Способ 1: .gitignore (уже настроен)

Файл `js/config.local.js` уже добавлен в `.gitignore`.

### Способ 2: GitHub Secrets (для CI/CD)

1. Перейдите в репозиторий → Settings → Secrets
2. Добавьте секреты:
   - `FIREBASE_API_KEY`
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`

### Способ 3: Environment Variables

Для деплоя на Vercel/Netlify используйте переменные окружения.

---

## Деплой

### Vercel (БЕСПЛАТНО)

```bash
npm i -g vercel
vercel
```

### Netlify (БЕСПЛАТНО)

```bash
npm i -g netlify-cli
netlify deploy
```

### GitHub Pages (БЕСПЛАТНО)

1. Settings → Pages → Source: main branch
2. Дождитесь деплоя

---

## Настройка Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота
3. Отправьте `/newapp`
4. Укажите URL вашего приложения (после деплоя)

---

## Структура проекта

```
englishmaster-pro/
├── index.html          # Главная страница
├── css/
│   └── style.css       # Стили
├── js/
│   ├── config.js       # Конфигурация (публичная)
│   ├── config.local.js # API ключи (gitignored!)
│   ├── app.js          # Главный контроллер
│   ├── auth.js         # Telegram авторизация
│   ├── database.js     # Firebase операции
│   ├── sm2.js          # Алгоритм интервального повторения
│   ├── vocabulary.js   # Модуль словаря
│   ├── grammar.js      # Модуль грамматики
│   ├── reading.js      # Модуль чтения
│   ├── listening.js    # Модуль аудирования
│   ├── writing.js      # Модуль письма
│   ├── speaking.js     # Модуль говорения
│   ├── immersion.js    # Модуль погружения
│   ├── ielts.js        # Подготовка к IELTS
│   ├── errorAnalysis.js # Анализ ошибок
│   ├── levelCalculator.js # Расчёт уровня
│   ├── placementTest.js # Placement тест
│   └── ai.js           # Интеграция с AI
└── data/
    ├── vocabulary/     # Словарные базы
    ├── grammar/        # Грамматические темы
    ├── reading/        # Тексты для чтения
    └── listening/      # Аудио материалы
```

---

## Безопасность

⚠️ **НИКОГДА не коммитьте:**
- `config.local.js`
- `.env` файлы
- Любые файлы с API ключами

✅ **Проверьте перед коммитом:**
```bash
git status
```

Убедитесь, что `config.local.js` НЕ в списке файлов.

---

## Поддержка

Если возникли вопросы:
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что API ключи верные
3. Проверьте лимиты бесплатных планов

---

## Лицензия

MIT License
