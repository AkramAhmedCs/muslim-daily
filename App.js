import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { LanguageProvider, PrayerProvider } from './src/context';
import { AppNavigator } from './src/navigation';
import {
  getSettings,
  initDatabase,
  migrateLegacyData,
  runDataMigration
} from './src/services';
import { registerGreetingTask } from './src/services/backgroundTask';
import { useGreeting } from './src/hooks/useGreeting';

// Move useGreeting inside a child component that is wrapped by providers
const AppContent = () => {
  const { isDarkMode } = useTheme();
  // Safe to use hooks here as it's wrapped in Providers
  const { refreshGreeting } = useGreeting();

  useEffect(() => {
    // Initial greeting refresh when app content mounts (and providers are ready)
    refreshGreeting();
    registerGreetingTask();
  }, []);

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase(); // Init SQLite Tables
        await migrateLegacyData(); // Migrate legacy page reads
        await runDataMigration(); // General migration
        await getSettings(); // Pre-load settings
        // Note: We don't call refreshGreeting here anymore, it's handled in AppContent
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

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
