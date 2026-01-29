import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  CHECKLIST: '@muslim_daily_checklist',
  SETTINGS: '@muslim_daily_settings',
  ADHKAR_PROGRESS: '@muslim_daily_adhkar_progress',
  LAST_RESET_DATE: '@muslim_daily_last_reset',
  STREAK: '@muslim_daily_streak',
  QURAN_STATS: '@muslim_daily_quran_stats',
  DATA_VERSION: '@muslim_daily_data_version',
};

// Current data version - increment this to force a data reset
const CURRENT_DATA_VERSION = '2';

// Run data migration if needed (clears corrupted string-boolean data)
export const runDataMigration = async () => {
  try {
    const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    if (storedVersion !== CURRENT_DATA_VERSION) {
      console.log('[Storage] Running data migration to version', CURRENT_DATA_VERSION);
      // Clear all data and reinitialize
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CHECKLIST,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.ADHKAR_PROGRESS,
      ]);
      await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
      console.log('[Storage] Data migration complete');
    }
  } catch (error) {
    console.error('[Storage] Migration error:', error);
  }
};

// Get today's date string for daily reset
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// Reset data if it's a new day
export const checkAndResetDaily = async () => {
  try {
    const lastReset = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE);
    const today = getTodayString();

    if (lastReset !== today) {
      // Reset daily progress
      await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify({
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        morningAdhkar: false,
        eveningAdhkar: false,
        quranRead: false,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.ADHKAR_PROGRESS, JSON.stringify({}));

      // Handle Streak Reset logic:
      // If yesterday was NOT completed, and today is a new day, streak might be broken.
      // However, we only reset the "checklist" items here.
      // The actual streak calculation usually happens when we check completion status.
      // But if user opens app after 2 days, previous streak is broken.
      // We will handle streak validation in getStreak() or a dedicated check.

      // Reset Daily Quran Stats (keep totals)
      const quranStats = await getQuranStats();
      quranStats.dailyTime = 0;
      quranStats.dailyPages = 0;
      quranStats.dailyVerses = 0;
      await AsyncStorage.setItem(STORAGE_KEYS.QURAN_STATS, JSON.stringify(quranStats));

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, today);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking daily reset:', error);
    return false;
  }
};

// Checklist operations
export const getChecklist = async () => {
  try {
    await checkAndResetDaily();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST);
    const parsed = data ? JSON.parse(data) : {};

    const defaults = {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      morningAdhkar: false,
      eveningAdhkar: false,
      quranRead: false,
    };

    // Helper to ensure boolean (duplicated for safety)
    const ensureBool = (val, defaultVal) => {
      if (val === undefined || val === null) return defaultVal;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return !!val;
    };

    return {
      ...defaults,
      ...parsed,
      fajr: ensureBool(parsed.fajr, defaults.fajr),
      dhuhr: ensureBool(parsed.dhuhr, defaults.dhuhr),
      asr: ensureBool(parsed.asr, defaults.asr),
      maghrib: ensureBool(parsed.maghrib, defaults.maghrib),
      isha: ensureBool(parsed.isha, defaults.isha),
      morningAdhkar: ensureBool(parsed.morningAdhkar, defaults.morningAdhkar),
      eveningAdhkar: ensureBool(parsed.eveningAdhkar, defaults.eveningAdhkar),
      quranRead: ensureBool(parsed.quranRead, defaults.quranRead),
    };
  } catch (error) {
    console.error('Error getting checklist:', error);
    return {};
  }
};

export const updateChecklist = async (key, value) => {
  try {
    const checklist = await getChecklist();
    checklist[key] = value;
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(checklist));

    // Check for streak update immediately after checklist update
    await checkAndUpdateStreak(checklist);

    return checklist;
  } catch (error) {
    console.error('Error updating checklist:', error);
    return null;
  }
};

// Settings operations
export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : {};

    // Default settings
    const defaults = {
      morningReminderEnabled: true,
      morningReminderTime: '06:00',
      eveningReminderEnabled: true,
      eveningReminderTime: '18:00',
      quranReminderEnabled: true,
      quranReminderTime: '20:00',
      fastingReminder: false,
      arabicFontSize: 'regular',
      showTranslation: true,
    };

    // Helper to ensure boolean
    const ensureBool = (val, defaultVal) => {
      if (val === undefined || val === null) return defaultVal;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return !!val;
    };

    // Merge with type safety
    return {
      ...defaults,
      ...parsed,
      // Force boolean types for safety
      morningReminderEnabled: ensureBool(parsed.morningReminderEnabled, defaults.morningReminderEnabled),
      eveningReminderEnabled: ensureBool(parsed.eveningReminderEnabled, defaults.eveningReminderEnabled),
      quranReminderEnabled: ensureBool(parsed.quranReminderEnabled, defaults.quranReminderEnabled),
      fastingReminder: ensureBool(parsed.fastingReminder, defaults.fastingReminder),
      showTranslation: ensureBool(parsed.showTranslation, defaults.showTranslation),
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
};

