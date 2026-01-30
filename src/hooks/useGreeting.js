import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrayerTimes } from '../context/PrayerContext';

// Default Thresholds
const DEFAULT_MORNING_START = 4; // 04:00
const DEFAULT_EVENING_START = 18; // 18:00

export const GREETING_STORAGE_KEY = 'current_greeting';

const STRINGS = {
  MORNING: 'صباح الخير',
  EVENING: 'مساء الخير',
  DEFAULT: 'مساء النور'
};

export const useGreeting = () => {
  const { todayTimes } = usePrayerTimes();
  const [greeting, setGreeting] = useState(STRINGS.DEFAULT);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Timer ref to clear on unmount
  const timerRef = useRef(null);

  // Parse "HH:mm" to Date object for today
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const calculateGreeting = useCallback(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    let newGreeting = STRINGS.DEFAULT;
    let method = 'default';

    // 1. Try Prayer Times (Primary)
    if (todayTimes && todayTimes.times) {
      const fajrDate = parseTime(todayTimes.times.Fajr);
      const maghribDate = parseTime(todayTimes.times.Maghrib);

      if (fajrDate && maghribDate) {
        // Morning: From Fajr (inclusive) to Maghrib (exclusive)
        if (now >= fajrDate && now < maghribDate) {
          newGreeting = STRINGS.MORNING;
        } else {
          // Evening: From Maghrib until next Fajr
          newGreeting = STRINGS.EVENING;
        }
        method = 'prayer_times';
      }
    }

    // 2. Fallback to Fixed Thresholds
    if (method === 'default') {
      if (currentHour >= DEFAULT_MORNING_START && currentHour < DEFAULT_EVENING_START) {
        newGreeting = STRINGS.MORNING;
      } else {
        newGreeting = STRINGS.EVENING;
      }
      method = 'fallback';
    }

    // Update state
    setGreeting(newGreeting);
    setLastUpdated(now);

    // Persist for instant load next time
    try {
      await AsyncStorage.setItem(GREETING_STORAGE_KEY, newGreeting);
    } catch (e) {
      // Ignore storage errors
    }

    return newGreeting;
  }, [todayTimes]);

  // Initial load from storage (fast)
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(GREETING_STORAGE_KEY);
        if (cached) setGreeting(cached);
      } catch (e) { }
      // Then calculate fresh
      calculateGreeting();
    };
    loadCached();
  }, [calculateGreeting]);

  // AppState Listener (Resume updates)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        calculateGreeting();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [calculateGreeting]);

  // Periodic check while active (Battery safe: 1 minute)
  useEffect(() => {
    // Clear existing
    if (timerRef.current) clearInterval(timerRef.current);

    // Set new timer
    timerRef.current = setInterval(() => {
      calculateGreeting();
    }, 60000); // 1 minute

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [calculateGreeting]);

  return {
    greeting,
    lastUpdated,
    refreshGreeting: calculateGreeting,
    forceUpdate: calculateGreeting
  };
};
