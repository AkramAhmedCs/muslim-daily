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

  // Normalize Params (handle both Queue Mode and Single Verse Mode)
  const params = route.params || {};
  // The original `item` is now `initialItem` from route params, and `dbItem` will be the active item.
  const { item: initialItem, queueLength = 1, currentIndex = 0 } = params;

  // State for the actual item being memorized, potentially from DB
  const [dbItem, setDbItem] = useState(null);

  // 1. Initialize Item (Auto-Add to DB if direct navigation)
  useEffect(() => {
    const init = async () => {
      try {
        // Already have a full item?
        if (initialItem && initialItem.id && !initialItem.id.startsWith('temp')) {
          setDbItem(initialItem);
          setLoading(false);
          return;
        }

        // Direct navigation: Params but no full item
        if (params.surah && params.ayah) {
          const s = parseInt(params.surah);
          const a = parseInt(params.ayah);

          console.log('[MemorizeFlow] Auto-adding item:', s, a);

          // Add to DB or get existing ID (with timeout)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database init timed out')), 5000)
          );

          const id = await Promise.race([
            addItem(s, a),
            timeoutPromise
          ]);

          // Construct full object
          setDbItem({
            id,
            surah: s,
            ayah: a,
            status: 'learning' // Default
          });
        } else {
          // No params?
          console.error('[MemorizeFlow] Missing surah/ayah params');
        }
      } catch (e) {
        console.error('[MemorizeFlow] Init failed', e);
        Alert.alert('Error', 'Failed to load memorization item: ' + e.message);
        // Fallback: allow preview but disable grading? Or just go back?
        // For now, let's stop loading so they see the screen, but maybe grading will fail.
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [initialItem, params.surah, params.ayah]);

  console.log('[MemorizeFlow] Params:', JSON.stringify(params));

  // Fallback: If navigating from Reader, we just get { surah, ayah }
  // This block is now largely superseded by the useEffect above, but kept for clarity if `dbItem` is not yet set.
  // The `item` variable here is now `dbItem` for the rest of the component's logic.
  let activeItem = dbItem; // Use dbItem as the primary source for the active item

  if (!activeItem && params.surah && params.ayah) {
    const s = parseInt(params.surah);
    const a = parseInt(params.ayah);

    // Construct temp item if dbItem is not yet loaded but params exist
    activeItem = {
      id: `temp_${s}_${a}`,
      surah: s,
      ayah: a
    };
    console.log('[MemorizeFlow] Constructed temp item:', activeItem);
  }

  // Validate item
  if (!activeItem) {
    console.error('[MemorizeFlow] Item is null/undefined after normalization');
    // ...
  }

  if (!activeItem) {
    // Safety fallback
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.error }}>Error: No ayah selected</Text>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: theme.primary }}>Go Back</Text></Pressable>
      </View>
    );
  }

  // State
  const [stage, setStage] = useState(STAGE_PREP);
  const [loading, setLoading] = useState(true);
  const [audioUri, setAudioUri] = useState(null);

  // Audio
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);

  // Recall State
  const [recallMode, setRecallMode] = useState(RECALL_TYPE_GAP_FILL);
  const [userInput, setUserInput] = useState('');
  const [recallAttempts, setRecallAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Data
  const surah = quranData.surahs.find(s => s.number === activeItem.surah);
  // LOOKUP FIX: item.ayah is RELATIVE (1..N). Array is 0-indexed.
  // quranData ayahs have 'number' as GLOBAL ID, so we cannot use .find(number).
  // We strictly assume ayahs are sorted 1..N in the array.
  const ayahObj = surah ? surah.ayahs[activeItem.ayah - 1] : null;
  const ayahText = ayahObj ? ayahObj.text : '';

  useEffect(() => {
    // Reset state when a new item is passed
    setStage(STAGE_PREP);
    setLoading(true);
    setAudioUri(null);
    setIsPlaying(false);
    setRecallMode(RECALL_TYPE_GAP_FILL);
    setUserInput('');
    setRecallAttempts(0);
    setShowHint(false);

    loadAudio();
    // No cleanup here, we use useFocusEffect
  }, [activeItem.id]);

  useFocusEffect(
    useCallback(() => {
      // Cleanup on unfocus
      return () => {
        if (sound) {
          sound.unloadAsync();
          setIsPlaying(false);
        }
      };
    }, [sound])
  );

  const loadAudio = async () => {
    // Safety check
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

  const playAudio = async (loop = false) => {
    if (sound) await sound.unloadAsync();

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, isLooping: loop }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish && !loop) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      console.error('Play failed', e);
    }
  };

  const stopAudio = async () => {
    if (sound) await sound.stopAsync();
    setIsPlaying(false);
  };

  // --- STAGE LOGIC ---

  const renderPrep = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.title, { color: theme.text }]}>Memorize</Text>
      <Text style={[styles.subtitle, { color: theme.primary }]}>{surah.englishName} {activeItem.surah}:{activeItem.ayah}</Text>
      <View style={styles.spacer} />
      <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => playAudio(false)}>
        <Ionicons name="play" size={32} color={theme.primary} />
        <Text style={[styles.btnText, { color: theme.primary }]}>Preview Audio</Text>
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
      <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => playAudio(false)}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={theme.primary} />
        <Text style={[styles.btnText, { color: theme.primary }]}>{isPlaying ? 'Pause' : 'Listen'}</Text>
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

  const checkFirstWords = () => {
    // Simple check: first 3 words
    const words = normalizeArabicText(ayahText).split(' ');
    const target = words.slice(0, 3).join(' ');
    const input = normalizeArabicText(userInput);

    // Allow loose matching (contains)
    if (input.includes(target) || recallAttempts >= 2) {
      setRecallMode(RECALL_TYPE_GAP_FILL);
      setUserInput('');
      setRecallAttempts(0);
    } else {
      Alert.alert('Try again', 'Type the first 3 words.');
      setRecallAttempts(p => p + 1);
    }
  };

  const renderRecall = () => {
    // RECALL_TYPE_GAP_FILL logic only
    // Simple Gap Fill: Show text with blanks
    const words = ayahText.split(' ');
    const gaps = words.map((w, i) => i % 3 === 0 ? '_____' : w).join(' '); // Hide every 3rd word

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

  const handleGrade = async (grade) => {
    try {
      await recordAttempt(activeItem.id, grade);
      setStage(STAGE_DONE);
      setTimeout(() => {
        navigation.goBack(); // Return to queue
      }, 1500);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderGrade = () => (
    <View style={styles.centerContent}>
      <Text style={[styles.instruction, { color: theme.textSecondary }]}>Self-Assessment</Text>
      <View style={styles.spacer} />
      <View style={styles.gradeContainer}>
        <Pressable style={[styles.gradeBtn, { backgroundColor: theme.error }]} onPress={() => handleGrade(0)}>
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

      {loading ? <ActivityIndicator color={theme.primary} /> : (
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
