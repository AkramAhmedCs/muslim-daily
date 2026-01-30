import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, Modal, I18nManager, Dimensions, PanResponder, Image, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import { Card, ArabicText } from '../components';
import {
  startSession,
  endSession,
  addBookmark,
  deleteBookmark,
  isBookmarked as checkIsBookmarked, // Now returns ID or null
  trackPageView,
  getJuzProgress,
  getTodayReadingMinutes
} from '../services';

// Note: No text manipulation imports - Bismillah fix is done at render level

// Import the full Quran data
import quranData from '../../data/quran_full.json';
import translationsData from '../../data/quran_translations.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Convert to Arabic-Indic numerals
const toArabicNumerals = (num) => {
  if (num === undefined || num === null) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).split('').map(d => arabicNumerals[parseInt(d)] || d).join('');
};

// Decorative Bismillah text for header display only (never modify Quran data)
const BASMALAH_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

// Known pure Bismillah patterns (exact text, read-only comparison)
const PURE_BISMILLAH_PATTERNS = [
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  '\ufeffبِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  '\ufeffبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
];

const isPureBismillahAyah = (ayahText) => {
  if (!ayahText) return false;
  const trimmed = ayahText.trim();
  return PURE_BISMILLAH_PATTERNS.includes(trimmed);
};

const shouldShowDecorativeHeaderAndSkipAyah1 = (surah) => {
  if (!surah || !surah.ayahs || surah.ayahs.length === 0) return false;
  if (surah.number === 1 || surah.number === 9) return false;
  const ayah1Text = surah.ayahs[0]?.text || '';
  return isPureBismillahAyah(ayah1Text);
};

