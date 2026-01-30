import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

const PRAYER_CACHE_KEY = 'prayer_times_cache';
const LOCATION_CACHE_KEY = 'user_location_cache';
const SETTINGS_KEY = 'prayer_settings';

// Default settings
const DEFAULT_SETTINGS = {
  method: 'MWL', // Moslim World League
  madhab: 'Shafi', // Standard
  adjustment: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

export const getPrayerSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Saves settings and handles intelligent cache invalidation/prefetching
 */
export const savePrayerSettings = async (newSettings) => {
  const oldSettings = await getPrayerSettings();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

  // If method or adjustment changed, invalidate cache
  if (oldSettings.method !== newSettings.method ||
    JSON.stringify(oldSettings.adjustment) !== JSON.stringify(newSettings.adjustment)) {

    console.log('[PrayerService] Method/Adjustment changed, refreshing cache...');
    await invalidatePrayerCache();
    // Don't block UI with refresh, let it happen naturally on next view or background
    // refreshPrayerCache(newSettings).catch(console.error); 
  }
};

export const getUserLocation = async () => {
  try {
    // 1. Check permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // Check cached location if permission denied now but granted before
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) return JSON.parse(cached);
      throw new Error('PERMISSION_DENIED');
    }

    // 2. Try to get cached location first for speed if it exists and is recent enough (optional optimization)
    // For now, let's trust cached location heavily to speed up startup
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      // In a real app we might check timestamp. 
      // For now, let's verify if we want to refresh it.
      // We'll proceed to get fresh location in background or if needed.
      // Actually, for prayer times, location doesn't change drastically min-to-min.
      // Let's rely on fresh location but timeout quickly.
    }

    // 2. Get current position (with timeout to fail fast to cache)
    // Use getLastKnownPositionAsync which is much faster than getCurrentPositionAsync
    let location = await Location.getLastKnownPositionAsync();
    if (!location) {
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: 'Detected Location'
    };

    // 3. Cache it
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords));
    return coords;
  } catch (error) {
    // Return cached if available on error
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    throw error;
  }
};

// Map string method to Adhan library constant
const getAdhanMethod = (methodStr) => {
  switch (methodStr) {
    case 'MWL': return CalculationMethod.MuslimWorldLeague();
    case 'ISNA': return CalculationMethod.NorthAmerica();
    case 'Egypt': return CalculationMethod.Egyptian();
    case 'UmmAlQura': return CalculationMethod.UmmAlQura();
    case 'Karachi': return CalculationMethod.Karachi();
    default: return CalculationMethod.MuslimWorldLeague();
  }
};

// Calculate locally using Adhan JS
const calculateLocalTimes = (date, coords, settings) => {
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const params = getAdhanMethod(settings.method);

  if (settings.madhab === 'Hanafi') {
    params.madhab = Madhab.Hanafi;
  }

  // Apply adjustments if any
  if (settings.adjustment) {
    params.adjustments = settings.adjustment;
  }

  const prayerTimes = new PrayerTimes(coordinates, date, params);

  // Format to HH:MM
  const format = (d) => {
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return {
    Fajr: format(prayerTimes.fajr),
    Dhuhr: format(prayerTimes.dhuhr),
    Asr: format(prayerTimes.asr),
    Maghrib: format(prayerTimes.maghrib),
    Isha: format(prayerTimes.isha),
    date: date.toISOString().split('T')[0],
    source: 'Local Calculation',
    method: settings.method
  };
};

// Invalidate all prayer time caches
export const invalidatePrayerCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prayerKeys = keys.filter(k => k.startsWith(PRAYER_CACHE_KEY));
    if (prayerKeys.length > 0) {
      await AsyncStorage.multiRemove(prayerKeys);
      console.log(`[PrayerService] Invalidated ${prayerKeys.length} cache entries`);
    }
  } catch (error) {
    console.warn('Error clearing prayer cache:', error);
  }
};

export const getPrayerTimesForMonth = async (month, year, forceRefresh = false, providedSettings = null) => {
  try {
    const settings = providedSettings || await getPrayerSettings();
    const location = await getUserLocation();

    const cacheKey = `${PRAYER_CACHE_KEY}_${year}_${month}_${location.latitude.toFixed(2)}_${settings.method}`;

    // 1. Try Cache
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // 2. Use Local Calculation (Fastest & Reliable)
    // We are generating for the whole month.
    // Optimization: Use Promise.resolve to unblock if used in UI loop, 
    // but here we just process synchronously as it's just JS math (very fast).

    const daysInMonth = new Date(year, month, 0).getDate();
    const localData = [];

    // Batch calculation
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      // Important: date needs to be handling local time correctly or UTC for calculating? 
      // Adhan JS handles inputs as JS Date objects. 
      // We create date instance for local timezone noon to avoid crossing DST boundaries oddly if using 00:00
      date.setHours(12, 0, 0, 0);

      const times = calculateLocalTimes(date, location, settings);
      localData.push({
        date: date.toISOString().split('T')[0],
        times: {
          Fajr: times.Fajr,
          Dhuhr: times.Dhuhr,
          Asr: times.Asr,
          Maghrib: times.Maghrib,
          Isha: times.Isha,
        },
        source: 'Local Calculation',
        method: settings.method
      });
    }

    // Cache the result
    await AsyncStorage.setItem(cacheKey, JSON.stringify(localData));
    return localData;

    /* 
    DEPRECATED: API Fetching
    Fetching from ALAdhan API adds latency and reliability issues. 
    Adhan-js library provides the exact same calculation locally instantly.
    We removed the fetchAlAdhanMonth fallback logic to prioritize speed.
    */

  } catch (e) {
    if (e.message === 'PERMISSION_DENIED') {
      throw e; // Propagate for UI handling
    }
    console.error('Prayer service error', e);
    return [];
  }
};

export const getTodayPrayerTimes = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const data = await getPrayerTimesForMonth(month, year);

  // YYYY-MM-DD
  const todayStr = now.toISOString().split('T')[0];

  return data.find(d => {
    return d.date === todayStr;
  }) || null;
};
