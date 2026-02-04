import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { getDueItems, getProgressStats } from '../services'; // New V2 service
import quranData from '../../data/quran_full.json';

const MemorizationScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({ totalItems: 0, dueToday: 0, masteredCount: 0, learningCount: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const now = new Date().toISOString();
      // Stats
      const s = await getProgressStats();
      setStats(s);

      // Queue
      const due = await getDueItems(now, 50);
      setQueue(due);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const startReview = (item, index) => {
    navigation.navigate('MemorizeFlow', {
      item,
      queueLength: queue.length,
      currentIndex: index
    });
  };

  const startBatch = () => {
    if (queue.length > 0) {
      startReview(queue[0], 0);
    }
  };

  /**
   * Safe Surah Name Getter
   */
  const getSurahName = (input) => {
    try {
      // Handle if input is object (legacy/corruption)
      const num = (typeof input === 'object' && input?.number) ? input.number : input;

      // Handle string/number mismatch
      const id = parseInt(num, 10);

      const s = quranData.surahs.find(x => x.number === id);
      return s ? s.englishName : `Surah ${id}`;
    } catch (e) {
      return 'Surah ?';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Hifz Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.dueToday}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Due Today</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.masteredCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mastered</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FFB74D' }]}>{stats.learningCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Learning</Text>
          </Card>
        </View>

        {/* Action Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Review Queue ({queue.length})</Text>
          {queue.length > 0 && (
            <Pressable onPress={startBatch}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Start All</Text>
            </Pressable>
          )}
        </View>

        {/* Queue List */}
        {queue.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, marginTop: 10 }}>All caught up! Add verses from the Quran.</Text>
          </View>
        ) : (
          queue.map((item, index) => (
            <Card
              key={item.id}
              style={styles.queueItem}
              onPress={() => startReview(item, index)}
            >
              <View style={styles.queueInfo}>
                <Text style={[styles.queueTitle, { color: theme.text }]}>
                  {getSurahName(item.surah)} {item.surah}:{item.ayah}
                </Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'mastered' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={{ fontSize: 10, color: item.status === 'mastered' ? '#2E7D32' : '#EF6C00' }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </Card>
          ))
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  content: { padding: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', padding: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  queueItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  queueInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  queueTitle: { fontSize: 16, fontWeight: '500' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 40 }
});

export default MemorizationScreen;
