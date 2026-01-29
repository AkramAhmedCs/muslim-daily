import AsyncStorage from '@react-native-async-storage/async-storage';
import { incrementQuranStats } from './storage';

const PAGE_TRACKING_KEY = '@muslim_daily_page_tracking';

// Format: { [dateString]: [page1, page2, ...] }
// dateString: YYYY-MM-DD

const getTodayString = () => new Date().toISOString().split('T')[0];

export const trackPageView = async (pageNumber) => {
  if (!pageNumber) return;

  try {
    const today = getTodayString();
    const json = await AsyncStorage.getItem(PAGE_TRACKING_KEY);
    const trackingData = json ? JSON.parse(json) : {};

    // Get today's pages or init empty array
    const todayPages = trackingData[today] || [];

    // Check if page already tracked today
    if (!todayPages.includes(pageNumber)) {
      // Add page
      todayPages.push(pageNumber);

      // Update data
      trackingData[today] = todayPages;

      // Cleanup old dates (keep last 7 days for safety/history if needed, or just today)
      // For simplicity, let's keep only today to save space, or maybe last few days.
      // Let's just keep everything for now but realistically we should prune.
      // Pruning logic:
      Object.keys(trackingData).forEach(date => {
        if (date !== today) {
          delete trackingData[date]; // Simple cleanup: keep only today
        }
      });

      // Save back
      await AsyncStorage.setItem(PAGE_TRACKING_KEY, JSON.stringify(trackingData));

      // Increment global stats
      // IMPT: We only increment stats if it's a NEW page for today
      await incrementQuranStats({ pages: 1 });

      console.log(`[PageTracking] Tracked unique page: ${pageNumber}`);
    } else {
      // console.log(`[PageTracking] Page ${pageNumber} already read today`);
    }

  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

export const getTodayUniquePagesCount = async () => {
  try {
    const today = getTodayString();
    const json = await AsyncStorage.getItem(PAGE_TRACKING_KEY);
    const trackingData = json ? JSON.parse(json) : {};
    const todayPages = trackingData[today] || [];
    return todayPages.length;
  } catch (e) {
    return 0;
  }
};
