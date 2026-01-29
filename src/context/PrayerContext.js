import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTodayPrayerTimes, getPrayerTimesForMonth, getPrayerSettings, savePrayerSettings, getUserLocation } from '../services';

const PrayerContext = createContext();

export const PrayerProvider = ({ children }) => {
  const [todayTimes, setTodayTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [locationName, setLocationName] = useState('Locating...');

  // Initial Data Load
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load Settings
      const savedSettings = await getPrayerSettings();
      setSettings(savedSettings);

      // 2. Load Location (or verify permission)
      try {
        const coords = await getUserLocation();
        setLocationName(coords.city || 'My Location');
      } catch (e) {
        if (e.message === 'PERMISSION_DENIED') {
          setLocationName('Location Required');
          setError('PERMISSION_DENIED');
          setLoading(false);
          return;
        }
      }

      // 3. Load Prayer Times for Today
      const today = await getTodayPrayerTimes();
      setTodayTimes(today);

      // 4. Prefetch this month (cache warming)
      const now = new Date();
      getPrayerTimesForMonth(now.getMonth() + 1, now.getFullYear());

    } catch (e) {
      console.error('Context load error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateSettings = async (newSettings) => {
    await savePrayerSettings(newSettings);
    setSettings(newSettings);
    // Reload times with new settings
    loadData();
  };

  const refreshTimes = () => {
    loadData();
  };

  return (
    <PrayerContext.Provider
      value={{
        todayTimes,
        loading,
        error,
        settings,
        locationName,
        updateSettings,
        refreshTimes
      }}
    >
      {children}
    </PrayerContext.Provider>
  );
};

export const usePrayerTimes = () => {
  const context = useContext(PrayerContext);
  if (!context) {
    throw new Error('usePrayerTimes must be used within a PrayerProvider');
  }
  return context;
};
