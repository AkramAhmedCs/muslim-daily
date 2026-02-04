import * as Haptics from 'expo-haptics';
import { FEATURES } from '../config/features';

// Debounce map
const debounceTimestamps = {};
const DEBOUNCE_MS = 300;

/**
 * Triggers a light impact haptic feedback.
 * @param {string} type - 'light' | 'medium' | 'success'
 * @param {string} debounceKey - Unique key for debouncing (e.g. 'nav', 'tap', 'global')
 */
export const triggerHaptic = (type = 'light', debounceKey = 'global') => {
  // 1. Feature Flag Check
  if (!FEATURES.haptics) return;

  // 2. Debounce Check
  const now = Date.now();
  const lastTime = debounceTimestamps[debounceKey] || 0;

  if (now - lastTime < DEBOUNCE_MS) {
    return; // Skip if within window for this key
  }
  debounceTimestamps[debounceKey] = now;

  // 3. Execution (UI Thread)
  try {
    if (type === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (type === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // 4. Telemetry (Dev Only)
    if (__DEV__) {
      console.log('[Haptics] Fired:', type, Object.keys(Haptics.ImpactFeedbackStyle));
    }
  } catch (error) {
    console.warn('[Haptics] Error:', error);
  }
};

export const haptics = {
  /**
   * Trigger impact haptic feedback
   * @param {string} style - 'light', 'medium', or 'heavy'
   */
  impact: (style = 'light') => triggerHaptic(style),

  /**
   * Trigger notification haptic feedback
   * @param {string} type - 'success', 'warning', or 'error'
   */
  notification: (type = 'success') => triggerHaptic(type),

  /**
   * Trigger selection haptic feedback
   * Used for UI element selection (toggles, pickers, etc.)
   */
  selection: () => {
    // Use 'medium' for selection feedback (feels more responsive than 'light')
    return triggerHaptic('medium');
  },

  // Legacy support if needed, though selection covers it
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};
