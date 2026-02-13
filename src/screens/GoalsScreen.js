import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { createPlan, getGoalsDashboard } from '../services/GoalsService';
import { useFocusEffect } from '@react-navigation/native';
import { haptics } from '../services/HapticsService';
import { ChecklistItem } from '../components'; // Reuse checklist item for consistency
import DatePicker from '../components/DatePicker';
import { formatDateForStorage, parseStoredDate } from '../utils/dateHelpers';

const GoalsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // 'view' or 'create'

  // Creation State
  const [newPlanType, setNewPlanType] = useState('pages_per_day');
  const [targetValue, setTargetValue] = useState('20');

  // Extra Goals State (Local for now, could be persisted)
  const [extraGoals, setExtraGoals] = useState({
    sunnah: false,
    duha: false,
    witr: false,
    mondayThursday: false
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGoalsDashboard();
      setDashboard(data);
      if (!data) setMode('create');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /* 
   * SAFE HANDLER IMPLEMENTATION
   * Wraps interactions in try-catch to prevent crashes 
   */
  const handleCreate = async () => {
    if (!targetValue) return;
    haptics.success();
    setLoading(true);
    try {
      await createPlan(newPlanType, targetValue);
      await loadData();
      setMode('view');
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  const toggleExtra = async (key) => {
    try {
      // Safe Haptic Call
      haptics.selection?.();

      setExtraGoals(prev => {
        const newState = { ...prev, [key]: !prev[key] };
        return newState;
      });

      // Note: In a real app we would await saving to storage here
    } catch (error) {
      console.error('[Goals] Toggle error for ' + key, error);
      // Fallback toggle even if haptics fail
      setExtraGoals(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const renderCreationMode = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, { color: theme.text }]}>Set a Reading Goal</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Establish a habit by setting a daily target or a completion deadline.
      </Text>

      <View style={[styles.typeContainer, { borderColor: theme.border }]}>
        <Pressable
          style={[styles.typeBtn, newPlanType === 'pages_per_day' && { backgroundColor: theme.primary }]}
          onPress={() => {
            try { haptics.selection?.(); } catch (e) { }
            setNewPlanType('pages_per_day');
            setTargetValue('20'); // Reset to default pages
          }}
        >
          <Text style={[styles.typeText, newPlanType === 'pages_per_day' ? { color: 'white' } : { color: theme.text }]}>
            Daily Pages
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeBtn, newPlanType === 'finish_by_date' && { backgroundColor: theme.primary }]}
          onPress={() => {
            try { haptics.selection?.(); } catch (e) { }
            setNewPlanType('finish_by_date');
            setTargetValue(new Date().toISOString().split('T')[0]); // Reset to today's date
          }}
        >
          <Text style={[styles.typeText, newPlanType === 'finish_by_date' ? { color: 'white' } : { color: theme.text }]}>
            Finish By Date
          </Text>
        </Pressable>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
        {newPlanType === 'pages_per_day' ? (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Pages per Day</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              keyboardType="numeric"
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="20"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Standard: 20 pages = 1 Juz per day.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Target Date</Text>
            <DatePicker
              value={parseStoredDate(targetValue.includes('-') ? targetValue : new Date().toISOString().split('T')[0])}
              onChange={(date) => setTargetValue(formatDateForStorage(date))}
              minimumDate={new Date()}
              label={null} // We already have a label above
              theme={theme}
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              We'll calculate daily pages needed.
            </Text>
          </>
        )}
      </View>

      <Pressable style={[styles.createBtn, { backgroundColor: theme.primary }]} onPress={handleCreate}>
        <Text style={styles.createBtnText}>Start Plan</Text>
      </Pressable>
    </ScrollView>
  );

  const renderDashboard = () => {
    if (!dashboard) return null;

    const { dailyTarget, achievedToday, progressPercent, isOnTrack } = dashboard;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Your Progress</Text>
          <Pressable onPress={() => setMode('create')}>
            <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.ringContainer, { borderColor: theme.border }]}>
          <View style={[styles.ringInner, { borderColor: isOnTrack ? theme.primary : '#FFB74D' }]}>
            <Text style={[styles.percentText, { color: theme.text }]}>{progressPercent}%</Text>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {isOnTrack ? 'On Track' : 'Behind'}
            </Text>
          </View>
        </View>

        <View style={[styles.statsRow, { marginTop: 40, marginBottom: 40 }]}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{achievedToday}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pages Read</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{dailyTarget}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Daily Goal</Text>
          </View>
        </View>

        {/* EXTRA GOALS SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Extra Deeds</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginBottom: 16 }]}>
          Optional sunnahs to boost your day.
        </Text>

        <ChecklistItem
          title="Sunnah Prayers"
          subtitle="Rawatib (12 Rakats)"
          completed={extraGoals.sunnah}
          onToggle={() => toggleExtra('sunnah')}
          icon="star-outline"
        />
        <ChecklistItem
          title="Duha Prayer"
          subtitle="The Forenoon Prayer"
          completed={extraGoals.duha}
          onToggle={() => toggleExtra('duha')}
          icon="sunny-outline"
        />
        <ChecklistItem
          title="Witr Prayer"
          subtitle="Night Prayer"
          completed={extraGoals.witr}
          onToggle={() => toggleExtra('witr')}
          icon="moon-outline"
        />

      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        mode === 'create' ? renderCreationMode() : renderDashboard()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 30 },
  typeContainer: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontWeight: '600' },
  inputContainer: { padding: 20, borderRadius: 16, marginBottom: 24 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 8 },
  hint: { fontSize: 12 },
  createBtn: { padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Dashboard Styles
  ringContainer: { alignSelf: 'center', width: 220, height: 220, borderRadius: 110, borderWidth: 20, justifyContent: 'center', alignItems: 'center', opacity: 0.8 },
  ringInner: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  percentText: { fontSize: 48, fontWeight: 'bold' },
  statusText: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '48%', padding: 20, borderRadius: 16, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 14 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  sectionSubtitle: { fontSize: 14 }
});

export default GoalsScreen;
