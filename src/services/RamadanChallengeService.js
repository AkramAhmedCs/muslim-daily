/**
 * RamadanChallengeService.js
 * Manages Ramadan Challenge progress — complete Quran in 30 days (1 Juz/day)
 *
 * IMPORTANT: Uses completely separate storage from main Quran reader.
 * Storage key: 'ramadan_challenge_progress' (no overlap with main reader keys)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJuzProgressForAyah } from './JuzService';

const STORAGE_KEY = 'ramadan_challenge_progress';

const INITIAL_STATE = {
  currentSurah: 1,
  currentAyah: 1,
  startedAt: null,
  juzsCompleted: 0,
  isActive: false,
  lastSavedAt: null,
};

/**
 * Load challenge progress from storage
 * @returns {Promise<Object>} Challenge progress object
 */
export const loadChallengeProgress = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return { ...INITIAL_STATE };
    return JSON.parse(data);
  } catch (error) {
    console.error('[RamadanChallenge] Error loading progress:', error);
    return { ...INITIAL_STATE };
  }
};

/**
 * Save challenge progress to storage.
 * Called automatically on every verse change and app background.
 *
 * @param {number} surah - Current surah number
 * @param {number} ayah - Current ayah number
 * @returns {Promise<boolean>} Success status
 */
export const saveChallengeProgress = async (surah, ayah) => {
  try {
    const existing = await loadChallengeProgress();

    // Calculate Juz progress — null-safe: keep existing value if lookup fails
    const juzProgress = getJuzProgressForAyah(surah, ayah);
    let juzsCompleted = existing.juzsCompleted || 0;

    if (juzProgress) {
      // If we're past the first verse of a juz, then all prior juzs are completed
      const calculatedCompleted = juzProgress.juz - 1;
      // If at the last verse of the current juz, count it as completed too
      const completedWithCurrent = juzProgress.isLastVerse
        ? juzProgress.juz
        : calculatedCompleted;
      juzsCompleted = Math.max(completedWithCurrent, existing.juzsCompleted || 0);
    }
    // If juzProgress is null, juzsCompleted stays as existing value (no reset to 0)

    const updatedProgress = {
      ...existing,
      currentSurah: surah,
      currentAyah: ayah,
      juzsCompleted,
      isActive: true,
      startedAt: existing.startedAt || Date.now(),
      lastSavedAt: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
    return true;
  } catch (error) {
    console.error('[RamadanChallenge] Error saving progress:', error);
    return false;
  }
};

/**
 * Get progress for home screen display
 * @returns {Promise<Object>} { juzsCompleted, totalJuzs, percentage, ... }
 */
export const getChallengeHomeStats = async () => {
  try {
    const progress = await loadChallengeProgress();
    return {
      juzsCompleted: progress.juzsCompleted || 0,
      totalJuzs: 30,
      percentage: ((progress.juzsCompleted || 0) / 30) * 100,
      currentSurah: progress.currentSurah || 1,
      currentAyah: progress.currentAyah || 1,
      isActive: progress.isActive || false,
      startedAt: progress.startedAt,
    };
  } catch (error) {
    console.error('[RamadanChallenge] Error getting stats:', error);
    return { juzsCompleted: 0, totalJuzs: 30, percentage: 0, isActive: false };
  }
};

/**
 * Reset challenge (start over)
 * @returns {Promise<boolean>} Success status
 */
export const resetChallenge = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[RamadanChallenge] Error resetting:', error);
    return false;
  }
};
