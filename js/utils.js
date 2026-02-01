/**
 * Utility functions for EnglishMaster Pro
 */

const Utils = {
    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    },

    /**
     * Safe innerHTML setter with escaping
     */
    safeInnerHTML(element, html, escapeContent = true) {
        if (!element) return;
        if (escapeContent) {
            element.textContent = html;
        } else {
            // Only use when HTML is trusted (from app code, not user data)
            element.innerHTML = html;
        }
    },

    /**
     * Create element with safe content
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'dataset') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    element.dataset[dataKey] = dataValue;
                }
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        }

        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        }

        return element;
    },

    /**
     * Format duration in milliseconds to human readable
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    /**
     * Format date to locale string
     */
    formatDate(timestamp, locale = 'ru-RU') {
        return new Date(timestamp).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(timestamp, locale = 'ru') {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        const labels = {
            ru: {
                justNow: 'только что',
                minutes: (n) => this.pluralize(n, 'минуту', 'минуты', 'минут') + ' назад',
                hours: (n) => this.pluralize(n, 'час', 'часа', 'часов') + ' назад',
                days: (n) => this.pluralize(n, 'день', 'дня', 'дней') + ' назад'
            },
            en: {
                justNow: 'just now',
                minutes: (n) => `${n} minute${n === 1 ? '' : 's'} ago`,
                hours: (n) => `${n} hour${n === 1 ? '' : 's'} ago`,
                days: (n) => `${n} day${n === 1 ? '' : 's'} ago`
            }
        };

        const l = labels[locale] || labels.en;

        if (minutes < 1) return l.justNow;
        if (minutes < 60) return l.minutes(minutes);
        if (hours < 24) return l.hours(hours);
        return l.days(days);
    },

    /**
     * Russian pluralization
     */
    pluralize(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;

        if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
        return `${n} ${many}`;
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    /**
     * Generate unique ID
     */
    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    },

    /**
     * Get nested object property safely
     */
    getNestedProperty(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined) {
                return defaultValue;
            }
            result = result[key];
        }

        return result !== undefined ? result : defaultValue;
    },

    /**
     * Calculate percentage
     */
    percentage(value, total, decimals = 0) {
        if (total === 0) return 0;
        const percent = (value / total) * 100;
        return decimals > 0 ? percent.toFixed(decimals) : Math.round(percent);
    },

    /**
     * Clamp number between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Storage helper with JSON and error handling
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage get error:', e);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Storage set error:', e);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Storage remove error:', e);
                return false;
            }
        }
    },

    /**
     * Simple event emitter
     */
    createEventEmitter() {
        const events = {};

        return {
            on(event, callback) {
                if (!events[event]) events[event] = [];
                events[event].push(callback);
                return () => this.off(event, callback);
            },

            off(event, callback) {
                if (!events[event]) return;
                events[event] = events[event].filter(cb => cb !== callback);
            },

            emit(event, data) {
                if (!events[event]) return;
                events[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error('Event handler error:', e);
                    }
                });
            },

            once(event, callback) {
                const onceCallback = (data) => {
                    callback(data);
                    this.off(event, onceCallback);
                };
                this.on(event, onceCallback);
            }
        };
    },

    /**
     * Check if device is mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Check if device is online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Wait for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry async function with exponential backoff
     */
    async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await this.sleep(baseDelay * Math.pow(2, i));
                }
            }
        }

        throw lastError;
    }
};

export default Utils;
