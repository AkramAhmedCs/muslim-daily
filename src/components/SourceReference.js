import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const SourceReference = ({
  source,
  reference,
  chapter,
  hadithNumber,
  narrator,
  style
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.border }, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="book-outline" size={14} color={theme.textSecondary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.source, { color: theme.primary }]}>
          {source}
        </Text>
        {reference && (
          <Text style={[styles.reference, { color: theme.textSecondary }]}>
            {reference}
          </Text>
        )}
        {chapter && (
          <Text style={[styles.detail, { color: theme.textSecondary }]}>
            Chapter: {chapter}
          </Text>
        )}
        {hadithNumber && (
          <Text style={[styles.detail, { color: theme.textSecondary }]}>
            Hadith #{hadithNumber}
          </Text>
        )}
        {narrator && (
          <Text style={[styles.detail, { color: theme.textSecondary }]}>
            Narrator: {narrator}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  iconContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  source: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reference: {
    fontSize: 12,
    marginBottom: 2,
  },
  detail: {
    fontSize: 11,
    marginTop: 1,
  },
});

export default SourceReference;
