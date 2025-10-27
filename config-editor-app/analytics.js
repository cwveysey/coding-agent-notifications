import posthog from 'posthog-js';

// Analytics configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let analyticsEnabled = true;
let posthogInitialized = false;

// Initialize PostHog (called on app start)
export function initAnalytics() {
    // Check if user has opted out
    const savedPreference = localStorage.getItem('analytics_enabled');
    if (savedPreference !== null) {
        analyticsEnabled = savedPreference === 'true';
    }

    // Only initialize if enabled and in production
    if (analyticsEnabled && !import.meta.env.DEV && POSTHOG_KEY) {
        try {
            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                autocapture: false, // Disable auto-capture for privacy
                capture_pageview: false, // Manual page view tracking
                capture_pageleave: false,
                disable_session_recording: true, // No session recording for desktop app
                disable_surveys: true,
                persistence: 'localStorage',
                loaded: (posthog) => {
                    posthogInitialized = true;
                    console.log('Analytics initialized');
                }
            });
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
        }
    } else if (import.meta.env.DEV) {
        console.log('Analytics disabled in development mode');
    }
}

// Track an event
export function trackEvent(eventName, properties = {}) {
    if (!analyticsEnabled || !posthogInitialized) return;

    try {
        posthog.capture(eventName, {
            ...properties,
            platform: 'macos', // Since this is macOS only currently
            app_version: '1.0.0', // TODO: Pull from package.json or tauri.conf.json
        });
    } catch (error) {
        console.error('Failed to track event:', error);
    }
}

// Track an error
export function trackError(error, context = {}) {
    if (!analyticsEnabled || !posthogInitialized) return;

    try {
        posthog.capture('error', {
            error_message: error.message,
            error_name: error.name,
            error_stack: error.stack?.substring(0, 500), // Limit stack trace length
            ...context,
        });
    } catch (err) {
        console.error('Failed to track error:', err);
    }
}

// Enable/disable analytics
export function setAnalyticsEnabled(enabled) {
    analyticsEnabled = enabled;
    localStorage.setItem('analytics_enabled', enabled.toString());

    if (enabled && !posthogInitialized && !import.meta.env.DEV) {
        initAnalytics();
    } else if (!enabled && posthogInitialized) {
        posthog.opt_out_capturing();
    } else if (enabled && posthogInitialized) {
        posthog.opt_in_capturing();
    }

    trackEvent('analytics_preference_changed', { enabled });
}

// Check if analytics is enabled
export function isAnalyticsEnabled() {
    return analyticsEnabled;
}

// Events to track:
// - app_opened
// - hook_toggled (hook_type, enabled)
// - sound_changed (hook_type, sound_type)
// - focus_mode_toggled (enabled)
// - custom_sound_added
// - settings_saved
// - error (with error details)
