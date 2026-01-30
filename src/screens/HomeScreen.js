import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useGreeting } from '../hooks/useGreeting';
import { Card, ChecklistItem } from '../components';
import { getChecklist, updateChecklist, getStreak } from '../services';
import adhkarData from '../../data/adhkar.json';

const HomeScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { greeting } = useGreeting();
  const insets = useSafeAreaInsets();
  const [checklist, setChecklist] = useState({});
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Determine if it's morning or evening (for content filtering)
  const hour = currentTime.getHours();
  // We keep this local logic for content filtering or align it with greeting?
  // Let's use the greeting text to derive mode if needed, or keep time based logic for simplicity of content.
  // Actually, let's keep the hour logic for content filtering as it matches the standard "Morning Adhkar" times
  // independent of the greeting (greeting is social/polite, content is time-specific).
  const isMorning = hour >= 4 && hour < 12;
  const isEvening = hour >= 15 && hour < 22;

  const loadData = async () => {
    const checklistData = await getChecklist();
    const streakData = await getStreak();
    setChecklist(checklistData);
    setStreak(streakData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      setCurrentTime(new Date());
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggle = async (key) => {
    const newValue = !checklist[key];
    const updated = await updateChecklist(key, newValue);
    if (updated) {
      setChecklist(updated);
      // Refresh streak in case this completion updated it
      const updatedStreak = await getStreak();
      setStreak(updatedStreak);
    }
  };

  // Get featured adhkar based on time
  const getFeaturedAdhkar = () => {
    if (isMorning) {
      return adhkarData.categories.find(c => c.id === 'morning');
    } else if (isEvening) {
      return adhkarData.categories.find(c => c.id === 'evening');
    }
    return adhkarData.categories.find(c => c.id === 'afterPrayer');
  };

  const featuredAdhkar = getFeaturedAdhkar();



  // Calculate completion percentage
  const completedItems = Object.values(checklist).filter(Boolean).length;
  const totalItems = Object.keys(checklist).length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;



  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={true}
        hidden={false}
        networkActivityIndicatorVisible={false}
      /> */}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={false}
        overScrollMode="never"
        bounces={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            {greeting}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>
            Muslim Daily
          </Text>
        </View>

        {/* Streak & Progress Container */}
        <View style={styles.statsContainer}>
          {/* Daily Progress Card */}
          <Card style={[styles.progressCard, { flex: 1, marginRight: 8 }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Daily Goal</Text>
              <Text style={[styles.progressPercent, { color: theme.primary }]}>
                {completionPercentage}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${completionPercentage}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressSubtext, { color: theme.textSecondary }]}>
              {completedItems}/{totalItems} tasks
            </Text>
          </Card>

          {/* Streak Card */}
          <Card style={[styles.streakCard, { width: '40%' }]}>
            <View style={styles.streakHeader}>
              <Ionicons name="flame" size={24} color="#FF6D00" />
              <Text style={[styles.streakCount, { color: theme.text }]}>{streak.current}</Text>
            </View>
            <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Day Streak</Text>
            <Text style={[styles.bestStreak, { color: theme.textSecondary }]}>Best: {streak.best}</Text>
          </Card>
        </View>

        {/* Featured Adhkar */}
        {featuredAdhkar && (
          <Card
            style={styles.featuredCard}
            onPress={() => navigation.navigate('AdhkarDetail', {
              category: featuredAdhkar
            })}
          >
            <View style={styles.featuredHeader}>
              <View style={[styles.featuredIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="sunny-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.featuredText}>
                <Text style={[styles.featuredLabel, { color: theme.textSecondary }]}>
                  {isMorning ? 'Morning' : isEvening ? 'Evening' : 'After Prayer'}
                </Text>
                <Text style={[styles.featuredTitle, { color: theme.text }]}>
                  {featuredAdhkar.nameAr}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
            </View>
            <Text style={[styles.featuredDesc, { color: theme.textSecondary }]}>
              {featuredAdhkar.description}
            </Text>
          </Card>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Quick Access
        </Text>
        <View style={styles.quickActions} collapsable={false} renderToHardwareTextureAndroid={false}>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: theme.background === '#FFFFFF' ? '#FFFFFF' : (theme.background || '#FFFFFF'),
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border || '#E0E0E0',
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={() => navigation.navigate('Adhkar')}
          >
            <Ionicons name="book-outline" size={28} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Adhkar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: theme.background === '#FFFFFF' ? '#FFFFFF' : (theme.background || '#FFFFFF'),
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border || '#E0E0E0',
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={() => navigation.navigate('Hadith')}
          >
            <Ionicons name="library-outline" size={28} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Hadith</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: theme.background === '#FFFFFF' ? '#FFFFFF' : (theme.background || '#FFFFFF'),
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border || '#E0E0E0',
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={() => navigation.navigate('Dua')}
          >
            <Ionicons name="hand-left-outline" size={28} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Du'a</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: theme.background === '#FFFFFF' ? '#FFFFFF' : (theme.background || '#FFFFFF'),
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border || '#E0E0E0',
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={() => navigation.navigate('Quran')}
          >
            <Ionicons name="reader-outline" size={28} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Quran</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: theme.background === '#FFFFFF' ? '#FFFFFF' : (theme.background || '#FFFFFF'),
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border || '#E0E0E0',
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={() => navigation.navigate('Memorization')}
          >
            <Ionicons name="school-outline" size={28} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Hifz</Text>
          </Pressable>
        </View>

        {/* Daily Checklist */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Daily Checklist
        </Text>

        <ChecklistItem
          title="Fajr Prayer"
          subtitle="صلاة الفجر"
          completed={checklist.fajr}
          onToggle={() => handleToggle('fajr')}
          icon="moon-outline"
        />
        <ChecklistItem
          title="Morning Adhkar"
          subtitle="أذكار الصباح"
          completed={checklist.morningAdhkar}
          onToggle={() => handleToggle('morningAdhkar')}
          icon="sunny-outline"
        />
        <ChecklistItem
          title="Dhuhr Prayer"
          subtitle="صلاة الظهر"
          completed={checklist.dhuhr}
          onToggle={() => handleToggle('dhuhr')}
          icon="sunny"
        />
        <ChecklistItem
          title="Asr Prayer"
          subtitle="صلاة العصر"
          completed={checklist.asr}
          onToggle={() => handleToggle('asr')}
          icon="sunny-outline"
        />
        <ChecklistItem
          title="Evening Adhkar"
          subtitle="أذكار المساء"
          completed={checklist.eveningAdhkar}
          onToggle={() => handleToggle('eveningAdhkar')}
          icon="moon-outline"
        />
        <ChecklistItem
          title="Maghrib Prayer"
          subtitle="صلاة المغرب"
          completed={checklist.maghrib}
          onToggle={() => handleToggle('maghrib')}
          icon="moon"
        />
        <ChecklistItem
          title="Isha Prayer"
          subtitle="صلاة العشاء"
          completed={checklist.isha}
          onToggle={() => handleToggle('isha')}
          icon="moon"
        />
        <ChecklistItem
          title="Quran Reading"
          subtitle="Daily Wird"
          completed={checklist.quranRead}
          onToggle={() => handleToggle('quranRead')}
          icon="book-outline"
        />

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  progressCard: {
    padding: 16,
  },
  streakCard: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  streakLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  bestStreak: {
    fontSize: 10,
  },
  featuredCard: {
    marginBottom: 24,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featuredText: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  featuredDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  spacer: {
    height: 40,
  },
});

export default HomeScreen;