const QuranScreen = ({ navigation, route, onSurahChange }) => {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [selectedSurah, setSelectedSurah] = useState(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);

  // Analytics State
  const [showStats, setShowStats] = useState(false);
  const [sessionMins, setSessionMins] = useState(0);
  const [juzProgress, setJuzProgress] = useState({ pagesRead: 0, totalPages: 0, progressPercent: 0 });
  const [currentBookmarkId, setCurrentBookmarkId] = useState(null); // Stores ID if bookmarked, else null

  // Audio State
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const surahs = quranData.surahs || [];
  const translations = translationsData.translations || {};

  // Handle Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      // If a Surah is open, close it (go back to list)
      if (selectedSurah) {
        handleSurahSelect(null);
        return true; // Prevent default behavior (exiting app)
      }
      return false; // Default behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [selectedSurah]);

  // Handle Navigation Params (Resume from Bookmark)
  useEffect(() => {
    if (route.params?.surahNumber && route.params?.ayahNumber) {
      const surah = surahs.find(s => s.number === route.params.surahNumber);
      if (surah) {
        // Find index of ayah
        const ayahIndex = surah.ayahs.findIndex(a => a.number === route.params.ayahNumber);

        if (ayahIndex !== -1) {
          handleSurahSelect(surah, ayahIndex);
          // CRITICAL Fix: Clear params so we don't re-trigger this on Back press
          navigation.setParams({ surahNumber: null, ayahNumber: null });
        }
      }
    }
  }, [route.params, handleSurahSelect, navigation, surahs]);

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  // Play Ayah Audio
  const playAyah = async (surahNum, ayahNum) => {
    try {
      if (isPlaying) {
        await stopAudio();
        return;
      }

      setIsLoadingAudio(true);
      if (sound) await sound.unloadAsync();

      const paddedSurah = String(surahNum).padStart(3, '0');
      const paddedAyah = String(ayahNum).padStart(3, '0');
      const url = `https://everyayah.com/data/Alafasy_128kbps/${paddedSurah}${paddedAyah}.mp3`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoadingAudio(false);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setIsPlaying(false);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const getAyahNumber = (ayah, index) => {
    if (ayah && ayah.numberInSurah !== undefined) return ayah.numberInSurah;
    return index + 1;
  };

  // Surah Selection Handler
  const handleSurahSelect = useCallback(async (surah, initialAyahIndex = 0) => {
    // If we are exiting a surah, end the session
    if (!surah && selectedSurah) {
      await endSession();
    }

    setSelectedSurah(surah);
    setCurrentAyahIndex(initialAyahIndex);

    if (onSurahChange) onSurahChange(surah);
  }, [onSurahChange, selectedSurah]);

  // Navigation Helpers
  const navigateToPrevSurah = useCallback(() => {
    if (!selectedSurah) return false;
    const currentSurahIndex = surahs.findIndex(s => s.number === selectedSurah.number);
    if (currentSurahIndex > 0) {
      const prevSurah = surahs[currentSurahIndex - 1];
      const lastAyahIndex = prevSurah.ayahs.length - 1;
      handleSurahSelect(prevSurah, lastAyahIndex);
      return true;
    }
    return false;
  }, [selectedSurah, surahs, handleSurahSelect]);

  const navigateToNextSurah = useCallback(() => {
    if (!selectedSurah) return false;
    const currentSurahIndex = surahs.findIndex(s => s.number === selectedSurah.number);
    if (currentSurahIndex < surahs.length - 1) {
      const nextSurah = surahs[currentSurahIndex + 1];
      const startIndex = shouldShowDecorativeHeaderAndSkipAyah1(nextSurah) ? 1 : 0;
      handleSurahSelect(nextSurah, startIndex);
      return true;
    }
    return false;
  }, [selectedSurah, surahs, handleSurahSelect]);

  const navigateAyah = useCallback((direction) => {
    if (!selectedSurah) return;
    const maxIndex = selectedSurah.ayahs.length - 1;
    const minIndex = shouldShowDecorativeHeaderAndSkipAyah1(selectedSurah) ? 1 : 0;

    if (direction === 'next') {
      if (currentAyahIndex < maxIndex) {
        setCurrentAyahIndex(prev => prev + 1);
      } else {
        navigateToNextSurah();
      }
    } else if (direction === 'prev') {
      if (currentAyahIndex > minIndex) {
        setCurrentAyahIndex(prev => prev - 1);
      } else {
        navigateToPrevSurah();
      }
    }
  }, [selectedSurah, currentAyahIndex, navigateToNextSurah, navigateToPrevSurah]);

  // Pan Responder for Swipes
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50) navigateAyah(I18nManager.isRTL ? 'prev' : 'next');
      else if (gestureState.dx > 50) navigateAyah(I18nManager.isRTL ? 'next' : 'prev');
    },
  }), [navigateAyah]);


  // --- PRIMARY LOGIC: Sessions, Tracking, Bookmarks ---

  // 1. Session Management
  useEffect(() => {
    if (selectedSurah && selectedSurah.ayahs[currentAyahIndex]) {
      const ayah = selectedSurah.ayahs[currentAyahIndex];
      startSession({
        surah: selectedSurah.number,
        ayah: ayah.number,
        source: 'verse_reader'
      });

      // Update session mins for UI
      getTodayReadingMinutes().then(setSessionMins);

      // Clean up session on unmount or change
      return () => {
        // We use a small timeout or just rely on next startSession/unmount
        endSession(selectedSurah.number, ayah.number);
      };
    }
  }, [selectedSurah]); // Reset session if surah changes significantly (or app backgrounded)

  // 2. Page Tracking & Juz Progress
  useEffect(() => {
    if (!selectedSurah) return;

    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (ayah && ayah.page) {
      // Track page view
      trackPageView(ayah.page).then(async () => {
        // Update Juz Progress
        const juz = ayah.juz;
        if (juz) {
          const progress = await getJuzProgress(juz);
          setJuzProgress(progress);
        }
      });
    }
  }, [selectedSurah, currentAyahIndex]);

  // 3. Bookmark Status
  useEffect(() => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (ayah) {
      checkIsBookmarked(selectedSurah.number, ayah.number).then(id => {
        setCurrentBookmarkId(id); // Set ID or null
      });
    }
  }, [selectedSurah, currentAyahIndex]);

  const toggleBookmark = async () => {
    if (!selectedSurah) return;
    const ayah = selectedSurah.ayahs[currentAyahIndex];
    if (!ayah) return;

    if (currentBookmarkId) {
      // Remove Bookmark
      await deleteBookmark(currentBookmarkId);
      setCurrentBookmarkId(null);
    } else {
      // Add Bookmark
      const newId = await addBookmark({
        surah: selectedSurah.number,
        ayah: ayah.number,
        page: ayah.page,
        label: `${selectedSurah.englishName} ${ayah.numberInSurah}`
      });
      setCurrentBookmarkId(newId);
    }
  };

  // --- UI RENDER ---

  const getTranslation = (surahNumber, ayahNumber) => {
    const surahTranslations = translations[surahNumber];
    if (!surahTranslations) return '';
    const ayah = surahTranslations.find(a => a.number === ayahNumber);
    return ayah ? ayah.text : '';
  };

  const handleBack = useCallback(() => {
    if (selectedSurah) {
      handleSurahSelect(null);
      return true;
    }
    return false;
  }, [selectedSurah, handleSurahSelect]);

  useEffect(() => {
    if (navigation && navigation.setParams) {
      navigation.setParams({ handleBack });
    }
  }, [navigation, handleBack]);

  const renderVerseMode = () => {
    if (!selectedSurah || selectedSurah.ayahs.length === 0) return null;

    const currentAyah = selectedSurah.ayahs[currentAyahIndex];
    if (!currentAyah) return null;

    const showDecorativeHeader = shouldShowDecorativeHeaderAndSkipAyah1(selectedSurah);
    const minIndex = showDecorativeHeader ? 1 : 0;
    const isFirstDisplayableAyah = currentAyahIndex === minIndex;
    const isLastAyah = currentAyahIndex >= selectedSurah.ayahs.length - 1;
    const isLastSurah = selectedSurah.number === 114;

    const ayahNumber = getAyahNumber(currentAyah, currentAyahIndex);
    const ayahText = currentAyah.text || '';
    const ayahDisplayText = `${ayahText} \u06dd${toArabicNumerals(ayahNumber)}`;
    const translation = getTranslation(selectedSurah.number, currentAyah.number);
    const totalAyahs = selectedSurah.ayahs.length;
    const displayedVersesCount = showDecorativeHeader ? totalAyahs - 1 : totalAyahs;
    const displayedPosition = showDecorativeHeader ? currentAyahIndex : currentAyahIndex + 1;

    // Use authoritative Juz progress if available
    const estimatedJuz = currentAyah.juz || 1;

    return (
      <View style={styles.verseModeContainer}>
        {/* Progress Bar (Authoritative) */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTextLeft}>
            {toArabicNumerals(displayedPosition)}/{toArabicNumerals(displayedVersesCount)}
          </Text>
          <Text style={styles.progressTextCenter}>
            Juz {estimatedJuz} • {juzProgress.progressPercent}% Read ({juzProgress.pagesRead}/{juzProgress.totalPages} pgs)
          </Text>
          <Text style={styles.progressTextRight}>{toArabicNumerals(Math.round((displayedPosition / displayedVersesCount) * 100))}%</Text>
        </View>

        <ScrollView
          style={styles.verseScrollView}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.verseCard, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.playPill, { borderColor: theme.border }]}>
                {isLoadingAudio ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginHorizontal: 12 }} />
                ) : (
                  <Pressable onPress={() => playAyah(selectedSurah.number, currentAyah.number)}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={theme.primary} />
                  </Pressable>
                )}
                <Ionicons name="repeat" size={20} color={theme.textSecondary} style={{ marginLeft: 12 }} />
              </View>

              <View style={styles.surahTitleContainer}>
                <View style={[styles.surahTitlePill, { backgroundColor: theme.primary }]}>
                  <Text style={styles.surahTitleText}>{selectedSurah.number}. {selectedSurah.englishName}</Text>
                </View>
                <Text style={[styles.ayahCountText, { color: theme.primary }]}>
                  {toArabicNumerals(currentAyahIndex + 1)}/{toArabicNumerals(totalAyahs)}
                </Text>
              </View>

              {/* Bookmark Toggle */}
              <Pressable style={styles.heartButton} onPress={toggleBookmark}>
                <Ionicons
                  name={currentBookmarkId ? "bookmark" : "bookmark-outline"}
                  size={28}
                  color={currentBookmarkId ? theme.primary : theme.textSecondary}
                />
              </Pressable>

              {/* Memorize Button */}
              <Pressable
                style={[styles.heartButton, { marginLeft: 16 }]}
                onPress={async () => {
                  import('../services').then(async (s) => {
                    try {
                      // V2 API is addItem(surah, ayah, page)
                      await s.addItem(selectedSurah.number, currentAyah.number, currentAyah.page || 0);
                      alert(`Surah ${selectedSurah.englishName} : Ayah ${currentAyah.number}\nadded to Hifz Journey.`);
                    } catch (e) {
                      alert('Error adding: ' + e.message);
                    }
                  });
                }}
              >
                <Ionicons
                  name="school-outline"
                  size={28}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>

            {showDecorativeHeader && isFirstDisplayableAyah && (
              <View style={[styles.basmalahContainer, styles.basmalahDecorative]}>
                <ArabicText size="large" style={styles.basmalahText}>{BASMALAH_TEXT}</ArabicText>
              </View>
            )}

            <View style={styles.arabicContainer}>
              <ArabicText size="xlarge" style={styles.verseArabic}>
                {ayahDisplayText}
              </ArabicText>
            </View>
          </View>

          {showTranslation && (
            <View style={[styles.translationContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.translationText, { color: theme.text }]}>
                {translation}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
          <Pressable
            style={[styles.navButtonCircle, { opacity: isFirstDisplayableAyah ? 0.3 : 1 }]}
            onPress={() => navigateAyah('prev')}
            disabled={isFirstDisplayableAyah}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </Pressable>

          <Pressable onPress={() => handleSurahSelect(null)}>
            <Text style={[styles.doneButtonTextNew, { color: theme.primary }]}>{language === 'ar' ? 'تم' : "I'm Done"}</Text>
          </Pressable>

          <Pressable
            style={[styles.navButtonCircle, { opacity: (isLastAyah && isLastSurah) ? 0.3 : 1 }]}
            onPress={() => navigateAyah('next')}
            disabled={isLastAyah && isLastSurah}
          >
            <Ionicons name="arrow-forward" size={24} color={theme.primary} />
          </Pressable>
        </View>
      </View >
    );
  };

  const renderSurahList = () => (
    <FlatList
      data={surahs}
      keyExtractor={(item) => item.number.toString()}
      contentContainerStyle={[styles.listContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 80 }]}
      renderItem={({ item }) => (
        <Pressable onPress={() => handleSurahSelect(item, shouldShowDecorativeHeaderAndSkipAyah1(item) ? 1 : 0)}>
          <Card style={styles.surahCard}>
            <View style={[styles.surahNumber, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.surahNumberText, { color: theme.primary }]}>{item.number}</Text>
            </View>
            <View style={styles.surahInfo}>
              <Text style={[styles.surahName, { color: theme.text }]}>{item.englishName}</Text>
              <Text style={[styles.surahMeaning, { color: theme.textSecondary }]}>
                {item.englishNameTranslation} • {item.numberOfAyahs} verses
              </Text>
            </View>
            <View style={styles.surahArabic}>
              <Text style={[styles.arabicName, { color: theme.arabicText }]}>{item.name}</Text>
              <Text style={[styles.revelationType, { color: theme.textSecondary }]}>{item.revelationType}</Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );

  const renderStatsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={!!showStats}
      onRequestClose={() => setShowStats(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Quran Analytics</Text>
            <Pressable onPress={() => setShowStats(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{sessionMins}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mins Today</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>-</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pages Today</Text>
            </View>
          </View>
          <Text style={[styles.statsNote, { color: theme.textSecondary }]}>
            Stats update automatically as you read.
          </Text>
        </View>
      </View>
    </Modal>
  );

  const renderSurahDetail = () => {
    if (!selectedSurah) return null;

    return (
      <View style={styles.detail}>
        <View style={[styles.topNavBar, { paddingTop: insets.top }]}>
          <Pressable style={styles.topBackBtn} onPress={() => handleSurahSelect(null)}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>

          <View style={[styles.topIconsPill, { backgroundColor: theme.surface }]}>
            {/* Bookmark Icon */}
            <Pressable onPress={() => navigation.navigate('Bookmarks')}>
              <Ionicons name="bookmarks" size={20} color={theme.primary} style={{ marginHorizontal: 4 }} />
            </Pressable>
          </View>

          <Pressable style={styles.topSettingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </Pressable>
        </View>

        {renderVerseMode()}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!selectedSurah && (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Quran</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {surahs.length} Surahs • Tanzil.net
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Pressable
                style={[styles.statsButton, { backgroundColor: theme.primary + '15', marginRight: 8 }]}
                onPress={() => navigation.navigate('Bookmarks')}
              >
                <Ionicons name="bookmarks" size={24} color={theme.primary} />
              </Pressable>
              <Pressable
                style={[styles.statsButton, { backgroundColor: theme.primary + '15' }]}
                onPress={() => setShowStats(true)}
              >
                <Ionicons name="stats-chart" size={24} color={theme.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {selectedSurah ? renderSurahDetail() : renderSurahList()}
      {renderStatsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  listContainer: { padding: 16 },
  surahCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
  surahNumber: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  surahNumberText: { fontSize: 14, fontWeight: 'bold' },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 16, fontWeight: '600' },
  surahMeaning: { fontSize: 13, marginTop: 2 },
  surahArabic: { alignItems: 'flex-end' },
  arabicName: { fontSize: 20, fontFamily: 'System' },
  revelationType: { fontSize: 11, marginTop: 4 },
  detail: { flex: 1 },

  // Top Navigation Bar
  topNavBar: {
    minHeight: 60,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  topBackBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  topIconsPill: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 20, paddingHorizontal: 12, minWidth: 60, justifyContent: 'center' },
  topSettingsBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  verseModeContainer: { flex: 1 },
  progressSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  progressTextLeft: { fontSize: 16, fontWeight: '500' },
  progressTextCenter: { fontSize: 12, color: '#666' },
  progressTextRight: { fontSize: 16, fontWeight: '500' },

  verseScrollView: { flex: 1 },
  verseCard: { marginHorizontal: 16, borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, height: 48 },
  playPill: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12 },
  surahTitleContainer: { alignItems: 'center' },
  surahTitlePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
  surahTitleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  ayahCountText: { fontSize: 12, fontWeight: '600' },
  heartButton: { alignItems: 'center', justifyContent: 'center' },

  basmalahContainer: { alignItems: 'center', marginBottom: 16 },
  basmalahText: { textAlign: 'center' },
  basmalahDecorative: { paddingVertical: 16, paddingHorizontal: 24 },
  arabicContainer: { width: '100%', alignItems: 'center', marginVertical: 10 },
  verseArabic: { textAlign: 'center', lineHeight: 60 },
  translationContainer: { padding: 20, marginTop: 16, marginHorizontal: 16, borderRadius: 16 },
  translationText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingTop: 20 },
  navButtonCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  doneButtonTextNew: { fontSize: 16, fontWeight: '600' },

  statsButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 14 },
  statsNote: { textAlign: 'center', fontSize: 12, marginTop: 20 }
});

export default QuranScreen;
