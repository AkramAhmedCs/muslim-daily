import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePrayerTimes } from '../context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PrayerSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = usePrayerTimes();

  // Temporary local state for immediate feedback before saving
  const [method, setMethod] = useState(settings?.method || 'MWL');
  const [madhab, setMadhab] = useState(settings?.madhab || 'Shafi');

  const methods = [
    { id: 'MWL', name: 'Muslim World League' },
    { id: 'ISNA', name: 'Islamic Society of North America' },
    { id: 'Egypt', name: 'Egyptian General Authority' },
    { id: 'UmmAlQura', name: 'Umm Al-Qura University, Makkah' },
    { id: 'Karachi', name: 'Univ. of Islamic Sciences, Karachi' },
  ];

  const madhabs = [
    { id: 'Shafi', name: 'Standard (Shafi, Maliki, Hanbali)' },
    { id: 'Hanafi', name: 'Hanafi' },
  ];

  const handleSave = () => {
    updateSettings({ ...settings, method, madhab });
    navigation.goBack();
  };

  const handleClearCache = async () => {
    try {
      // Simple cache clear - in real app might be more selective
      const keys = await AsyncStorage.getAllKeys();
      const prayerKeys = keys.filter(k => k.includes('prayer_times_cache'));
      await AsyncStorage.multiRemove(prayerKeys);
      Alert.alert('Success', 'Cache cleared. Times will be re-fetched.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Pressable onPress={handleSave}>
          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CALCULATION METHOD</Text>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          {methods.map((m, i) => (
            <Pressable
              key={m.id}
              style={[styles.option, i < methods.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={() => setMethod(m.id)}
            >
              <Text style={[styles.optionLabel, { color: theme.text }]}>{m.name}</Text>
              {method === m.id && <Ionicons name="checkmark" size={20} color={theme.primary} />}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ASR MADHAB</Text>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          {madhabs.map((m, i) => (
            <Pressable
              key={m.id}
              style={[styles.option, i < madhabs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={() => setMadhab(m.id)}
            >
              <Text style={[styles.optionLabel, { color: theme.text }]}>{m.name}</Text>
              {madhab === m.id && <Ionicons name="checkmark" size={20} color={theme.primary} />}
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 40 }}>
          <Pressable onPress={handleClearCache} style={{ alignItems: 'center' }}>
            <Text style={{ color: 'red' }}>Clear Offline Cache</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 20, marginLeft: 4 },
  section: { borderRadius: 12, overflow: 'hidden' },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  optionLabel: { fontSize: 14 }
});

export default PrayerSettingsScreen;
