import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');

const AudioBottomSheet = ({
  visible,
  onClose,
  isPlaying,
  onPlayPause,
  onStop,
  reciterName = "Mishary Rashid Alafasy",
  onAnalyticsPress,
  onRelatedPress
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Transparent touch area to close */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.handle} />

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Audio Controls</Text>

        {/* Audio Main Controls */}
        <View style={styles.audioRow}>
          <View>
            <Text style={[styles.reciterName, { color: theme.text }]}>{reciterName}</Text>
            <Text style={[styles.trackInfo, { color: theme.textSecondary }]}>Verse by Verse</Text>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={onStop} style={styles.controlBtn}>
              <Ionicons name="square" size={20} color={theme.textSecondary} />
            </Pressable>
            <Pressable onPress={onPlayPause} style={[styles.playBtn, { backgroundColor: theme.primary }]}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Quick Links */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Explore</Text>

        <View style={styles.grid}>
          <Pressable style={[styles.gridItem, { backgroundColor: theme.background }]} onPress={onRelatedPress}>
            <Ionicons name="book-outline" size={24} color={theme.primary} />
            <Text style={[styles.gridLabel, { color: theme.text }]}>Hadith & Adhkar</Text>
          </Pressable>

          <Pressable style={[styles.gridItem, { backgroundColor: theme.background }]} onPress={onAnalyticsPress}>
            <Ionicons name="stats-chart-outline" size={24} color={theme.primary} />
            <Text style={[styles.gridLabel, { color: theme.text }]}>Analytics</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  audioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reciterName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackInfo: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlBtn: {
    padding: 8,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '500',
  }
});

export default AudioBottomSheet;
