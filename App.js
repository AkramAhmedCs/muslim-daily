import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { LanguageProvider, PrayerProvider } from './src/context';
import { AppNavigator } from './src/navigation';
import { runDataMigration } from './src/services/storage';
import { registerGreetingTask } from './src/services/backgroundTask';

const AppContent = () => {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  // Run data migration on app start to fix corrupted storage
  useEffect(() => {
    runDataMigration();
    registerGreetingTask(); // Register background task
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <PrayerProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </PrayerProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
