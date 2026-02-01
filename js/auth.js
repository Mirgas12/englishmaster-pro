/**
 * Authentication module for Telegram Mini App
 */

import Database from './database.js';

class Auth {
    constructor() {
        this.user = null;
        this.tg = null;
    }

    /**
     * Initialize Telegram Web App
     */
    init() {
        if (window.Telegram?.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();

            // Apply Telegram theme
            this.applyTheme();

            // Get user from Telegram
            if (this.tg.initDataUnsafe?.user) {
                this.user = {
                    id: this.tg.initDataUnsafe.user.id.toString(),
                    firstName: this.tg.initDataUnsafe.user.first_name,
                    lastName: this.tg.initDataUnsafe.user.last_name || '',
                    username: this.tg.initDataUnsafe.user.username || '',
                    languageCode: this.tg.initDataUnsafe.user.language_code || 'en'
                };
            }
        }

        // Fallback for development/testing
        if (!this.user) {
            this.user = this.getDevUser();
        }

        // Set user in database
        Database.setUser(this.user.id);

        return this.user;
    }

    /**
     * Get development user for testing
     */
    getDevUser() {
        let devUserId = localStorage.getItem('dev_user_id');
        if (!devUserId) {
            devUserId = 'dev_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dev_user_id', devUserId);
        }

        return {
            id: devUserId,
            firstName: 'Developer',
            lastName: 'User',
            username: 'devuser',
            languageCode: 'en'
        };
    }

    /**
     * Apply Telegram theme colors
     */
    applyTheme() {
        if (!this.tg) return;

        const root = document.documentElement;
        const theme = this.tg.themeParams;

        if (theme.bg_color) {
            root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        }
        if (theme.text_color) {
            root.style.setProperty('--tg-theme-text-color', theme.text_color);
        }
        if (theme.hint_color) {
            root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        }
        if (theme.link_color) {
            root.style.setProperty('--tg-theme-link-color', theme.link_color);
        }
        if (theme.button_color) {
            root.style.setProperty('--tg-theme-button-color', theme.button_color);
        }
        if (theme.button_text_color) {
            root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        }
        if (theme.secondary_bg_color) {
            root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if running in Telegram
     */
    isInTelegram() {
        return !!this.tg;
    }

    /**
     * Show main button
     */
    showMainButton(text, callback) {
        if (!this.tg) return;

        this.tg.MainButton.text = text;
        this.tg.MainButton.onClick(callback);
        this.tg.MainButton.show();
    }

    /**
     * Hide main button
     */
    hideMainButton() {
        if (!this.tg) return;
        this.tg.MainButton.hide();
    }

    /**
     * Show back button
     */
    showBackButton(callback) {
        if (!this.tg) return;

        this.tg.BackButton.onClick(callback);
        this.tg.BackButton.show();
    }

    /**
     * Hide back button
     */
    hideBackButton() {
        if (!this.tg) return;
        this.tg.BackButton.hide();
    }

    /**
     * Show alert
     */
    showAlert(message) {
        if (this.tg) {
            this.tg.showAlert(message);
        } else {
            alert(message);
        }
    }

    /**
     * Show confirm
     */
    showConfirm(message, callback) {
        if (this.tg) {
            this.tg.showConfirm(message, callback);
        } else {
            callback(confirm(message));
        }
    }

    /**
     * Haptic feedback
     */
    hapticFeedback(type = 'light') {
        if (!this.tg?.HapticFeedback) return;

        switch (type) {
            case 'light':
                this.tg.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                this.tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                this.tg.HapticFeedback.impactOccurred('heavy');
                break;
            case 'success':
                this.tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                this.tg.HapticFeedback.notificationOccurred('error');
                break;
        }
    }

    /**
     * Close mini app
     */
    close() {
        if (this.tg) {
            this.tg.close();
        }
    }
}

export default new Auth();
