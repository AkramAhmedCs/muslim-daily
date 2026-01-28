import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      setIsRTL(newLang === 'ar');

      // Note: Full RTL layout change requires app restart
      // I18nManager.forceRTL only takes effect after restart
      // For now, we handle RTL at component level
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en');
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
