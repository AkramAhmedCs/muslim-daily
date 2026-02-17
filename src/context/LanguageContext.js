import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const LanguageContext = createContext();

const LANGUAGE_KEY = '@app_language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // 'en' | 'ar'
  const [isRTL, setIsRTL] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved) {
        const savedLang = saved;
        setLanguage(savedLang);
        setIsRTL(savedLang === 'ar');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLang) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
      setLanguage(newLang);
      const shouldBeRTL = newLang === 'ar';
      setIsRTL(shouldBeRTL);

      // Apply RTL layout — requires app reload to take effect
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        I18nManager.allowRTL(shouldBeRTL);
        // Prompt user to reload for RTL to take effect
        Alert.alert(
          shouldBeRTL ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
          shouldBeRTL
            ? 'يرجى إعادة تشغيل التطبيق لتطبيق اتجاه الكتابة من اليمين لليسار.'
            : 'Please restart the app to apply the layout direction change.',
          [
            { text: shouldBeRTL ? 'لاحقاً' : 'Later', style: 'cancel' },
            {
              text: shouldBeRTL ? 'إعادة التشغيل' : 'Restart Now',
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (e) {
                  // Fallback if Updates not available (dev mode)
                  console.warn('Updates.reloadAsync failed, manual restart needed:', e);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en');
  };

  // Bilingual Mode
  const [bilingualMode, setBilingualMode] = useState(false);
  const BILINGUAL_KEY = '@app_bilingual';

  useEffect(() => {
    loadBilingual();
  }, []);

  const loadBilingual = async () => {
    try {
      const saved = await AsyncStorage.getItem(BILINGUAL_KEY);
      if (saved !== null) {
        setBilingualMode(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading bilingual:', e);
    }
  };

  const toggleBilingualMode = async () => {
    try {
      const newValue = !bilingualMode;
      setBilingualMode(newValue);
      await AsyncStorage.setItem(BILINGUAL_KEY, JSON.stringify(newValue));
    } catch (e) {
      console.error('Error saving bilingual:', e);
    }
  };

  // Translation strings - complete Arabic localization
  const t = (key) => {
    const translations = {
      // Navigation tabs
      home: language === 'ar' ? 'الرئيسية' : 'Home',
      adhkar: language === 'ar' ? 'الأذكار' : 'Adhkar',
      hadith: language === 'ar' ? 'الحديث' : 'Hadith',
      dua: language === 'ar' ? 'الدعاء' : 'Dua',
      quran: language === 'ar' ? 'القرآن' : 'Quran',
      settings: language === 'ar' ? 'الإعدادات' : 'Settings',

      // Common actions
      back: language === 'ar' ? 'رجوع' : 'Back',
      next: language === 'ar' ? 'التالي' : 'Next',
      prev: language === 'ar' ? 'السابق' : 'Prev',
      done: language === 'ar' ? 'تم' : 'Done',
      close: language === 'ar' ? 'إغلاق' : 'Close',

      // Settings
      language: language === 'ar' ? 'اللغة' : 'Language',
      arabic: language === 'ar' ? 'العربية' : 'Arabic',
      english: language === 'ar' ? 'الإنجليزية' : 'English',
      bilingualMode: language === 'ar' ? 'الوضع المزدوج' : 'Bilingual Mode',
      bilingualDesc: language === 'ar' ? 'عرض العربية والإنجليزية معاً' : 'Show both Arabic and English',
      darkMode: language === 'ar' ? 'الوضع الداكن' : 'Dark Mode',
      appearance: language === 'ar' ? 'المظهر' : 'Appearance',
      reminders: language === 'ar' ? 'التذكيرات' : 'Reminders',
      display: language === 'ar' ? 'العرض' : 'Display',

      // Greetings
      goodMorning: language === 'ar' ? 'صباح الخير' : 'Good Morning',
      goodAfternoon: language === 'ar' ? 'مساء الخير' : 'Good Afternoon',
      goodEvening: language === 'ar' ? 'مساء النور' : 'Good Evening',

      // Quran
      surah: language === 'ar' ? 'سورة' : 'Surah',
      ayah: language === 'ar' ? 'آية' : 'Verse',
      ayahs: language === 'ar' ? 'آيات' : 'Verses',
      surahs: language === 'ar' ? 'سور' : 'Surahs',
      meccan: language === 'ar' ? 'مكية' : 'Meccan',
      medinan: language === 'ar' ? 'مدنية' : 'Medinan',
      audioComingSoon: language === 'ar' ? 'الصوت قريباً' : 'Audio coming soon',
      quranAnalytics: language === 'ar' ? 'إحصائيات القرآن' : 'Quran Analytics',
      minsToday: language === 'ar' ? 'دقائق اليوم' : 'Mins Today',
      pagesToday: language === 'ar' ? 'صفحات اليوم' : 'Pages Today',
      totalMins: language === 'ar' ? 'إجمالي الدقائق' : 'Total Mins',
      totalPages: language === 'ar' ? 'إجمالي الصفحات' : 'Total Pages',

      // Reminder settings
      morningAdhkar: language === 'ar' ? 'أذكار الصباح' : 'Morning Adhkar',
      eveningAdhkar: language === 'ar' ? 'أذكار المساء' : 'Evening Adhkar',
      quranReading: language === 'ar' ? 'قراءة القرآن' : 'Quran Reading',
      afterFajr: language === 'ar' ? 'بعد الفجر' : 'After Fajr',
      afterMaghrib: language === 'ar' ? 'بعد المغرب' : 'After Maghrib',
      dailyWird: language === 'ar' ? 'الورد اليومي' : 'Daily Wird',
      testNotification: language === 'ar' ? 'تجربة الإشعار' : 'Test Notification',

      // About
      about: language === 'ar' ? 'حول' : 'About',
      version: language === 'ar' ? 'الإصدار' : 'Version',
      sources: language === 'ar' ? 'المصادر' : 'Sources',

      // Home Screen
      dailyChecklist: language === 'ar' ? 'قائمة المهام اليومية' : 'Daily Checklist',
      quickAccess: language === 'ar' ? 'وصول سريع' : 'Quick Access',
      tasksCompleted: language === 'ar' ? 'مهام مكتملة' : 'tasks completed',
      dayStreak: language === 'ar' ? 'يوم متتالي' : 'day streak',
      best: language === 'ar' ? 'أفضل' : 'Best',
      search: language === 'ar' ? 'بحث' : 'Search',
      prayerTimes: language === 'ar' ? 'أوقات الصلاة' : 'Prayer Times',
      bookmarks: language === 'ar' ? 'الإشارات المرجعية' : 'Bookmarks',
      hifz: language === 'ar' ? 'الحفظ' : 'Hifz',
      goals: language === 'ar' ? 'الأهداف' : 'Goals',
      qibla: language === 'ar' ? 'القبلة' : 'Qibla',
      featured: language === 'ar' ? 'مميز' : 'Featured',
      readNow: language === 'ar' ? 'اقرأ الآن' : 'Read Now',
      viewAll: language === 'ar' ? 'عرض الكل' : 'View All',

      // Ramadan Challenge
      ramadanChallenge: language === 'ar' ? 'تحدي رمضان' : 'Ramadan Challenge',
      juzsCompleted: language === 'ar' ? 'أجزاء مكتملة' : 'Juzs completed',
      completeQuranIn30Days: language === 'ar' ? 'ختم القرآن في 30 يوم' : 'Complete Quran in 30 days',
      juzsDone: language === 'ar' ? 'أجزاء تمت' : 'Juzs done',
      remaining: language === 'ar' ? 'متبقي' : 'remaining',
      resetChallenge: language === 'ar' ? 'إعادة التحدي' : 'Reset Challenge',

      // Qibla Finder
      qiblaFinder: language === 'ar' ? 'اتجاه القبلة' : 'Qibla Finder',
      qiblaDirection: language === 'ar' ? 'اتجاه القبلة' : 'Qibla Direction',
      distanceToMecca: language === 'ar' ? 'المسافة إلى مكة' : 'Distance to Mecca',
      locationRequired: language === 'ar' ? 'يلزم الوصول للموقع' : 'Location Access Required',
      openSettings: language === 'ar' ? 'فتح الإعدادات' : 'Open Settings',
      findingLocation: language === 'ar' ? 'جاري تحديد موقعك...' : 'Finding your location...',
      compassNotAvailable: language === 'ar' ? 'البوصلة غير متوفرة' : 'Compass not available',

      // Bookmarks
      noBookmarks: language === 'ar' ? 'لا توجد إشارات مرجعية' : 'No Bookmarks',
      addBookmarks: language === 'ar' ? 'أضف إشارات مرجعية أثناء القراءة' : 'Add bookmarks while reading',
      removeBookmark: language === 'ar' ? 'حذف الإشارة المرجعية' : 'Remove Bookmark',

      // Goals
      readingGoals: language === 'ar' ? 'أهداف القراءة' : 'Reading Goals',
      dailyPages: language === 'ar' ? 'صفحات يومية' : 'Daily Pages',
      finishByDate: language === 'ar' ? 'الانتهاء بتاريخ' : 'Finish By Date',
      noGoals: language === 'ar' ? 'لا توجد أهداف' : 'No Goals',
      addGoal: language === 'ar' ? 'أضف هدفاً' : 'Add Goal',

      // Memorization
      hifzJourney: language === 'ar' ? 'رحلة الحفظ' : 'Hifz Journey',
      memorized: language === 'ar' ? 'محفوظ' : 'Memorized',
      review: language === 'ar' ? 'مراجعة' : 'Review',
      startMemorizing: language === 'ar' ? 'ابدأ الحفظ' : 'Start Memorizing',

      // Data Management
      dataManagement: language === 'ar' ? 'إدارة البيانات' : 'Data Management',
      resetAllData: language === 'ar' ? 'حذف جميع البيانات' : 'Reset All Data',
      betaRecovery: language === 'ar' ? 'استعادة البيتا' : 'Beta Recovery',
      setStreakManually: language === 'ar' ? 'ضبط التتابع يدوياً' : 'Set Streak Manually',
      quranAudio: language === 'ar' ? 'صوت القرآن' : 'Quran Audio',
      reciter: language === 'ar' ? 'القارئ' : 'Reciter',
      prayer: language === 'ar' ? 'الصلاة' : 'Prayer',
    };

    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isRTL,
        changeLanguage,
        toggleLanguage,
        bilingualMode,
        toggleBilingualMode,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
