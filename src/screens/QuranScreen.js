import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, Modal, I18nManager, Dimensions, PanResponder, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import { Card, ArabicText } from '../components';
import { incrementQuranStats, getQuranStats } from '../services';
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
// These are the ONLY acceptable forms for a "pure Bismillah" ayah
const PURE_BISMILLAH_PATTERNS = [
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  '\ufeffبِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', // With BOM
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', // Alternative Alif form
  '\ufeffبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
];

// Helper function: Check if ayah 1 is PURE Bismillah (read-only inspection)
// Returns true ONLY if the text is exactly Bismillah with no additional content
// This is a content-aware check, NOT surah-number based
const isPureBismillahAyah = (ayahText) => {
  if (!ayahText) return false;
  const trimmed = ayahText.trim();
  return PURE_BISMILLAH_PATTERNS.includes(trimmed);
};

// Helper function: Determine if surah should show decorative header and skip ayah 1
// Rules:
// - Surah 1 (Al-Fatiha): NEVER skip ayah 1 (Bismillah IS verse 1)
// - Surah 9 (At-Tawba): No Bismillah at all, render normally
// - Other surahs: Only skip ayah 1 if it's PURE Bismillah (no additional Quranic text)
const shouldShowDecorativeHeaderAndSkipAyah1 = (surah) => {
  if (!surah || !surah.ayahs || surah.ayahs.length === 0) return false;
  if (surah.number === 1 || surah.number === 9) return false;

  // Content-aware check: is ayah 1 PURE Bismillah?
  const ayah1Text = surah.ayahs[0]?.text || '';
  return isPureBismillahAyah(ayah1Text);
};

