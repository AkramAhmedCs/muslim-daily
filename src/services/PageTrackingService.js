import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFirstQuery, writeQuery, runTransaction } from './DatabaseService';
import { incrementQuranStats } from './storage';
import { syncDailyProgress } from './GoalsService';

const LEGACY_TRACKING_KEY = '@muslim_daily_page_tracking';

const getTodayString = () => new Date().toISOString().split('T')[0];

export const trackPageView = async (pageNumber) => {
  if (!pageNumber) return;

  const today = getTodayString();

  try {
    // 1. Check if already exists (using readFirstQuery for Next API)
    const checkResult = await readFirstQuery(
      `SELECT 1 as exists_flag FROM page_reads WHERE page = ? AND date_read = ?`,
      [pageNumber, today]
    );

    if (!checkResult) {
      // 2. Insert new record
      await writeQuery(
        `INSERT INTO page_reads (page, date_read) VALUES (?, ?)`,
        [pageNumber, today]
      );

      // 3. Increment global stats
      await incrementQuranStats({ pages: 1 });

      // 4. AUTO-SYNC: Update Reading Goal
      try {
        const totalToday = await getTodayUniquePagesCount();
        // Async call, don't await to avoid UI block (optional, but safer)
        syncDailyProgress(totalToday).catch(err => console.warn('Goal Sync Error', err));
      } catch (e) {
        console.warn('Goal Sync Error Inner', e);
      }

      console.log(`[PageTracking] Tracked unique page: ${pageNumber}`);
    }
  } catch (error) {
    console.error('[PageTracking] Error tracking page:', error);
  }
};

export const getTodayUniquePagesCount = async () => {
  const today = getTodayString();
  try {
    const result = await readFirstQuery(
      `SELECT COUNT(*) as count FROM page_reads WHERE date_read = ?`,
      [today]
    );
    return result ? result.count : 0;
  } catch (e) {
    console.error('[PageTracking] Error counting pages:', e);
    return 0;
  }
};

export const migrateLegacyData = async () => {
  try {
    const json = await AsyncStorage.getItem(LEGACY_TRACKING_KEY);
    if (!json) return;

    const trackingData = JSON.parse(json);
    const dates = Object.keys(trackingData);

    if (dates.length === 0) return;

    console.log('[PageTracking] Migrating legacy data...', dates.length, 'dates');

    // Use transaction for bulk insert
    // Note: for...of is required for async/await inside transaction
    await runTransaction(async () => {
      for (const date of dates) {
        const pages = trackingData[date];
        if (Array.isArray(pages)) {
          for (const page of pages) {
            await writeQuery(
              `INSERT OR IGNORE INTO page_reads (page, date_read) VALUES (?, ?)`,
              [page, date]
            );
          }
        }
      }
    });

    await AsyncStorage.setItem(LEGACY_TRACKING_KEY + '_migrated', json);
    await AsyncStorage.removeItem(LEGACY_TRACKING_KEY);

    console.log('[PageTracking] Migration complete.');

  } catch (error) {
    console.error('[PageTracking] Migration error:', error);
  }
};
