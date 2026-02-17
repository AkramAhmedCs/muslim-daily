/**
 * RamadanChallengeScreen.js
 *
 * Separate Quran reader for the Ramadan Challenge (30 Juzs in 30 days).
 * Reuses VerseCard component but has its own progress tracking.
 * Auto-saves position on every verse change and app state change.
 *
 * Interactive features (haptics, audio, bookmark, tafsir, hifz, controls)
 * are copied directly from QuranScreen.js to ensure identical behaviour.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  Alert,
  ScrollView,
  PanResponder,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import VerseCard from '../components/VerseCard';
import AudioBottomSheet from '../components/AudioBottomSheet';
import {
  loadChallengeProgress,
  saveChallengeProgress,
  resetChallenge,
} from '../services/RamadanChallengeService';
import {
  addBookmark,
  deleteBookmark,
  isBookmarked as checkIsBookmarked,
  getTafsirForAyah,
  addItem,
  getJuzProgressForAyah,
  formatJuzProgress,
  getSettings,
} from '../services';
import { triggerHaptic } from '../services/HapticsService';
import { isFeatureEnabled } from '../config/features';
import { getReciterById } from '../constants/reciters';

import quranData from '../../data/quran_full.json';
import translationsData from '../../data/quran_translations.json';

const surahs = quranData.surahs || [];
const translations = translationsData.translations || {};

const RamadanChallengeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();

  // Challenge state
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [juzProgress, setJuzProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bookmark State (copied from QuranScreen)
  const [currentBookmarkId, setCurrentBookmarkId] = useState(null);

  // Audio State (copied from QuranScreen)
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showAudioSheet, setShowAudioSheet] = useState(false);
  const [reciterName, setReciterName] = useState('Mishary Al-Afasy');

  // Tafsir State (copied from QuranScreen)
  const [tafsirData, setTafsirData] = useState(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);

  // Toast State (copied from QuranScreen)
  const [toastMessage, setToastMessage] = useState(null);

  // ==========================================
  // LOAD PROGRESS ON SCREEN ENTER
  // ==========================================
  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          setLoading(true);
          const progress = await loadChallengeProgress();

          const surahNum = progress.currentSurah || 1;
          const ayahNum = progress.currentAyah || 1;

          const surah = surahs.find(s => s.number === surahNum);
          if (surah) {
            setSelectedSurah(surah);
            const idx = surah.ayahs.findIndex(a => a.number === ayahNum);
            setCurrentAyahIndex(idx !== -1 ? idx : 0);
          } else {
            setSelectedSurah(surahs[0]);
            setCurrentAyahIndex(0);
          }
        } catch (error) {
          console.error('[Challenge] Error loading progress:', error);
          setSelectedSurah(surahs[0]);
          setCurrentAyahIndex(0);
        } finally {
          setLoading(false);
        }
      };

      loadProgress();
    }, [])
  );

  // ==========================================
  // AUDIO CLEANUP ON UNMOUNT (from QuranScreen)
  // ==========================================
  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  // Stop audio when leaving screen (back button, tab switch)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (sound) sound.stopAsync();
      setIsPlaying(false);
      setIsLoadingAudio(false);
    });
    return unsubscribe;
  }, [navigation, sound]);

  // ==========================================
  // AUTO-SAVE ON APP BACKGROUND
  // ==========================================
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Stop audio when app goes to background
        if (isPlaying && sound) {
          sound.stopAsync();
          setIsPlaying(false);
        }
        if (selectedSurah) {
          const ayah = selectedSurah.ayahs[currentAyahIndex];
          if (ayah) {
            saveChallengeProgress(selectedSurah.number, ayah.number);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [selectedSurah, currentAyahIndex, isPlaying, sound]);

  // ==========================================
  // AUTO-SAVE ON VERSE CHANGE + UPDATE JUZ PROGRESS
  // ==========================================
  useEffect(() => {
    if (!loading && selectedSurah) {
      const ayah = selectedSurah.ayahs[currentAyahIndex];
      if (ayah) {
        saveChallengeProgress(selectedSurah.number, ayah.number);
        const progress = getJuzProgressForAyah(selectedSurah.number, ayah.number);
        setJuzProgress(progress);
      }
    }
  }, [selectedSurah, currentAyahIndex, loading]);

  // ==========================================
  // BOOKMARK CHECK ON VERSE CHANGE (from QuranScreen)
  // ==========================================
  useEffect(() => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (ayah) {
      checkIsBookmarked(selectedSurah.number, ayah.number).then(setCurrentBookmarkId);
      // Reset tafsir when ayah changes
      setTafsirData(null);
    }
  }, [selectedSurah, currentAyahIndex]);

  // ==========================================
  // VERSE NAVIGATION (with haptics, from QuranScreen)
  // ==========================================
  const navigateAyah = useCallback((dir) => {
    if (!selectedSurah) return;

    triggerHaptic('light', 'nav');

    // Stop audio before changing verse
    if (isPlaying && sound) {
      sound.stopAsync();
      setIsPlaying(false);
    }

    if (dir === 'next') {
      if (currentAyahIndex < selectedSurah.ayahs.length - 1) {
        setCurrentAyahIndex(p => p + 1);
      } else {
        // Cross to next surah
        if (selectedSurah.number < 114) {
          const nextSurah = surahs.find(s => s.number === selectedSurah.number + 1);
          if (nextSurah) {
            setSelectedSurah(nextSurah);
            setCurrentAyahIndex(0);
          }
        }
      }
    } else {
      if (currentAyahIndex > 0) {
        setCurrentAyahIndex(p => p - 1);
      } else {
        // Cross to previous surah
        const prevSurah = surahs.find(s => s.number === selectedSurah.number - 1);
        if (prevSurah) {
          setSelectedSurah(prevSurah);
          setCurrentAyahIndex(prevSurah.ayahs.length - 1);
        }
      }
    }
  }, [selectedSurah, currentAyahIndex, isPlaying, sound]);

  // ==========================================
  // SWIPE GESTURES
  // ==========================================
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 30 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderRelease: (_, gs) => {
      const isRTL = I18nManager.isRTL;
      if (gs.dx < -50) navigateAyah(isRTL ? 'prev' : 'next');
      else if (gs.dx > 50) navigateAyah(isRTL ? 'next' : 'prev');
    },
  }), [navigateAyah]);

  // ==========================================
  // BOOKMARK TOGGLE (copied from QuranScreen)
  // ==========================================
  const toggleBookmark = async () => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];

    triggerHaptic('selection', 'bookmark');

    if (currentBookmarkId) {
      await deleteBookmark(currentBookmarkId);
      setCurrentBookmarkId(null);
      setToastMessage('Bookmark removed');
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      const newId = await addBookmark({
        surah: selectedSurah.number,
        ayah: ayah.number,
        page: ayah.page,
        label: `${selectedSurah.englishName} : ${ayah.numberInSurah}`
      });
      setCurrentBookmarkId(newId);
      setToastMessage(`Bookmarked ${selectedSurah.englishName} : ${ayah.numberInSurah}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ==========================================
  // AUDIO PLAYBACK (copied from QuranScreen)
  // ==========================================
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
      const reciterInfo = getReciterById(reciter);
      setReciterName(reciterInfo.name);

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
      console.error('[Challenge] Audio error:', e);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // ==========================================
  // HIFZ HANDLER (copied from QuranScreen)
  // ==========================================
  const handleAddToHifz = async () => {
    try {
      const relativeAyah = currentAyahIndex + 1;
      await addItem(selectedSurah.number, relativeAyah);

      setToastMessage(`Added Surah ${selectedSurah.englishName} : ${relativeAyah} to Hifz`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('[Challenge] Hifz error:', e);
      setToastMessage("Error adding to Hifz");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ==========================================
  // TAFSIR HANDLER (copied from QuranScreen)
  // ==========================================
  const fetchTafsir = async () => {
    if (!isFeatureEnabled('tafsir')) return alert('Feature disabled');
    setLoadingTafsir(true);
    try {
      const relativeAyahNumber = currentAyahIndex + 1;
      const data = await getTafsirForAyah(selectedSurah.number, relativeAyahNumber);
      setTafsirData(data[0] || { textEn: "No Tafsir available for this ayah." });
    } catch (e) { console.error('[Challenge] Tafsir error:', e); }
    finally { setLoadingTafsir(false); }
  };

  // ==========================================
  // BACK NAVIGATION (with auto-save + audio cleanup)
  // ==========================================
  const handleBack = async () => {
    // Stop audio before leaving
    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
    if (selectedSurah) {
      const ayah = selectedSurah.ayahs[currentAyahIndex];
      if (ayah) {
        await saveChallengeProgress(selectedSurah.number, ayah.number);
      }
    }
    navigation.goBack();
  };

  // ==========================================
  // RESET CHALLENGE
  // ==========================================
  const handleReset = () => {
    triggerHaptic('selection', 'reset');
    Alert.alert(
      'Reset Challenge',
      'Are you sure you want to restart the Ramadan Challenge from the beginning? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetChallenge();
            setSelectedSurah(surahs[0]);
            setCurrentAyahIndex(0);
            setJuzProgress(null);
          },
        },
      ]
    );
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading || !selectedSurah) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading Challenge...
          </Text>
        </View>
      </View>
    );
  }

  const currentAyah = selectedSurah.ayahs[currentAyahIndex];
  const surahTrans = translations[selectedSurah.number] || [];
  const transText = surahTrans.find(t => t.number === currentAyah.number)?.text || '';

  const juzsCompleted = juzProgress ? juzProgress.juz - 1 + (juzProgress.isLastVerse ? 1 : 0) : 0;
  const progressPercentage = (juzsCompleted / 30) * 100;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.surface }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: '#FFD700' }]}>🌙 {t('ramadanChallenge') || 'Ramadan Challenge'}</Text>
          {juzProgress && (
            <Text style={[styles.juzInfo, { color: theme.textSecondary }]}>
              {formatJuzProgress(juzProgress, language)}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowAudioSheet(true)} style={styles.iconBtn}>
            <Ionicons name="mic-outline" size={22} color={theme.text} />
          </Pressable>
          <Pressable onPress={handleReset} style={styles.iconBtn}>
            <Ionicons name="refresh-outline" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Overall Progress */}
      <View style={[styles.overallProgress, { backgroundColor: theme.surface }]}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {juzsCompleted} / 30 {t('juzsCompleted') || 'Juzs completed'}
        </Text>
        <View style={[styles.miniProgressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.miniProgressFill,
              { width: `${Math.min(progressPercentage, 100)}%` }
            ]}
          />
        </View>
      </View>

      {/* Reader Container */}
      <View style={styles.readerContainer} {...panResponder.panHandlers}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
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
                isLoadingAudio={isLoadingAudio}
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

      {/* Navigation Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={() => navigateAyah('prev')}
          disabled={currentAyahIndex === 0 && selectedSurah.number === 1}
        >
          <Ionicons
            name="chevron-back"
            size={32}
            color={currentAyahIndex === 0 && selectedSurah.number === 1
              ? theme.textSecondary + '40'
              : theme.primary}
          />
        </Pressable>

        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          {selectedSurah.englishName} {currentAyahIndex + 1}/{selectedSurah.ayahs.length}
        </Text>

        <Pressable
          onPress={() => navigateAyah('next')}
          disabled={selectedSurah.number === 114 && currentAyahIndex === selectedSurah.ayahs.length - 1}
        >
          <Ionicons
            name="chevron-forward"
            size={32}
            color={selectedSurah.number === 114 && currentAyahIndex === selectedSurah.ayahs.length - 1
              ? theme.textSecondary + '40'
              : theme.primary}
          />
        </Pressable>
      </View>

      {/* Audio Bottom Sheet (from QuranScreen) */}
      <AudioBottomSheet
        visible={showAudioSheet}
        onClose={() => setShowAudioSheet(false)}
        isPlaying={isPlaying}
        onPlayPause={playAyah}
        onStop={() => { if (sound) sound.stopAsync(); setIsPlaying(false); }}
        reciterName={reciterName}
        onAnalyticsPress={() => alert('Analytics coming soon')}
        onRelatedPress={() => alert('Related Hadith/Adhkar coming soon')}
      />

      {/* Toast Notification (from QuranScreen) */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={[styles.toast, { backgroundColor: theme.surface }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            <Text style={[styles.toastText, { color: theme.text }]}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconBtn: {
    padding: 4,
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
  },
  juzInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  overallProgress: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressText: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  miniProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  readerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // Toast styles (from QuranScreen)
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RamadanChallengeScreen;
