import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ArabicText, Card } from '../components';
// ... imports ...
import { getPlayableUrl, recordAttempt, addItem } from '../services';
import { normalizeArabicText } from '../utils/textProcessing';
import { Audio } from 'expo-av';
import quranData from '../../data/quran_full.json';
import {
  isValidMemorizedVerse,
  getSurahNumber,
  getAyahNumber
} from '../constants/HifzStructures';

// --- STAGES ---
const STAGE_PREP = 0;
const STAGE_READ = 1;
const STAGE_SHADOW = 2;
const STAGE_RECALL = 3;
const STAGE_GRADE = 4;
const STAGE_DONE = 5;

// --- RECALL MODES ---
const RECALL_TYPE_FIRST_WORDS = 'A';
const RECALL_TYPE_GAP_FILL = 'B';
const RECALL_TYPE_RECITE = 'C';

const MemorizeFlow = ({ route, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Normalize Params
  const params = route.params || {};
  const { item: initialItem, queueLength = 1, currentIndex = 0 } = params;

  // --- STATE HOOKS (Hoisted to top) ---
  const [dbItem, setDbItem] = useState(null);
  const [stage, setStage] = useState(STAGE_PREP);
  const [loading, setLoading] = useState(true);
  const [audioUri, setAudioUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recallMode, setRecallMode] = useState(RECALL_TYPE_GAP_FILL);
  const [userInput, setUserInput] = useState('');
  const [recallAttempts, setRecallAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Ref to prevent rapid-press race conditions
  const audioOperationInProgress = useRef(false);

  // --- EFFECT HOOKS ---

  // 1. Validate on Mount
  useEffect(() => {
    const validateVerseData = () => {
      if (!initialItem && !params.surah) return true;
      if (initialItem) {
        if (!isValidMemorizedVerse(initialItem)) {
          console.error('[MemorizeFlow] Invalid verse data structure:', initialItem);
          Alert.alert(
            'Invalid Verse Data',
            'This verse data is corrupted or incomplete. Please remove it from your memorization list.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return false;
        }
      }
      return true;
    };
    validateVerseData();
  }, [initialItem, params, navigation]);

  // 2. Initialize Item
  useEffect(() => {
    const init = async () => {
      try {
        // A. Already have a full item?
        if (initialItem && initialItem.id && !initialItem.id.startsWith('temp')) {
          setDbItem(initialItem);
          setLoading(false);
          return;
        }

        // B. Direct navigation: Params but no full item
        if (params.surah && params.ayah) {
          const s = parseInt(params.surah);
          const a = parseInt(params.ayah);
          console.log('[MemorizeFlow] Auto-adding item:', s, a);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database init timed out')), 5000)
          );

          const id = await Promise.race([
            addItem(s, a),
            timeoutPromise
          ]);

          setDbItem({
            id,
            surah: s,
            ayah: a,
            status: 'learning'
          });
        }
      } catch (e) {
        console.error('[MemorizeFlow] Init failed', e);
        Alert.alert('Error', 'Failed to load memorization item: ' + e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [initialItem, params.surah, params.ayah]);

  // 3. Cleanup Audio on Unfocus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (sound) {
          sound.unloadAsync();
          setSound(null); // Clear sound reference
          setIsPlaying(false);
        }
      };
    }, [sound])
  );

  // 4. Load Audio when Item Changes
  // Determine active item safely
  let activeItem = dbItem;
  if (!activeItem && params.surah && params.ayah) {
    activeItem = {
      id: `temp_${params.surah}_${params.ayah}`,
      surah: parseInt(params.surah),
      ayah: parseInt(params.ayah)
    };
  }

  useEffect(() => {
    // Reset state when a new item is passed
    setStage(STAGE_PREP);
    setLoading(true);
    setAudioUri(null);
    setIsPlaying(false);
    setSound(null); // Clear stale sound reference
    setRecallMode(RECALL_TYPE_GAP_FILL);
    setUserInput('');
    setRecallAttempts(0);
    setShowHint(false);

    const loadAudio = async () => {
      if (!activeItem || !activeItem.surah || !activeItem.ayah) return;
      try {
        const uri = await getPlayableUrl(activeItem.surah, activeItem.ayah);
        setAudioUri(uri);
        setLoading(false);
      } catch (e) {
        console.error('Audio load failed', e);
        setLoading(false);
      }
    };

    if (activeItem) loadAudio();
  }, [activeItem?.id]);


  // --- ACTIONS ---
  const playAudio = async (loop = false) => {
    // Prevent rapid-press race conditions
    if (audioOperationInProgress.current) return;
    audioOperationInProgress.current = true;

    // Set playing state FIRST to update UI immediately
    setIsPlaying(true);

    try {
      // Unload previous sound if exists
      if (sound) {
        try {
          await sound.unloadAsync();
          setSound(null);
        } catch (e) {
          // Ignore unload errors
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, isLooping: loop }
      );
      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate(status => {
        // Only update if playback finished naturally (not by user action)
        if (status.isLoaded && status.didJustFinish && !loop) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      console.error('Play failed', e);
      setIsPlaying(false); // Reset on error
    } finally {
      audioOperationInProgress.current = false;
    }
  };

  const stopAudio = async () => {
    // Prevent rapid-press race conditions
    if (audioOperationInProgress.current) return;
    audioOperationInProgress.current = true;

    setIsPlaying(false); // Update UI immediately
    if (sound) {
      try {
        await sound.stopAsync();
      } catch (e) {
        // Ignore stop errors
      }
    }

    audioOperationInProgress.current = false;
  };

  const checkFirstWords = () => {
    const words = normalizeArabicText(ayahText).split(' ');
    const target = words.slice(0, 3).join(' ');
    const input = normalizeArabicText(userInput);
    if (input.includes(target) || recallAttempts >= 2) {
      setRecallMode(RECALL_TYPE_GAP_FILL);
      setUserInput('');
      setRecallAttempts(0);
    } else {
      Alert.alert('Try again', 'Type the first 3 words.');
      setRecallAttempts(p => p + 1);
    }
  };

  const handleGrade = async (grade) => {
    try {
      await recordAttempt(activeItem.id, grade);
      setStage(STAGE_DONE);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // --- DATA DERIVATION ---
  if (!activeItem) {
    // If truly no item, show error (but inside return to respect hooks)
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ marginTop: 20, color: theme.textSecondary }}>Loading verse...</Text>
      </View>
    );
  }

  // Safe Data Lookup
  let surahName = 'Unknown Surah';
  let ayahText = '';

  try {
    const sNum = activeItem.surah?.number || activeItem.surah;
    const surahObj = quranData.surahs.find(s => s.number === sNum);
    if (surahObj) {
      surahName = surahObj.englishName;
      // Fix for 0-indexed array vs 1-indexed ayah
      const aIndex = (activeItem.ayah?.number || activeItem.ayah) - 1;
      if (surahObj.ayahs[aIndex]) {
        ayahText = surahObj.ayahs[aIndex].text;
      }
    }
  } catch (e) { console.warn('Lookup failed', e); }

  // --- RENDERERS ---
  const renderPrep = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.title, { color: theme.text }]}>Memorize</Text>
      <Text style={[styles.subtitle, { color: theme.primary }]}>{surahName} {activeItem.surah}:{activeItem.ayah}</Text>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => isPlaying ? stopAudio() : playAudio(false)}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={theme.primary} />
        <Text style={[styles.btnText, { color: theme.primary }]}>{isPlaying ? 'Stop' : 'Preview Audio'}</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => setStage(STAGE_READ)}>
        <Text style={styles.btnTextInverse}>Start Session</Text>
      </Pressable>
    </View>
  );

  const renderRead = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.instruction, { color: theme.textSecondary }]}>Read & Listen</Text>
      <ArabicText size="xlarge" style={styles.arabicText}>{ayahText}</ArabicText>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => isPlaying ? stopAudio() : playAudio(false)}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={theme.primary} />
        <Text style={[styles.btnText, { color: theme.primary }]}>{isPlaying ? 'Stop' : 'Listen'}</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => setStage(STAGE_SHADOW)}>
        <Text style={styles.btnTextInverse}>I'm ready to practice</Text>
      </Pressable>
    </View>
  );

  const renderShadow = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.instruction, { color: theme.textSecondary }]}>Shadowing (Listen & Repeat)</Text>
      <ArabicText size="large" style={[styles.arabicText, { opacity: 0.7 }]}>{ayahText}</ArabicText>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: isPlaying ? theme.secondary : theme.surface }]} onPress={() => isPlaying ? stopAudio() : playAudio(true)}>
        <Ionicons name={isPlaying ? "stop" : "repeat"} size={24} color={theme.primary} />
        <Text style={[styles.btnText, { color: theme.primary }]}>{isPlaying ? 'Stop Looping' : 'Start Audio Loop'}</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => setStage(STAGE_RECALL)}>
        <Text style={styles.btnTextInverse}>I can recite it</Text>
      </Pressable>
    </View>
  );

  const renderRecall = () => {
    const words = ayahText.split(' ');
    const gaps = words.map((w, i) => i % 3 === 0 ? '_____' : w).join(' ');
    return (
      <View style={styles.centerContent}>
        <Text style={[styles.instruction, { color: theme.textSecondary }]}>Active Recall: Gap Fill</Text>
        <ArabicText size="large" style={styles.arabicText}>{showHint ? ayahText : gaps}</ArabicText>
        <View style={styles.spacer} />
        {!showHint ? (
          <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => setShowHint(true)}>
            <Text style={[styles.btnText, { color: theme.text }]}>Show Full Text</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => setStage(STAGE_GRADE)}>
            <Text style={styles.btnTextInverse}>Proceed to Grading</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderGrade = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.instruction, { color: theme.textSecondary }]}>Self-Assessment</Text>
      <View style={styles.spacer} />
      <View style={styles.gradeContainer}>
        <Pressable style={[styles.gradeBtn, { backgroundColor: '#D32F2F' }]} onPress={() => handleGrade(0)}>
          <Text style={styles.gradeLabel}>Again</Text>
          <Text style={styles.gradeSub}>Forgot</Text>
        </Pressable>
        <Pressable style={[styles.gradeBtn, { backgroundColor: '#FFB74D' }]} onPress={() => handleGrade(1)}>
          <Text style={styles.gradeLabel}>Hard</Text>
          <Text style={styles.gradeSub}>Hesitation</Text>
        </Pressable>
        <Pressable style={[styles.gradeBtn, { backgroundColor: theme.primary }]} onPress={() => handleGrade(2)}>
          <Text style={styles.gradeLabel}>Good</Text>
          <Text style={styles.gradeSub}>Steady</Text>
        </Pressable>
        <Pressable style={[styles.gradeBtn, { backgroundColor: '#81C784' }]} onPress={() => handleGrade(3)}>
          <Text style={styles.gradeLabel}>Easy</Text>
          <Text style={styles.gradeSub}>Perfect</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderDone = () => (
    <View style={styles.centerContent}>
      <Ionicons name="checkmark-circle" size={80} color={theme.primary} />
      <Text style={[styles.title, { color: theme.text }]}>Updated!</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={{ color: theme.textSecondary }}> {currentIndex + 1} / {queueLength}</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          {stage === STAGE_PREP && renderPrep()}
          {stage === STAGE_READ && renderRead()}
          {stage === STAGE_SHADOW && renderShadow()}
          {stage === STAGE_RECALL && renderRecall()}
          {stage === STAGE_GRADE && renderGrade()}
          {stage === STAGE_DONE && renderDone()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 18, marginBottom: 24 },
  instruction: { fontSize: 16, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  arabicText: { textAlign: 'center', lineHeight: 60, paddingHorizontal: 10 },
  spacer: { height: 24 },
  btn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, minWidth: 200, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  btnText: { fontSize: 16, fontWeight: '600' },
  btnTextInverse: { fontSize: 16, fontWeight: '600', color: 'white' },
  input: { width: '100%', borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 18, textAlign: 'right' },
  gradeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  gradeBtn: { width: '45%', height: 100, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gradeLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gradeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 }
});

export default MemorizeFlow;
