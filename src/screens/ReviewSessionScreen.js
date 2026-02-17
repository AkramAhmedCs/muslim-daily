import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ArabicText, Card } from '../components';
import { getDueReviews, processReview, getPlayableUrl } from '../services'; // Import services
import { Audio } from 'expo-av';
import quranData from '../../data/quran_full.json';

const ReviewSessionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Audio
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadQueue();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const loadQueue = async () => {
    try {
      const due = await getDueReviews();
      setQueue(due);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleGrade = async (grade) => {
    try {
      const item = queue[currentIndex];

      // Process Review
      await processReview(item.id, grade);

      // Stop audio
      if (sound) await sound.unloadAsync();
      setIsPlaying(false);

      // Initial State for next
      setShowAnswer(false);

      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Finished
        navigation.goBack();
      }
    } catch (e) {
      console.error("Grading failed", e);
      alert("Error saving progress: " + e.message);
    }
  };

  const playAudio = async () => {
    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      return;
    }

    try {
      const item = queue[currentIndex];
      const uri = await getPlayableUrl(item.surah, item.ayah);

      const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) setIsPlaying(false);
      });

    } catch (e) {
      console.error('Audio Play Error', e);
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator /></View>;

  if (queue.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>No reviews due right now!</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const currentItem = queue[currentIndex];
  // Fetch text
  const surah = quranData.surahs.find(s => s.number === currentItem.surah);
  const ayahObj = surah.ayahs.find(a => a.number === currentItem.ayah);
  const ayahText = ayahObj ? ayahObj.text : 'Loading...';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, padding: 20, paddingTop: insets.top + 20 }]}>
      {/* Header Progress */}
      <View style={styles.header}>
        <Text style={{ color: theme.textSecondary }}>{currentIndex + 1} / {queue.length}</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        <Text style={[styles.surahLabel, { color: theme.primary }]}>
          {surah.englishName} ({currentItem.surah}:{currentItem.ayah})
        </Text>

        <View style={styles.contentArea}>
          {showAnswer ? (
            <ArabicText size="xlarge" style={{ textAlign: 'center', lineHeight: 50 }}>{ayahText}</ArabicText>
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 18 }}>Tap 'Show' to reveal</Text>
          )}
        </View>

        {/* Audio Toggle */}
        <Pressable onPress={playAudio} style={[styles.audioBtn, { backgroundColor: theme.surface }]}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={theme.primary} />
          <Text style={{ marginLeft: 8, color: theme.primary }}>Listen for hint</Text>
        </Pressable>
      </View>

      {/* Controls */}
      <View style={{ marginBottom: 40 }}>
        {!showAnswer ? (
          <Pressable style={[styles.showBtn, { backgroundColor: theme.primary }]} onPress={() => setShowAnswer(true)}>
            <Text style={styles.btnText}>Show Answer</Text>
          </Pressable>
        ) : (
          <View style={styles.gradingRow}>
            <Pressable style={[styles.gradeBtn, { backgroundColor: theme.error }]} onPress={() => handleGrade('again')}>
              <Text style={styles.gradeText}>Again</Text>
              <Text style={styles.gradeSub}>&lt; 10m</Text>
            </Pressable>
            <Pressable style={[styles.gradeBtn, { backgroundColor: '#FFB000' }]} onPress={() => handleGrade('hard')}>
              <Text style={styles.gradeText}>Hard</Text>
              <Text style={styles.gradeSub}>2d</Text>
            </Pressable>
            <Pressable style={[styles.gradeBtn, { backgroundColor: theme.primary }]} onPress={() => handleGrade('good')}>
              <Text style={styles.gradeText}>Good</Text>
              <Text style={styles.gradeSub}>4d</Text>
            </Pressable>
            <Pressable style={[styles.gradeBtn, { backgroundColor: theme.success || theme.primary }]} onPress={() => handleGrade('easy')}>
              <Text style={styles.gradeText}>Easy</Text>
              <Text style={styles.gradeSub}>7d</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  surahLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 40 },
  contentArea: { minHeight: 200, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  audioBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, marginTop: 40 },

  showBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', width: '100%' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  gradingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  gradeBtn: { flex: 1, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gradeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  gradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }
});

export default ReviewSessionScreen;
