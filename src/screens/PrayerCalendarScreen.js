import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getPrayerTimesForMonth } from '../services';

const PrayerCalendarScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonth();
  }, []);

  const loadMonth = async () => {
    setLoading(true);
    const now = new Date();
    // Load current month + next month for full 30 days coverage
    // For simplicity, just load current month for now or simple logic
    // Implementation Plan: 30 days rolling.
    // Let's load current month first.

    try {
      const monthData = await getPrayerTimesForMonth(now.getMonth() + 1, now.getFullYear());
      setData(monthData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isToday = item.date === new Date().toISOString().split('T')[0];

    return (
      <View style={[styles.row, { borderBottomColor: theme.border, backgroundColor: isToday ? theme.primary + '10' : 'transparent' }]}>
        <View style={styles.dateCol}>
          <Text style={[styles.dayText, { color: theme.text }]}>
            {new Date(item.date).getDate()}
          </Text>
          <Text style={[styles.monthText, { color: theme.textSecondary }]}>
            {new Date(item.date).toLocaleString('default', { month: 'short' })}
          </Text>
        </View>
        <View style={styles.timesGrid}>
          {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
            <View key={prayer} style={styles.timeCell}>
              <Text style={[styles.timeText, { color: theme.text }]}>{item.times[prayer]}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{prayer.charAt(0)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.surface, borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Monthly Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.date}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 100, // Safe area + nav height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },

  row: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dateCol: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    marginRight: 12
  },
  dayText: { fontSize: 18, fontWeight: 'bold' },
  monthText: { fontSize: 10, textTransform: 'uppercase' },

  timesGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeCell: { alignItems: 'center', width: 44 },
  timeText: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  label: { fontSize: 10 }
});

export default PrayerCalendarScreen;
