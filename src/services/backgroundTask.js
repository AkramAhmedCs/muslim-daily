import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayPrayerTimes } from './PrayerTimesService';

const GREETING_TASK_NAME = 'GREETING_BACKGROUND_UPDATE';
const GREETING_STORAGE_KEY = 'current_greeting';

const STRINGS = {
  MORNING: 'صباح الخير',
  EVENING: 'مساء الخير'
};

// Define Task
TaskManager.defineTask(GREETING_TASK_NAME, async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();

    // Default Fallback
    let newGreeting = (currentHour >= 4 && currentHour < 18) ? STRINGS.MORNING : STRINGS.EVENING;

    // Try Prayer Times
    try {
      const todayTimes = await getTodayPrayerTimes();
      if (todayTimes && todayTimes.times) {
        const [fHour, fMin] = todayTimes.times.Fajr.split(':').map(Number);
        const [mHour, mMin] = todayTimes.times.Maghrib.split(':').map(Number);

        const fajrDate = new Date();
        fajrDate.setHours(fHour, fMin, 0, 0);

        const maghribDate = new Date();
        maghribDate.setHours(mHour, mMin, 0, 0);

        if (now >= fajrDate && now < maghribDate) {
          newGreeting = STRINGS.MORNING;
        } else {
          newGreeting = STRINGS.EVENING;
        }
      }
    } catch (err) {
      console.log('Background prayer fetch failed, using fallback');
    }

    // Save
    await AsyncStorage.setItem(GREETING_STORAGE_KEY, newGreeting);

    // Return Result
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register Function
export const registerGreetingTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GREETING_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(GREETING_TASK_NAME, {
        minimumInterval: 60 * 60, // 1 hour (best effort, OS decides)
        stopOnTerminate: false, // Continue after kill
        startOnBoot: true,      // Android only
      });
      console.log('Background Greeting Task Registered');
    }
  } catch (err) {
    console.log('Task Registration Failed:', err);
  }
};