const QuranScreen = ({ navigation, onSurahChange }) => {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ dailyTime: 0, dailyPages: 0, totalTime: 0, totalPages: 0 });
  const [sessionTime, setSessionTime] = useState(0);

  // Timer Logic
  useEffect(() => {
    let interval;
    if (selectedSurah) {
      interval = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [selectedSurah]);

  // Audio State
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const surahs = quranData.surahs || [];
  const translations = translationsData.translations || {};

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
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

      // Stop previous if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Format numbers for URL (001001 for 1:1)
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
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
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

  // Get ayah number safely (use index+1 as fallback if numberInSurah is missing)
  const getAyahNumber = (ayah, index) => {
    if (ayah && ayah.numberInSurah !== undefined && ayah.numberInSurah !== null) {
      return ayah.numberInSurah;
    }
    return index + 1;
  };

  // Notify parent when surah selection changes (for back button handling)
  const handleSurahSelect = useCallback((surah, initialAyahIndex = 0) => {
    setSelectedSurah(surah);
    setCurrentAyahIndex(initialAyahIndex);
    if (onSurahChange) {
      onSurahChange(surah);
    }
  }, [onSurahChange]);

  const navigateToPrevSurah = useCallback(() => {
    if (!selectedSurah) return false;
    const currentSurahIndex = surahs.findIndex(s => s.number === selectedSurah.number);
    if (currentSurahIndex > 0) {
      const prevSurah = surahs[currentSurahIndex - 1];
      // For surahs with decorative header, last displayable ayah is length-1
      // For Surah 1 and 9, start from the actual last ayah
      const lastAyahIndex = prevSurah.ayahs.length - 1;
      handleSurahSelect(prevSurah, lastAyahIndex);
      return true;
    }
    return false;
  }, [selectedSurah, surahs, handleSurahSelect]);

  // Navigate to next surah for continuous reading
  const navigateToNextSurah = useCallback(() => {
    if (!selectedSurah) return false;
    const currentSurahIndex = surahs.findIndex(s => s.number === selectedSurah.number);
    if (currentSurahIndex < surahs.length - 1) {
      const nextSurah = surahs[currentSurahIndex + 1];
      // CONTENT-AWARE: Only skip ayah 0 if it's PURE Bismillah (no additional text)
      const startIndex = shouldShowDecorativeHeaderAndSkipAyah1(nextSurah) ? 1 : 0;
      handleSurahSelect(nextSurah, startIndex);
      return true;
    }
    return false; // Already at last surah (An-Nas)
  }, [selectedSurah, surahs, handleSurahSelect]);

  // Navigate between ayahs with continuous surah support
  // For surahs with decorative header, minimum index is 1 (skip ayah 0)
  const navigateAyah = useCallback((direction) => {
    if (!selectedSurah) return;
    const maxIndex = selectedSurah.ayahs.length - 1;
    // CONTENT-AWARE: Minimum index is 1 only if ayah 1 is PURE Bismillah
    const minIndex = shouldShowDecorativeHeaderAndSkipAyah1(selectedSurah) ? 1 : 0;

    if (direction === 'next') {
      if (currentAyahIndex < maxIndex) {
        setCurrentAyahIndex(prev => prev + 1);
        incrementQuranStats({ pages: 0.1 });
      } else {
        // At last ayah - try to go to next surah
        navigateToNextSurah();
      }
    } else if (direction === 'prev') {
      if (currentAyahIndex > minIndex) {
        setCurrentAyahIndex(prev => prev - 1);
      } else {
        // At first displayable ayah - try to go to prev surah
        navigateToPrevSurah();
      }
    }
  }, [selectedSurah, currentAyahIndex, navigateToNextSurah, navigateToPrevSurah]);

  // Swipe gesture handler for verse-by-verse navigation
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50) {
        // Swipe left = next (for LTR, but RTL for Arabic content = prev)
        navigateAyah(I18nManager.isRTL ? 'prev' : 'next');
      } else if (gestureState.dx > 50) {
        // Swipe right = prev (for LTR, but RTL for Arabic content = next)
        navigateAyah(I18nManager.isRTL ? 'next' : 'prev');
      }
    },
  }), [navigateAyah]);

  // Tracking refs
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Tracking Logic
  useEffect(() => {
    if (selectedSurah) {
      // Start tracking
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        // Update stats every 10 seconds
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTimeRef.current) / 1000);
        if (elapsedSeconds >= 10) {
          incrementQuranStats({ time: elapsedSeconds });
          startTimeRef.current = now; // Reset start time to avoid double counting
        }
      }, 10000);
    } else {
      // Stop tracking
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Save remaining time if unmounting/changing
      if (startTimeRef.current && selectedSurah) {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTimeRef.current) / 1000);
        if (elapsedSeconds > 1) {
          incrementQuranStats({ time: elapsedSeconds });
        }
      }
    };
  }, [selectedSurah]);

  // Load stats for dashboard
  const loadStats = async () => {
    const data = await getQuranStats();
    setStats(data);
  };

  useEffect(() => {
    if (showStats) {
      loadStats();
    }
  }, [showStats]);


  const getTranslation = (surahNumber, ayahNumber) => {
    const surahTranslations = translations[surahNumber];
    if (!surahTranslations) return '';
    const ayah = surahTranslations.find(a => a.number === ayahNumber);
    return ayah ? ayah.text : '';
  };

  // Handle back navigation - returns true if handled internally
  const handleBack = useCallback(() => {
    if (selectedSurah) {
      handleSurahSelect(null);
      return true;
    }
    return false;
  }, [selectedSurah, handleSurahSelect]);

  // Expose handleBack to parent via navigation
  useEffect(() => {
    if (navigation && navigation.setParams) {
      navigation.setParams({ handleBack });
    }
  }, [navigation, handleBack]);

  // Quranly-style verse-by-verse reader
  const renderVerseMode = () => {
    if (!selectedSurah || selectedSurah.ayahs.length === 0) return null;

    const currentAyah = selectedSurah.ayahs[currentAyahIndex];
    if (!currentAyah) return null;

    // CONTENT-AWARE: Show decorative header only if ayah 1 is PURE Bismillah
    const showDecorativeHeader = shouldShowDecorativeHeaderAndSkipAyah1(selectedSurah);

    // For navigation: minimum index is 1 for surahs with header (skip ayah 0), 0 otherwise
    const minIndex = showDecorativeHeader ? 1 : 0;
    const isFirstDisplayableAyah = currentAyahIndex === minIndex;
    const isLastAyah = currentAyahIndex >= selectedSurah.ayahs.length - 1;
    const isLastSurah = selectedSurah.number === 114;

    const ayahNumber = getAyahNumber(currentAyah, currentAyahIndex);

    // Display ayah text UNCHANGED - no stripping, no manipulation
    // The Quran data is authoritative and must remain untouched
    const ayahText = currentAyah.text || '';

    // Append ornamental marker inline (Arabic end-of-ayah marker with number)
    const ayahDisplayText = `${ayahText} \u06dd${toArabicNumerals(ayahNumber)}`;

    const translation = getTranslation(selectedSurah.number, currentAyah.number);
    const totalAyahs = selectedSurah.ayahs.length;

    // For surahs with decorative header, displayed verses are from index 1 to end
    // So displayed count = totalAyahs - 1, current position = currentAyahIndex
    const displayedVersesCount = showDecorativeHeader ? totalAyahs - 1 : totalAyahs;
    const displayedPosition = showDecorativeHeader ? currentAyahIndex : currentAyahIndex + 1;

    // Progress Calculation
    const progressPercent = Math.round((displayedPosition / displayedVersesCount) * 100);
    const estimatedJuz = Math.ceil(selectedSurah.ayahs[0].page / 20) || 1;

    return (
      <View style={styles.verseModeContainer}>
        {/* 3. Progress Bar Section */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTextLeft}>
            {toArabicNumerals(displayedPosition)}/{toArabicNumerals(displayedVersesCount)}
          </Text>
          <Text style={styles.progressTextCenter}>
            Juz {estimatedJuz} : {toArabicNumerals(displayedVersesCount - displayedPosition)} {language === 'ar' ? 'آية متبقية' : 'verses left'}
          </Text>
          <Text style={styles.progressTextRight}>{toArabicNumerals(progressPercent)}%</Text>
        </View>

        {/* 4. Verse Card Container */}
        <ScrollView
          style={styles.verseScrollView}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.verseCard, { backgroundColor: theme.surface }]}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              {/* Left: Play Controls */}
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

              {/* Center: Surah Title */}
              <View style={styles.surahTitleContainer}>
                <View style={[styles.surahTitlePill, { backgroundColor: theme.primary }]}>
                  <Text style={styles.surahTitleText}>{selectedSurah.number}. {selectedSurah.englishName}</Text>
                </View>
                <Text style={[styles.ayahCountText, { color: theme.primary }]}>
                  {toArabicNumerals(currentAyahIndex + 1)}/{toArabicNumerals(totalAyahs)}
                </Text>
              </View>

              {/* Right: Heart */}
              <Pressable style={styles.heartButton}>
                <Ionicons name="heart-outline" size={28} color={theme.primary} />
                <Text style={[styles.likesCount, { color: theme.textSecondary }]}>3.9K</Text>
              </Pressable>
            </View>

            {/* Decorative Bismillah Header (shown only on first displayable ayah) */}
            {showDecorativeHeader && isFirstDisplayableAyah && (
              <View style={[styles.basmalahContainer, styles.basmalahDecorative]}>
                <ArabicText size="large" style={styles.basmalahText}>{BASMALAH_TEXT}</ArabicText>
              </View>
            )}

            {/* Arabic Text (Centered, Uthmani) */}
            <View style={styles.arabicContainer}>
              <ArabicText size="xlarge" style={styles.verseArabic}>
                {ayahDisplayText}
              </ArabicText>
            </View>
          </View>

          {/* 5. Translation Section */}
          {showTranslation && (
            <View style={[styles.translationContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.translationText, { color: theme.text }]}>
                {translation}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 6. Bottom Controls Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
          {/* Prev Button - disabled at minimum displayable ayah */}
          <Pressable
            style={[styles.navButtonCircle, { opacity: isFirstDisplayableAyah ? 0.3 : 1 }]}
            onPress={() => navigateAyah('prev')}
            disabled={isFirstDisplayableAyah}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </Pressable>

          {/* Done Button */}
          <Pressable onPress={() => handleSurahSelect(null)}>
            <Text style={[styles.doneButtonTextNew, { color: theme.primary }]}>{language === 'ar' ? 'تم' : "I'm Done"}</Text>
          </Pressable>

          {/* Next Button + Badge */}
          <Pressable
            style={[styles.navButtonCircle, { opacity: (isLastAyah && isLastSurah) ? 0.3 : 1 }]}
            onPress={() => navigateAyah('next')}
            disabled={isLastAyah && isLastSurah}
          >
            <Ionicons name="arrow-forward" size={24} color={theme.primary} />
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+1500</Text>
            </View>
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
              <Text style={[styles.statValue, { color: theme.primary }]}>{Math.floor(stats.dailyTime / 60)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mins Today</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{stats.dailyPages || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pages Today</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{Math.floor(stats.totalTime / 60 || 0)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Mins</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{stats.totalPages || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Pages</Text>
            </View>
          </View>

          <Text style={[styles.statsNote, { color: theme.textSecondary }]}>
            Stats update automatically as you read.
          </Text>
        </View>
      </View>
    </Modal>
  );

  const renderPageMode = () => {
    const activePageData = surahPages.find(p => p.number === currentPage);

    if (!activePageData) return (
      <View style={styles.centerContent}>
        <Text style={{ color: theme.text }}>Page not found in this Surah</Text>
      </View>
    );

    return (
      <View style={styles.pageContainer}>
        <View style={[styles.pageHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.pageNumber, { color: theme.textSecondary }]}>Page {currentPage}</Text>
        </View>

        <ScrollView style={styles.pageContent} contentContainerStyle={styles.pageScrollContent}>
          <View style={styles.pageTextContainer}>
            <Text style={[styles.quranPageText, { color: theme.text, textAlign: 'center' }]}>
              {activePageData.ayahs.map((ayah, index) => (
                <Text key={ayah.number}>
                  <Text style={[styles.verseText, { color: theme.text }]}>{ayah.text} </Text>
                  <Text style={[styles.verseNumber, { color: theme.primary }]}>۝{ayah.numberInSurah} </Text>
                </Text>
              ))}
            </Text>
          </View>
        </ScrollView>

        <View style={[
          styles.pageControls,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.surface,
            flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row'
          }
        ]}>
          <Pressable
            onPress={goToPrevPage}
            disabled={surahPages.findIndex(p => p.number === currentPage) === 0}
            style={[
              styles.controlButton,
              { opacity: surahPages.findIndex(p => p.number === currentPage) === 0 ? 0.3 : 1 }
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
            <Text style={[styles.controlText, { color: theme.text }]}>
              {I18nManager.isRTL ? 'التالي' : 'Prev'}
            </Text>
          </Pressable>

          <Text style={[styles.controlPageNum, { color: theme.text }]}>{currentPage}</Text>

          <Pressable
            onPress={goToNextPage}
            disabled={surahPages.findIndex(p => p.number === currentPage) === surahPages.length - 1}
            style={[
              styles.controlButton,
              { opacity: surahPages.findIndex(p => p.number === currentPage) === surahPages.length - 1 ? 0.3 : 1 }
            ]}
          >
            <Text style={[styles.controlText, { color: theme.text }]}>
              {I18nManager.isRTL ? 'السابق' : 'Next'}
            </Text>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderTranslationMode = () => {
    // CONTENT-AWARE: Show decorative header only if ayah 1 is PURE Bismillah
    const showDecorativeHeader = shouldShowDecorativeHeaderAndSkipAyah1(selectedSurah);

    // Get displayable ayahs - skip index 0 ONLY when ayah 1 is PURE Bismillah
    const displayableAyahs = showDecorativeHeader
      ? selectedSurah.ayahs.slice(1) // Skip first ayah (pure Bismillah)
      : selectedSurah.ayahs;

    return (
      <ScrollView style={styles.ayahList} contentContainerStyle={styles.ayahListContent}>
        {/* Decorative Bismillah header - shown only when ayah 1 is PURE Bismillah */}
        {showDecorativeHeader && (
          <View style={[styles.bismillah, styles.basmalahDecorative, { backgroundColor: theme.surface }]}>
            <ArabicText size="large">{BASMALAH_TEXT}</ArabicText>
          </View>
        )}

        {displayableAyahs.map((ayah) => (
          <View key={ayah.number} style={[styles.ayahContainer, { borderBottomColor: theme.border }]}>
            <View style={styles.ayahHeader}>
              <View style={[styles.ayahNumberBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.ayahNumberText}>{ayah.numberInSurah}</Text>
              </View>
            </View>
            <ArabicText size="regular" style={styles.ayahArabic}>
              {ayah.text}
            </ArabicText>
            {showTranslation && (
              <Text style={[styles.ayahTranslation, { color: theme.textSecondary }]}>
                {getTranslation(selectedSurah.number, ayah.number)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderSurahDetail = () => {
    if (!selectedSurah) return null;

    return (
      <View style={styles.detail}>
        {/* 2. Top Navigation Bar */}
        <View style={[styles.topNavBar, { paddingTop: insets.top }]}>
          <Pressable style={styles.topBackBtn} onPress={() => handleSurahSelect(null)}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>

          <View style={[styles.topIconsPill, { backgroundColor: theme.surface }]}>
            <Ionicons name="heart" size={20} color={theme.primary} style={{ marginHorizontal: 4 }} />
            <Ionicons name="book" size={20} color={theme.primary} style={{ marginHorizontal: 4 }} />
            <MaterialCommunityIcons name="beads" size={20} color={theme.primary} style={{ marginHorizontal: 4 }} />
            <Text style={[styles.timerText, { color: theme.text }]}>
              {Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, '0')}
            </Text>
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
            <Pressable
              style={[styles.statsButton, { backgroundColor: theme.primary + '15' }]}
              onPress={() => setShowStats(true)}
            >
              <Ionicons name="stats-chart" size={24} color={theme.primary} />
            </Pressable>
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
  header: { padding: 20, paddingBottom: 10 },
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
    height: 100, // Reduced from speculative 60+44 -> adjusted to fit Safe Area
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  topBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  topIconsPill: {
    flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: 20,
    paddingHorizontal: 12,
    minWidth: 120, justifyContent: 'center'
  },
  timerText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  topSettingsBtn: {
    width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center'
  },

  // Verse Mode Main Container
  verseModeContainer: { flex: 1 },

  // Progress Section
  progressSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 20, marginTop: 10
  },
  progressTextLeft: { fontSize: 16, fontWeight: '500' },
  progressTextCenter: { fontSize: 14, color: '#666' },
  progressTextRight: { fontSize: 16, fontWeight: '500' },

  // Verse Scroll View
  verseScrollView: { flex: 1 },

  // Main Verse Card
  verseCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, height: 48
  },
  playPill: {
    flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: 20,
    borderWidth: 1, paddingHorizontal: 12
  },
  surahTitleContainer: { alignItems: 'center' },
  surahTitlePill: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    marginBottom: 4
  },
  surahTitleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  ayahCountText: { fontSize: 12, fontWeight: '600' },
  heartButton: { alignItems: 'center', justifyContent: 'center' },
  likesCount: { fontSize: 10, marginTop: 2 },

  // Arabic Text Area
  basmalahContainer: { alignItems: 'center', marginBottom: 16 },
  basmalahText: { textAlign: 'center' },
  // Decorative styling for Bismillah header - subtle border and padding
  basmalahDecorative: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)', // Subtle gold/brown border
    backgroundColor: 'rgba(139, 115, 85, 0.05)', // Very subtle warm background
    marginHorizontal: 16,
    marginBottom: 20,
  },
  arabicContainer: { alignItems: 'center', marginVertical: 12 },
  verseArabic: { textAlign: 'center', lineHeight: 60 }, // Generous line height

  // Translation
  translationContainer: {
    marginTop: 20, marginHorizontal: 16,
    padding: 20, borderRadius: 20,
    marginBottom: 40
  },
  translationText: { fontSize: 16, lineHeight: 26 },

  // Bottom Control Bar
  bottomBar: {
    height: 100,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10
  },
  navButtonCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center'
  },
  doneButtonTextNew: { fontSize: 18, fontWeight: '600' },
  rewardBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2
  },
  rewardText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // Stats Modal Styles
  statsButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  statsNote: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});

export default QuranScreen;
