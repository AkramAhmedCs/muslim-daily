import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable, Alert, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import { Card } from '../components';
import { getSettings, updateSettings, resetAllData } from '../services';
import { sendTestNotification, scheduleAllReminders } from './../../src/services/notifications';
import { RECITERS, DEFAULT_RECITER, getReciterById } from '../constants/reciters';

const SettingsScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { language, toggleLanguage, bilingualMode, toggleBilingualMode, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({});
  const [testingNotification, setTestingNotification] = useState(false);
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(DEFAULT_RECITER);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const data = await getSettings();
    setSettings(data);
    // Load selected reciter from settings
    if (data.selectedReciter) {
      setSelectedReciter(data.selectedReciter);
    }
  };

  const handleReciterChange = async (reciterId) => {
    setSelectedReciter(reciterId);
    await updateSettings({ selectedReciter: reciterId });
    setShowReciterPicker(false);
  };

  const handleToggle = async (key) => {
    const updated = await updateSettings({ [key]: !settings[key] });
    if (updated) {
      setSettings(updated);
      // Reschedule reminders when settings change
      await scheduleAllReminders();
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    try {
      const result = await sendTestNotification();
      if (result) {
        Alert.alert('Success', 'Test notification sent! Check your notification tray.');
      } else {
        Alert.alert('Error', 'Could not send notification. Please check app permissions.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
    setTestingNotification(false);
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will clear your checklist progress, streak, and all settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const success = await resetAllData();
            if (success) {
              await loadSettings();
              Alert.alert('Done', 'All data has been reset. Your checklist now has all 8 tasks.');
            } else {
              Alert.alert('Error', 'Failed to reset data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const SettingRow = ({ icon, title, subtitle, value, onToggle }) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Switch
        value={value === true || value === 'true'}
        onValueChange={onToggle}
        trackColor={{ true: theme.primary, false: theme.border }}
      />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 80 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
      </View>

      {/* Language Section */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('language')}</Text>
        <Pressable
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={toggleLanguage}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="globe-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              {language === 'ar' ? 'العربية' : 'English'}
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              Tap to switch / اضغط للتغيير
            </Text>
          </View>
          <View style={[styles.langBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.langBadgeText}>{language.toUpperCase()}</Text>
          </View>
        </Pressable>
        <SettingRow
          icon="book-outline"
          title={t('bilingualMode')}
          subtitle={t('bilingualDesc')}
          value={bilingualMode}
          onToggle={toggleBilingualMode}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Appearance</Text>
        <SettingRow icon="moon-outline" title={t('darkMode')} value={isDarkMode} onToggle={toggleTheme} />
      </Card>

      {/* Quran Audio Section */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Quran Audio</Text>
        <Pressable
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => setShowReciterPicker(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="mic-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Reciter</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {getReciterById(selectedReciter).name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Reminders</Text>
        <SettingRow icon="sunny-outline" title="Morning Adhkar" subtitle="After Fajr" value={settings.morningReminderEnabled} onToggle={() => handleToggle('morningReminderEnabled')} />
        <SettingRow icon="moon-outline" title="Evening Adhkar" subtitle="After Maghrib" value={settings.eveningReminderEnabled} onToggle={() => handleToggle('eveningReminderEnabled')} />
        <SettingRow icon="book-outline" title="Quran Reading" subtitle="Daily Wird reminder" value={settings.quranReminderEnabled} onToggle={() => handleToggle('quranReminderEnabled')} />

        <Pressable
          style={[styles.testButton, { backgroundColor: theme.primary + '15' }]}
          onPress={handleTestNotification}
          disabled={testingNotification}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.primary} />
          <Text style={[styles.testButtonText, { color: theme.primary }]}>
            {testingNotification ? 'Sending...' : 'Test Notification'}
          </Text>
        </Pressable>
      </Card>



      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data Management</Text>
        <Pressable
          style={[styles.resetButton, { backgroundColor: '#FF3B30' + '15' }]}
          onPress={handleResetData}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={[styles.resetButtonText, { color: '#FF3B30' }]}>
            Reset All Data
          </Text>
        </Pressable>
        <Text style={[styles.resetHint, { color: theme.textSecondary }]}>
          Use this if your checklist shows incorrect task count
        </Text>


      </Card>

      <View style={styles.about}>
        <Text style={[styles.appName, { color: theme.text }]}>Muslim Daily</Text>
        <Text style={[styles.version, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        <Text style={[styles.sources, { color: theme.textSecondary }]}>
          Sources: Hisn al-Muslim, Sahih al-Bukhari, Sahih Muslim, Riyad as-Salihin, Tanzil.net (Quran)
        </Text>
      </View>

      {/* Reciter Picker Modal */}
      <Modal
        visible={showReciterPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReciterPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowReciterPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Reciter</Text>
              <TouchableOpacity onPress={() => setShowReciterPicker(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={RECITERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.reciterItem,
                    { borderBottomColor: theme.border },
                    selectedReciter === item.id && { backgroundColor: theme.primary + '15' }
                  ]}
                  onPress={() => handleReciterChange(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reciterName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.reciterNameAr, { color: theme.textSecondary }]}>{item.nameAr}</Text>
                  </View>
                  {selectedReciter === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  section: { marginHorizontal: 20, marginBottom: 20, padding: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '600', padding: 16, paddingBottom: 8, textTransform: 'uppercase' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 16 },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    margin: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  about: { alignItems: 'center', padding: 40 },
  appName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  version: { fontSize: 14, marginBottom: 12 },
  sources: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  langBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  langBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Modal styles for reciter picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  reciterName: {
    fontSize: 16,
    fontWeight: '500',
  },
  reciterNameAr: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default SettingsScreen;
