import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useLanguage } from '../context'; // Assuming this exists
import { usePrayerTimes } from '../context';
import { Card, ArabicText } from '../components';

const PrayerTimesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { todayTimes, loading, error, locationName, refreshTimes } = usePrayerTimes();

  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Calculate countdown
  useEffect(() => {
    if (!todayTimes || !todayTimes.times) return;

    const calculateNextPrayer = () => {
      const now = new Date();
      const times = todayTimes.times;
      const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      let found = null;

      for (let name of prayerOrder) {
        const [hours, minutes] = times[name].split(':');
        const prayerTime = new Date(now);
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);

        if (prayerTime > now) {
          found = { name, time: prayerTime };
          break;
        }
      }

      // If no prayer found today, next is Fajr tomorrow
      if (!found) {
        const [hours, minutes] = times['Fajr'].split(':'); // Using today's Fajr for tomorrow approx
        const prayerTime = new Date(now);
        prayerTime.setDate(prayerTime.getDate() + 1);
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);
        found = { name: 'Fajr', time: prayerTime };
      }

      setNextPrayer(found);

      // Update countdown string
      const diff = found.time - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${h}h ${m}m ${s}s`);
    };

    const interval = setInterval(calculateNextPrayer, 1000);
    calculateNextPrayer(); // Immediate run

    return () => clearInterval(interval);
  }, [todayTimes]);

  const renderPrayerRow = (name, time, isNext) => (
    <View style={[
      styles.prayerRow,
      isNext && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1 }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons
          name={name === 'Fajr' || name === 'Dhuhr' || name === 'Asr' ? 'sunny-outline' : 'moon-outline'}
          size={20}
          color={isNext ? theme.primary : theme.textSecondary}
          style={{ marginRight: 12 }}
        />
        <Text style={[styles.prayerName, { color: isNext ? theme.primary : theme.text }]}>{name}</Text>
      </View>
      <Text style={[styles.prayerTime, { color: isNext ? theme.primary : theme.text, fontWeight: isNext ? 'bold' : 'normal' }]}>
        {time}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Prayer Times</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location-sharp" size={14} color={theme.primary} />
            <Text style={[styles.subtitle, { color: theme.textSecondary, marginLeft: 4 }]}>
              {locationName}
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.iconButton, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('PrayerSettings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshTimes} />}
      >
        {/* Main Card */}
        <Card style={[styles.mainCard, { backgroundColor: theme.primary }]}>
          {error ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Ionicons name="alert-circle" size={40} color="white" />
              <Text style={{ color: 'white', marginTop: 10 }}>{error}</Text>
            </View>
          ) : nextPrayer ? (
            <>
              <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
              <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
              <Text style={styles.countdown}>{timeRemaining}</Text>
              <Text style={styles.date}>{new Date().toDateString()}</Text>
            </>
          ) : (
            <ActivityIndicator color="white" />
          )}
        </Card>

        {/* Today's Times List */}
        <View style={styles.listContainer}>
          {todayTimes && Object.entries(todayTimes.times).map(([name, time]) => (
            <React.Fragment key={name}>
              {renderPrayerRow(name, time, nextPrayer?.name === name)}
            </React.Fragment>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('PrayerCalendar')}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>30-Day Calendar</Text>
          </Pressable>
        </View>

        {todayTimes && (
          <Text style={[styles.sourceText, { color: theme.textSecondary }]}>
            Source: {todayTimes.source} • Method: {todayTimes.method}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'
  },
  content: { padding: 20 },
  mainCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 0, // Override default card border
  },
  nextPrayerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  nextPrayerName: { color: 'white', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  countdown: { color: 'white', fontSize: 18, fontFamily: 'System' }, // Monospaced if possible
  date: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 16 },

  listContainer: { marginBottom: 20 },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    // backgroundColor: 'transparent' // or surface
  },
  prayerName: { fontSize: 16, fontWeight: '600' },
  prayerTime: { fontSize: 16, fontFamily: 'System' },

  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8
  },
  actionText: { fontWeight: '600' },

  sourceText: { textAlign: 'center', fontSize: 10, marginTop: 0 }
});

export default PrayerTimesScreen;
