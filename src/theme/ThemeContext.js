import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ramadanDarkTheme } from './colors';

const ThemeContext = createContext();

const THEME_KEY = '@muslim_daily_theme';
const THEME_STYLE_KEY = '@muslim_daily_theme_style';

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeStyle, setThemeStyleState] = useState('default'); // 'default' | 'ramadan'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preferences
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const [savedTheme, savedStyle] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(THEME_STYLE_KEY),
      ]);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
      if (savedStyle !== null) {
        setThemeStyleState(savedStyle);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const setThemeStyle = async (style) => {
    try {
      setThemeStyleState(style);
      await AsyncStorage.setItem(THEME_STYLE_KEY, style);
      // Ramadan theme is dark-only, so enable dark mode when switching to it
      if (style === 'ramadan' && !isDarkMode) {
        setIsDarkMode(true);
        await AsyncStorage.setItem(THEME_KEY, 'dark');
      }
    } catch (error) {
      console.log('Error saving theme style:', error);
    }
  };

  // Compute the active theme
  // Ramadan theme is dark-only, so ramadan + light = ramadanDarkTheme (forces dark)
  let theme;
  if (themeStyle === 'ramadan') {
    theme = ramadanDarkTheme;
  } else {
    theme = isDarkMode ? darkTheme : lightTheme;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, themeStyle, setThemeStyle, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
