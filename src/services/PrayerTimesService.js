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

export const savePrayerSettings = async (settings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

    // 2. Get current position
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: 'Detected Location' // We could reverse geocode here if needed
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

const fetchAlAdhanMonth = async (month, year, coords, method) => {
  // Mappings for AlAdhan API methods
  const methodMap = {
    'MWL': 3,
    'ISNA': 2,
    'Egypt': 5,
    'UmmAlQura': 4,
    'Karachi': 1,
  };
  const methodId = methodMap[method] || 3;

  const url = `https://api.aladhan.com/v1/calendar?latitude=${coords.latitude}&longitude=${coords.longitude}&method=${methodId}&month=${month}&year=${year}`;

  const response = await fetch(url);
  const json = await response.json();

  if (json.code !== 200) throw new Error('API Error');

  // Transform to our internal format
  return json.data.map(day => ({
    date: day.date.gregorian.date.split('-').reverse().join('-'), // "DD-MM-YYYY" -> YYYY-MM-DD
    times: {
      Fajr: day.timings.Fajr.split(' ')[0],
      Dhuhr: day.timings.Dhuhr.split(' ')[0],
      Asr: day.timings.Asr.split(' ')[0],
      Maghrib: day.timings.Maghrib.split(' ')[0],
      Isha: day.timings.Isha.split(' ')[0],
    },
    source: 'AlAdhan API',
    method: method,
    meta: day.meta
  }));
};

export const getPrayerTimesForMonth = async (month, year, forceRefresh = false) => {
  try {
    const settings = await getPrayerSettings();
    const location = await getUserLocation(); // Ensure we have location

    const cacheKey = `${PRAYER_CACHE_KEY}_${year}_${month}_${location.latitude.toFixed(2)}`;

    // 1. Try Cache
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // 2. Try API
    try {
      const data = await fetchAlAdhanMonth(month, year, location, settings.method);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (apiError) {
      console.log('API failed, falling back to local', apiError);
      // 3. Fallback to Local
      const daysInMonth = new Date(year, month, 0).getDate();
      const localData = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const times = calculateLocalTimes(date, location, settings);
        localData.push({
          date: times.date,
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
      return localData;
    }
  } catch (e) {
    if (e.message === 'PERMISSION_DENIED') {
      throw e;
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

  // Note: AlAdhan date format handling might need adjustment depending on exactly what API returns
  // The fetchAlAdhanMonth above attempts to normalize to YYYY-MM-DD.
  // Let's ensure format matches.

  return data.find(d => {
    // Handle potential format differences (DD-MM-YYYY vs YYYY-MM-DD)
    // Our fetchAlAdhanMonth normalizes to YYYY-MM-DD
    return d.date === todayStr;
  }) || null;
};
