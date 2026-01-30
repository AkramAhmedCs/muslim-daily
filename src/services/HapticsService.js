import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * Haptics Service
 * Provides consistent tactile feedback across the app.
 * Gracefully degrades on Web or unsupported devices.
 */

const isWeb = Platform.OS === 'web';

const trigger = async (type) => {
  if (isWeb) return;
  console.log(`[Haptics] Triggering: ${type}`);
  try {
    // Expo Haptics (Best Experience)
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (e) {
    // If Expo Haptics fails, or just to be safe on Android where it can be subtle:
    // Fallback to standard Vibration API
    console.warn('Haptics failed, falling back to Vibration');
  }

  // Backup Vibration for Android (Explicit)
  if (Platform.OS === 'android') {
    const SHORT = 10;
    const MEDIUM = 40;
    switch (type) {
      case 'light': case 'selection': Vibration.vibrate(SHORT); break;
      case 'medium': case 'success': Vibration.vibrate(MEDIUM); break;
      case 'error': case 'heavy': Vibration.vibrate([0, 50, 50, 50]); break;
    }
  }
};

export const haptics = {
  light: () => trigger('light'),
  medium: () => trigger('medium'),
  heavy: () => trigger('heavy'),
  success: () => trigger('success'),
  warning: () => trigger('warning'),
  error: () => trigger('error'),
  selection: () => trigger('selection'),
};
