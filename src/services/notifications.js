import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSettings } from './storage';

// Detect if running in Expo Go (where push notifications are not supported in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Setup notification channel for Android (required for notifications to fire)
export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a73e8',
      sound: 'default',
    });
  }
};

// Request permissions with diagnostics
export const requestNotificationPermissions = async () => {
  try {
    console.log('[Notifications] Requesting permissions...');

    if (isExpoGo) {
      console.log('[Notifications] Running in Expo Go - push notifications limited, local allowed.');
    }

    // Setup Android channel first
    await setupNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log(`[Notifications] Existing status: ${existingStatus}`);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log(`[Notifications] New status: ${finalStatus}`);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permissions not granted!');
      return false;
    }

    // Get Token for diagnostics (even if not sending to server yet)
    // In Expo Go, getExpoPushTokenAsync might fail if not logged in or project ID missing
    if (!isExpoGo) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('[Notifications] Expo Push Token:', tokenData.data);
      } catch (e) {
        console.log('[Notifications] Failed to get push token (expected in local dev if no project ID):', e.message);
      }
    }

    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting notification permissions:', error);
    return false;
  }
};

// Schedule a daily notification
const scheduleDailyNotification = async (identifier, title, body, hour, minute) => {
  try {
    // Cancel existing notification with same identifier
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => { });

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });

    return true;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return false;
  }
};

// Send an immediate test notification
export const sendTestNotification = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Muslim Daily',
        body: 'Test notification - Reminders are working! ✓',
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: null, // Immediate notification
    });

    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

// Cancel a notification
export const cancelNotification = async (identifier) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Schedule morning adhkar reminder
export const scheduleMorningAdhkar = async (time = '06:00') => {
  const [hour, minute] = time.split(':').map(Number);
  return scheduleDailyNotification(
    'morning-adhkar',
    'أذكار الصباح',
    'Time for Morning Adhkar - Start your day with remembrance of Allah',
    hour,
    minute
  );
};

// Schedule evening adhkar reminder
export const scheduleEveningAdhkar = async (time = '18:00') => {
  const [hour, minute] = time.split(':').map(Number);
  return scheduleDailyNotification(
    'evening-adhkar',
    'أذكار المساء',
    'Time for Evening Adhkar - End your day with remembrance of Allah',
    hour,
    minute
  );
};

// Schedule Quran reminder
export const scheduleQuranReminder = async (time = '20:00') => {
  const [hour, minute] = time.split(':').map(Number);
  return scheduleDailyNotification(
    'quran-reminder',
    'Daily Quran',
    'Time for your daily Quran reading',
    hour,
    minute
  );
};

// Schedule all reminders based on settings
export const scheduleAllReminders = async () => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  const settings = await getSettings();

  if (settings.morningReminderEnabled) {
    await scheduleMorningAdhkar(settings.morningReminderTime);
  } else {
    await cancelNotification('morning-adhkar');
  }

  if (settings.eveningReminderEnabled) {
    await scheduleEveningAdhkar(settings.eveningReminderTime);
  } else {
    await cancelNotification('evening-adhkar');
  }

  if (settings.quranReminderEnabled) {
    await scheduleQuranReminder(settings.quranReminderTime);
  } else {
    await cancelNotification('quran-reminder');
  }

  return true;
};

// Cancel all reminders
export const cancelAllReminders = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};

// Get all scheduled notifications (for debugging)
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};
