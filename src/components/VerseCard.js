import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import ArabicText from './ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { hasBasmalaPrefix, stripBasmalaPrefix } from '../utils/BismillahHelper';
import { triggerHaptic } from '../services/HapticsService';

// Helper for numerals
const toArabicNumerals = (num) => {
  if (num === undefined || num === null) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).split('').map(d => arabicNumerals[parseInt(d)] || d).join('');
};

const VerseCard = ({
  surah,
  ayah,
  ayahNumber, // 1-based index in surah
  totalAyahs,
  translation,
  showTranslation: initialShowTranslation = true,
  onToggleControls,
  isPlaying,
  isLoadingAudio,
  onPlay,
  isBookmarked,
  onBookmark,
  onTafsir,
  tafsirData,
  onAddToHifz // Added explicit prop
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(initialShowTranslation);

  // Strict Display Logic
  // Surah 1 & 9: SHOW basmalah (do not strip).
  // Others: If Ayah 1, header shows decorative, so strip from text.
  let displayText = ayah.text;

  const isSpecialSurah = surah.number === 1 || surah.number === 9;
  const showDecorativeHeader = !isSpecialSurah && ayahNumber === 1;

  if (showDecorativeHeader && hasBasmalaPrefix(displayText)) {
    displayText = stripBasmalaPrefix(displayText);
  }

  // Fallback for empty text (e.g. if Ayah 1 was ONLY Basmalah)
  if (!displayText) displayText = ayah.text;

  const handleToggle = () => {
    triggerHaptic('light', 'tap');
    onToggleControls();
  };

  const handleExpand = () => {
    triggerHaptic('selection', 'tap');
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>

        {/* Header inside Card: Surah Info + Number */}
        <View style={styles.headerRow}>
          <Text style={[styles.surahInfo, { color: theme.primary }]}>
            {surah.englishName} {toArabicNumerals(ayahNumber)}/{toArabicNumerals(totalAyahs)}
          </Text>
          {/* Actions Row */}
          <View style={styles.actionsRow}>
            <Pressable onPress={onPlay} style={styles.iconBtn} disabled={isLoadingAudio}>
              {isLoadingAudio ? (
                <ActivityIndicator size={24} color={theme.primary} />
              ) : (
                <Ionicons name={isPlaying ? "pause-circle" : "play-circle-outline"} size={28} color={theme.primary} />
              )}
            </Pressable>
            <Pressable onPress={handleToggle} style={[styles.iconBtn, { marginLeft: 8 }]}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        {/* Decorative Bismillah for Ayah 1 (Except 1 & 9) */}
        {showDecorativeHeader && (
          <View style={styles.bismillahContainer}>
            <ArabicText size="large" style={{ color: theme.text }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</ArabicText>
          </View>
        )}

        {/* Main Arabic Text */}
        <View style={styles.arabicContainer}>
          <ArabicText size="xxlarge" style={[styles.arabicText, { color: theme.text }]}>
            {displayText}
            {/* End of Ayah marker with Badge Number - using numberInSurah from DB directly */}
            <Text style={{ color: theme.primary, fontSize: 24, fontFamily: 'Amiri-Regular' }}>
              {/* U+06DD End of Ayah */}
              ۝{toArabicNumerals(ayah.numberInSurah || ayahNumber)}
            </Text>
          </ArabicText>
        </View>

        {/* Expandable Section Toggle */}
        <Pressable onPress={handleExpand} style={styles.expandBtn}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </Pressable>

        {/* Expanded Content: Translation & Tafsir */}
        {expanded && (
          <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
            <Text style={[styles.translation, { color: theme.text }]}>{translation}</Text>

            {tafsirData && (
              <View style={styles.tafsirContainer}>
                <Text style={[styles.tafsirLabel, { color: theme.primary }]}>Tafsir Snippet</Text>
                <Text style={[styles.tafsirText, { color: theme.textSecondary }]}>{tafsirData.textEn || tafsirData.textAr}</Text>
              </View>
            )}

            <View style={styles.secondaryActions}>
              <Pressable onPress={onBookmark} style={styles.actionPill}>
                <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={18} color={theme.primary} />
                <Text style={[styles.actionText, { color: theme.text }]}>Bookmark</Text>
              </Pressable>

              <Pressable onPress={onTafsir} style={styles.actionPill}>
                <Ionicons name="book-outline" size={18} color={theme.primary} />
                <Text style={[styles.actionText, { color: theme.text }]}>Tafsir</Text>
              </Pressable>

              <Pressable onPress={onAddToHifz} style={styles.actionPill}>
                <Ionicons name="school-outline" size={18} color={theme.primary} />
                <Text style={[styles.actionText, { color: theme.text }]}>Hifz</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  surahInfo: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System'
  },
  actionsRow: {
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 4,
  },
  bismillahContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  arabicContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  arabicText: {
    textAlign: 'center',
    lineHeight: 50,
  },
  expandBtn: {
    alignItems: 'center',
    padding: 8,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  translation: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  tafsirContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tafsirLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tafsirText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  }
});

export default VerseCard;