export const updateSettings = async (settings) => {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating settings:', error);
    return null;
  }
};

// Adhkar progress for counting repetitions
export const getAdhkarProgress = async () => {
  try {
    await checkAndResetDaily();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ADHKAR_PROGRESS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting adhkar progress:', error);
    return {};
  }
};

export const updateAdhkarProgress = async (adhkarId, count) => {
  try {
    const progress = await getAdhkarProgress();
    progress[adhkarId] = count;
    await AsyncStorage.setItem(STORAGE_KEYS.ADHKAR_PROGRESS, JSON.stringify(progress));
    return progress;
  } catch (error) {
    console.error('Error updating adhkar progress:', error);
    return null;
  }
};

export const resetAdhkarProgress = async (adhkarId) => {
  try {
    const progress = await getAdhkarProgress();
    delete progress[adhkarId];
    await AsyncStorage.setItem(STORAGE_KEYS.ADHKAR_PROGRESS, JSON.stringify(progress));
    return progress;
  } catch (error) {
    console.error('Error resetting adhkar progress:', error);
    return null;
  }
};

// Streak Operations
export const getStreak = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
    const defaults = { current: 0, best: 0, lastCompletionDate: null };
    if (!data) return defaults;

    const streak = JSON.parse(data);

    // Validate streak continuity
    if (streak.lastCompletionDate) {
      const last = new Date(streak.lastCompletionDate);
      const today = new Date();
      // Normalize to midnight
      last.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today - last);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If completed today, streak is valid (and unchanged)
      // If completed yesterday (diffDays = 1), streak is valid
      // If completed > 1 day ago, streak starts over (but best is kept)
      if (diffDays > 1) {
        streak.current = 0;
        await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting streak:', error);
    return { current: 0, best: 0, lastCompletionDate: null };
  }
};

export const checkAndUpdateStreak = async (checklist) => {
  try {
    // Check if ALL daily tasks are completed
    const allCompleted = Object.values(checklist).every(val => val === true);
    if (!allCompleted) return;

    const today = getTodayString();
    let streak = await getStreak();

    // Avoid double counting for today
    if (streak.lastCompletionDate === today) return;

    // Increment streak
    streak.current += 1;
    streak.best = Math.max(streak.current, streak.best);
    streak.lastCompletionDate = today;

    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  } catch (error) {
    console.error('Error updating streak:', error);
  }
};

// Quran Analytics Operations
export const getQuranStats = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.QURAN_STATS);
    return data ? JSON.parse(data) : {
      dailyTime: 0, // seconds
      dailyPages: 0,
      dailyVerses: 0,
      totalTime: 0,
      totalPages: 0,
      totalVerses: 0,
      lastReadDate: null
    };
  } catch (error) {
    console.error('Error getting quran stats', error);
    return {};
  }
};

export const updateQuranStats = async (newStats) => {
  try {
    const current = await getQuranStats();
    // Merge updates
    // Note: Logic for accumulating values usually happens in the component or service wrapper
    // Here we just save what is passed, or we can handle accumulation if we pass specific increments
    // For simplicity, let's assume 'newStats' contains the FULL updated object or specific fields to update.

    const updated = { ...current, ...newStats };
    await AsyncStorage.setItem(STORAGE_KEYS.QURAN_STATS, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating quran stats', error);
    return null;
  }
};

export const incrementQuranStats = async ({ time = 0, pages = 0, verses = 0 }) => {
  try {
    const stats = await getQuranStats();

    stats.dailyTime += time; // Time is seconds (integer)
    stats.dailyPages = Math.floor(stats.dailyPages) + Math.floor(pages);
    stats.dailyVerses = Math.floor(stats.dailyVerses) + Math.floor(verses);

    stats.totalTime += time;
    stats.totalPages = Math.floor(stats.totalPages) + Math.floor(pages);
    stats.totalVerses = Math.floor(stats.totalVerses) + Math.floor(verses);

    stats.lastReadDate = getTodayString();

    await AsyncStorage.setItem(STORAGE_KEYS.QURAN_STATS, JSON.stringify(stats));
    return stats;
  } catch (error) {
    console.error('Error incrementing quran stats', error);
    return null;
  }
};

// Reset all app data to fresh state
export const resetAllData = async () => {
  try {
    // Clear all storage keys
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));

    // Reinitialize with fresh checklist (all 8 tasks)
    const freshChecklist = {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      morningAdhkar: false,
      eveningAdhkar: false,
      quranRead: false,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(freshChecklist));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, getTodayString());

    return true;
  } catch (error) {
    console.error('Error resetting all data:', error);
    return false;
  }
};
