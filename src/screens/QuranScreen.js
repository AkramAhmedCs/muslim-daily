import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, BackHandler, ActivityIndicator, PanResponder, I18nManager, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import { Card, ArabicText } from '../components';
import VerseCard from '../components/VerseCard';
import AudioBottomSheet from '../components/AudioBottomSheet';
import {
  startSession,
  endSession,
  addBookmark,
  deleteBookmark,
  isBookmarked as checkIsBookmarked,
  trackPageView,
  getJuzProgress,
  getTodayReadingMinutes,
  getTafsirForAyah,
  addItem,
  getJuzProgressForAyah,
  formatJuzProgress,
  getSettings
} from '../services';
import { triggerHaptic } from '../services/HapticsService';
import { isFeatureEnabled } from '../config/features';

import quranData from '../../data/quran_full.json';
import translationsData from '../../data/quran_translations.json';

const toArabicNumerals = (num) => {
  if (num === undefined || num === null) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).split('').map(d => arabicNumerals[parseInt(d)] || d).join('');
};

const QuranScreen = ({ navigation, route, onSurahChange }) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  // State
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true); // For toggling UI

  // Data State
  const [tafsirData, setTafsirData] = useState(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);

  // Juz Progress State
  const [juzProgress, setJuzProgress] = useState(null);

  // Analytics State
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [sessionMins, setSessionMins] = useState(0);
  const [currentBookmarkId, setCurrentBookmarkId] = useState(null);

  // Audio State
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showAudioSheet, setShowAudioSheet] = useState(false);

  const surahs = quranData.surahs || [];
  const translations = translationsData.translations || {};

  // --- HANDLERS & LOGIC ---

  // Hardware Back Press
  useEffect(() => {
    const onBackPress = () => {
      if (selectedSurah) {
        handleSurahSelect(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedSurah]);

  // Route Params (Deep Link / Resume)
  useEffect(() => {
    if (route.params?.surahNumber && route.params?.ayahNumber) {
      const surah = surahs.find(s => s.number === route.params.surahNumber);
      if (surah) {
        const idx = surah.ayahs.findIndex(a => a.number === route.params.ayahNumber);
        if (idx !== -1) {
          handleSurahSelect(surah, idx);
          navigation.setParams({ surahNumber: null, ayahNumber: null });
        }
      }
    }
  }, [route.params]);

  // Audio Cleanup
  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  // Session Management
  useEffect(() => {
    if (selectedSurah && selectedSurah.ayahs[currentAyahIndex]) {
      const ayah = selectedSurah.ayahs[currentAyahIndex];
      startSession({ surah: selectedSurah.number, ayah: ayah.number, source: 'writer_mode' });
      getTodayReadingMinutes().then(setSessionMins);
      return () => endSession(selectedSurah.number, ayah.number);
    }
  }, [selectedSurah, currentAyahIndex]);

  // Bookmark & Page Check
  useEffect(() => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (ayah) {
      checkIsBookmarked(selectedSurah.number, ayah.number).then(setCurrentBookmarkId);
      if (ayah.page) trackPageView(ayah.page);

      // Reset tafsir when ayah changes
      setTafsirData(null);
    }
  }, [selectedSurah, currentAyahIndex]);

  // Juz Progress Update
  useEffect(() => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (ayah) {
      const progress = getJuzProgressForAyah(selectedSurah.number, ayah.number);
      setJuzProgress(progress);
    }
  }, [selectedSurah, currentAyahIndex]);

  const handleSurahSelect = useCallback((surah, index = 0) => {
    if (selectedSurah && !surah) endSession(); // Close session on exit
    setSelectedSurah(surah);
    setCurrentAyahIndex(index);
    if (onSurahChange) onSurahChange(surah);
  }, [selectedSurah, onSurahChange]);

  const toggleBookmark = async () => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];

    triggerHaptic('selection', 'bookmark');

    if (currentBookmarkId) {
      await deleteBookmark(currentBookmarkId);
      setCurrentBookmarkId(null);
      console.log('[Bookmark] Removed, state set to null');
    } else {
      const newId = await addBookmark({
        surah: selectedSurah.number,
        ayah: ayah.number,
        page: ayah.page,
        label: `${selectedSurah.englishName} : ${ayah.numberInSurah}`
      });
      setCurrentBookmarkId(newId);
      console.log('[Bookmark] Added, state set to:', newId);
    }
  };

  const playAyah = async () => {
    if (isPlaying) {
      await sound.stopAsync();
      setIsPlaying(false);
      return;
    }
    try {
      setIsLoadingAudio(true);
      if (sound) await sound.unloadAsync();

      // Get selected reciter from settings
      const settings = await getSettings();
      const reciter = settings.selectedReciter || 'Alafasy_128kbps';

      const surahNum = String(selectedSurah.number).padStart(3, '0');
      const ayahNum = String(selectedSurah.ayahs[currentAyahIndex].number).padStart(3, '0');
      const url = `https://everyayah.com/data/${reciter}/${surahNum}${ayahNum}.mp3`;

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) setIsPlaying(false);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // State for Toast
  const [toastMessage, setToastMessage] = useState(null);

  // Hifz Handler
  const handleAddToHifz = async () => {
    try {
      const relativeAyah = currentAyahIndex + 1;
      // Add directly to DB
      await addItem(selectedSurah.number, relativeAyah);

      // Show Success Toast
      setToastMessage(`Added Surah ${selectedSurah.englishName} : ${relativeAyah} to Hifz`);
      setTimeout(() => setToastMessage(null), 3000);

    } catch (e) {
      console.error(e);
      setToastMessage("Error adding to Hifz");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const fetchTafsir = async () => {
    if (!isFeatureEnabled('tafsir')) return alert('Feature disabled');
    setLoadingTafsir(true);
    try {
      const relativeAyahNumber = currentAyahIndex + 1;
      // Use calculated relative number for Tafsir calls
      const data = await getTafsirForAyah(selectedSurah.number, relativeAyahNumber);
      setTafsirData(data[0] || { textEn: "No Tafsir available for this ayah." });
    } catch (e) { console.error(e); }
    finally { setLoadingTafsir(false); }
  };

  const navigateAyah = useCallback((dir) => {
    if (!selectedSurah) return;

    triggerHaptic('light', 'nav');

    if (dir === 'next') {
      if (currentAyahIndex < selectedSurah.ayahs.length - 1) {
        setCurrentAyahIndex(p => p + 1);
      } else {
        // Next Surah Check
        if (selectedSurah.number < 114) {
          const nextSurah = surahs.find(s => s.number === selectedSurah.number + 1);
          if (nextSurah) handleSurahSelect(nextSurah, 0);
        }
      }
    } else {
      if (currentAyahIndex > 0) {
        setCurrentAyahIndex(p => p - 1);
      } else {
        // Prev Surah
        const prevSurah = surahs.find(s => s.number === selectedSurah.number - 1);
        if (prevSurah) {
          // Go to last Ayah of previous Surah
          handleSurahSelect(prevSurah, prevSurah.ayahs.length - 1);
        }
      }
    }
  }, [selectedSurah, currentAyahIndex, surahs, handleSurahSelect]);

  // Gestures
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
    onPanResponderRelease: (_, gestureState) => {
      const isRTL = I18nManager.isRTL;
      // Swipe Left (dx < 0) -> Next (in LTR)
      if (gestureState.dx < -50) navigateAyah(isRTL ? 'prev' : 'next');
      // Swipe Right (dx > 0) -> Prev (in LTR)
      else if (gestureState.dx > 50) navigateAyah(isRTL ? 'next' : 'prev');
    },
  }), [navigateAyah]);

  // --- RENDERERS ---

  // --- RENDERERS ---

  const renderHeader = () => {
    // Only used when a surah is selected, otherwise we show list header
    if (!selectedSurah) return null;

    return (
      <View style={[styles.compactHeader, { paddingTop: insets.top, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => handleSurahSelect(null)} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerTitle}>
          <Text style={[styles.headerSurah, { color: theme.text }]}>
            Surah {selectedSurah.number} — {selectedSurah.englishName}
          </Text>
          {juzProgress && (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              {formatJuzProgress(juzProgress, language)}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('Bookmarks')} style={styles.iconBtn}>
            <Ionicons name="list" size={24} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => setShowAudioSheet(true)} style={styles.iconBtn}>
            <Ionicons name="mic-outline" size={22} color={theme.text} />
          </Pressable>
          <Pressable onPress={toggleBookmark} style={styles.iconBtn}>
            <Ionicons name={currentBookmarkId ? "bookmark" : "bookmark-outline"} size={22} color={currentBookmarkId ? theme.primary : theme.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (!selectedSurah) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.compactHeader, { paddingTop: insets.top }]}>
          <Text style={[styles.headerSurah, { color: theme.text, fontSize: 24, marginLeft: 16 }]}>Quran Reader</Text>
          <Pressable onPress={() => navigation.navigate('Bookmarks')} style={styles.iconBtn}>
            <Ionicons name="bookmarks-outline" size={24} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {surahs.map(s => (
            <Pressable key={s.number} onPress={() => handleSurahSelect(s)} style={[styles.surahItem, { borderBottomColor: theme.border }]}>
              <View style={[styles.surahBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{s.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>{s.englishName}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{s.englishNameTranslation}</Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: 'System', fontSize: 18 }}>{s.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const currentAyah = selectedSurah.ayahs[currentAyahIndex];
  // Get translation
  const surahTrans = translations[selectedSurah.number] || [];
  const transText = surahTrans.find(t => t.number === currentAyah.number)?.text || '';

  // Calculate if footer should be relative or absolute based on content?
  // Easier: Just give padding to ScrollView and let it scroll BEHIND the footer if footer is absolute,
  // OR make footer part of the column.
  // User complained about overlap. Let's make footer static at bottom but Ensure Reader scrolls properly.

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}

      {/* Reader Container - Now a View wrapping ScrollView for constraints */}
      <View style={styles.readerContainer} {...panResponder.panHandlers}>
        {/* Using ScrollView to handle long translations/tafsir */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          <Pressable style={{ flex: 1 }} onPress={() => { /* consume taps outside card */ }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <VerseCard
                surah={selectedSurah}
                ayah={currentAyah}
                ayahNumber={currentAyahIndex + 1}
                totalAyahs={selectedSurah.ayahs.length}
                translation={transText}
                onToggleControls={() => { triggerHaptic('light', 'tap'); setShowAudioSheet(prev => !prev); }}
                isPlaying={isPlaying}
                onPlay={playAyah}
                isBookmarked={!!currentBookmarkId}
                onBookmark={toggleBookmark}
                onTafsir={fetchTafsir}
                tafsirData={tafsirData}
                onAddToHifz={handleAddToHifz}
              />
            </View>
          </Pressable>
        </ScrollView>
      </View>

      {/* Navigation Footer (if not using swipe only) */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={() => navigateAyah('prev')} disabled={currentAyahIndex === 0 && selectedSurah.number === 1}>
          <Ionicons name="chevron-back" size={32} color={currentAyahIndex === 0 && selectedSurah.number === 1 ? theme.textSecondary + '40' : theme.primary} />
        </Pressable>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Swipe or Tap to Navigate</Text>
        <Pressable onPress={() => navigateAyah('next')} disabled={selectedSurah.number === 114 && currentAyahIndex === selectedSurah.ayahs.length - 1}>
          <Ionicons name="chevron-forward" size={32} color={selectedSurah.number === 114 && currentAyahIndex === selectedSurah.ayahs.length - 1 ? theme.textSecondary + '40' : theme.primary} />
        </Pressable>
      </View>

      <AudioBottomSheet
        visible={showAudioSheet}
        onClose={() => setShowAudioSheet(false)}
        isPlaying={isPlaying}
        onPlayPause={playAyah}
        onStop={() => { if (sound) sound.stopAsync(); setIsPlaying(false); }}
        onAnalyticsPress={() => setShowStatsModal(true)}
        onRelatedPress={() => alert('Related Hadith/Adhkar coming soon')}
      />

      {/* Analytics Modal (Legacy for now) */}
      <Modal visible={showStatsModal} transparent animationType="fade" onRequestClose={() => setShowStatsModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowStatsModal(false)}>
          <View style={{ backgroundColor: theme.surface, padding: 24, borderRadius: 16, width: '80%' }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Reading Analytics</Text>
            <Text style={{ color: theme.text, fontSize: 16 }}>Minutes Today: {sessionMins}</Text>
          </View>
        </Pressable>
      </Modal>

      {/* Toast Notification */}
      {
        toastMessage && (
          <View style={styles.toastContainer}>
            <View style={[styles.toast, { backgroundColor: theme.surface }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              <Text style={[styles.toastText, { color: theme.text }]}>{toastMessage}</Text>
            </View>
          </View>
        )
      }

    </View >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  headerTitle: { alignItems: 'center' },
  headerSurah: { fontSize: 16, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },

  readerContainer: { flex: 1, justifyContent: 'center' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  listHeader: { padding: 20 },
  listTitle: { fontSize: 24, fontWeight: 'bold' },
  surahItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  surahBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },

  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    gap: 10
  },
  toastText: {
    fontWeight: '600',
    fontSize: 14
  }
});

export default QuranScreen;
